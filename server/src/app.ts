import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { existsSync } from 'node:fs';
import type { KeyInfo, WireRecord } from '@cyclo/core';
import { hashPassword, hashToken, newToken, verifyPassword } from './auth.js';
import type { DB } from './db.js';

export interface AppOptions {
  db: DB;
  allowRegistration?: boolean;
  webRoot?: string;
  /** Disable rate limiting (tests). */
  rateLimit?: boolean;
}

const MAX_BATCH = 2000;
const ID_RE = /^[A-Za-z0-9_-]{43}$/; // base64url(HMAC-SHA256): opaque to the server
const MAX_BLOB = 64 * 1024;
const BLOB_RE = /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const isB64 = (s: unknown, max: number): s is string => typeof s === 'string' && s.length > 0 && s.length <= max && /^[A-Za-z0-9_-]+$/.test(s);

function validKeyInfo(k: unknown): k is KeyInfo {
  const o = k as KeyInfo;
  return !!o && isB64(o.salt, 64) && typeof o.check === 'string' && o.check.length < 512 && BLOB_RE.test(o.check) &&
    !!o.kdf && [o.kdf.N, o.kdf.r, o.kdf.p].every(Number.isInteger) &&
    o.kdf.N >= 2 ** 14 && o.kdf.N <= 2 ** 20 && (o.kdf.N & (o.kdf.N - 1)) === 0 && o.kdf.r >= 8 && o.kdf.r <= 16 && o.kdf.p >= 1 && o.kdf.p <= 4;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
  }
}

export function buildApp(opts: AppOptions): FastifyInstance {
  const { db } = opts;
  const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });
  app.register(cors, { origin: true });
  if (opts.rateLimit !== false) app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  const insertUser = db.prepare('INSERT INTO users (email, pw_hash, created_at) VALUES (?, ?, ?)');
  const findUser = db.prepare('SELECT id, pw_hash FROM users WHERE email = ?');
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)');
  const findSession = db.prepare('SELECT user_id FROM sessions WHERE token_hash = ?');
  const delSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const getRecord = db.prepare('SELECT updated_at FROM records WHERE user_id = ? AND id = ?');
  const upsert = db.prepare(`
    INSERT INTO records (user_id, id, blob, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, id) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at,
      seq = (SELECT COALESCE(MAX(seq), 0) + 1 FROM records)`);
  const changedSince = db.prepare('SELECT seq, id, blob, updated_at FROM records WHERE user_id = ? AND seq > ? ORDER BY seq');
  const getInfo = db.prepare('SELECT e2ee_info FROM users WHERE id = ?');
  const setInfo = db.prepare('UPDATE users SET e2ee_info = ? WHERE id = ? AND e2ee_info IS NULL');
  const delUser = db.prepare('DELETE FROM users WHERE id = ?');

  const rateOpts = opts.rateLimit === false ? {} : { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  app.get('/api/health', async () => ({ ok: true, registration: opts.allowRegistration !== false }));

  const creds = (req: FastifyRequest) => {
    const b = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    return { email, password };
  };

  app.post('/api/auth/register', rateOpts, async (req, reply) => {
    if (opts.allowRegistration === false) return reply.code(403).send({ error: 'registration_disabled' });
    const { email, password } = creds(req);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return reply.code(400).send({ error: 'invalid_email' });
    if (password.length < 8 || password.length > 256) return reply.code(400).send({ error: 'weak_password' });
    if (findUser.get(email)) return reply.code(409).send({ error: 'email_taken' });
    const info = insertUser.run(email, await hashPassword(password), Date.now());
    const token = newToken();
    insertSession.run(hashToken(token), Number(info.lastInsertRowid), Date.now());
    return { token };
  });

  app.post('/api/auth/login', rateOpts, async (req, reply) => {
    const { email, password } = creds(req);
    const u = findUser.get(email) as { id: number; pw_hash: string } | undefined;
    // Always run a hash to keep timing similar for unknown users.
    const ok = await verifyPassword(password, u?.pw_hash ?? '00:00');
    if (!u || !ok) return reply.code(401).send({ error: 'invalid_credentials' });
    const token = newToken();
    insertSession.run(hashToken(token), u.id, Date.now());
    return { token };
  });

  app.register(async (authed) => {
    authed.addHook('preHandler', async (req, reply) => {
      const h = req.headers.authorization ?? '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : '';
      const s = token ? (findSession.get(hashToken(token)) as { user_id: number } | undefined) : undefined;
      if (!s) return reply.code(401).send({ error: 'unauthorized' });
      req.userId = s.user_id;
    });

    authed.post('/api/auth/logout', async (req) => {
      delSession.run(hashToken((req.headers.authorization ?? '').slice(7)));
      return { ok: true };
    });

    /** Permanently deletes the account and every synced record. */
    authed.delete('/api/account', async (req) => {
      delUser.run(req.userId);
      return { ok: true };
    });

    /** Public key-derivation parameters (salt, KDF cost, key-check blob). Never contains a key. */
    authed.get('/api/e2ee', async (req) => {
      const row = getInfo.get(req.userId) as { e2ee_info: string | null };
      return { info: row.e2ee_info ? (JSON.parse(row.e2ee_info) as KeyInfo) : null };
    });

    authed.put('/api/e2ee', async (req, reply) => {
      const info = ((req.body ?? {}) as { info?: unknown }).info;
      if (!validKeyInfo(info)) return reply.code(400).send({ error: 'invalid_key_info' });
      // Set once: replacing it would silently orphan every record already encrypted under the old key.
      if (setInfo.run(JSON.stringify(info), req.userId).changes === 0) return reply.code(409).send({ error: 'already_set' });
      return { ok: true };
    });

    authed.post('/api/sync', async (req, reply) => {
      const uid = req.userId!;
      if (!(getInfo.get(uid) as { e2ee_info: string | null }).e2ee_info) return reply.code(428).send({ error: 'e2ee_required' });
      const b = (req.body ?? {}) as { since?: unknown; changes?: unknown };
      const since = Number.isInteger(b.since) && (b.since as number) >= 0 ? (b.since as number) : 0;
      const changes = Array.isArray(b.changes) ? (b.changes as WireRecord[]) : [];
      if (changes.length > MAX_BATCH) return reply.code(413).send({ error: 'too_many_changes' });
      for (const c of changes) {
        if (!c || !ID_RE.test(String(c.id)) || typeof c.blob !== 'string' || c.blob.length > MAX_BLOB || !BLOB_RE.test(c.blob) || !Number.isFinite(c.updatedAt)) {
          return reply.code(400).send({ error: 'invalid_record' });
        }
      }
      const run = db.transaction(() => {
        for (const c of changes) {
          const ex = getRecord.get(uid, c.id) as { updated_at: number } | undefined;
          // Last write wins on the client-supplied timestamp; the server cannot read anything else.
          if (!ex || c.updatedAt > ex.updated_at) upsert.run(uid, c.id, c.blob, Math.floor(c.updatedAt));
        }
        return changedSince.all(uid, since) as { seq: number; id: string; blob: string; updated_at: number }[];
      });
      const rows = run();
      const cursor = rows.length ? rows[rows.length - 1].seq : since;
      return { cursor, records: rows.map((r) => ({ id: r.id, blob: r.blob, updatedAt: r.updated_at })) };
    });
  });

  if (opts.webRoot && existsSync(opts.webRoot)) {
    app.register(fastifyStatic, { root: opts.webRoot });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not_found' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}
