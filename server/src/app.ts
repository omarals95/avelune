import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { existsSync } from 'node:fs';
import { shouldApply, type SyncRecord } from '@cyclo/core';
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
const ID_RE = /^(day:\d{4}-\d{2}-\d{2}|settings)$/;

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
  const getRecord = db.prepare('SELECT updated_at, deleted FROM records WHERE user_id = ? AND id = ?');
  const upsert = db.prepare(`
    INSERT INTO records (user_id, id, data, updated_at, deleted) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (user_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at,
      deleted = excluded.deleted, seq = (SELECT COALESCE(MAX(seq), 0) + 1 FROM records)`);
  const changedSince = db.prepare('SELECT seq, id, data, updated_at, deleted FROM records WHERE user_id = ? AND seq > ? ORDER BY seq');
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

    authed.post('/api/sync', async (req, reply) => {
      const b = (req.body ?? {}) as { since?: unknown; changes?: unknown };
      const since = Number.isInteger(b.since) && (b.since as number) >= 0 ? (b.since as number) : 0;
      const changes = Array.isArray(b.changes) ? (b.changes as SyncRecord[]) : [];
      if (changes.length > MAX_BATCH) return reply.code(413).send({ error: 'too_many_changes' });
      for (const c of changes) {
        if (!c || typeof c.id !== 'string' || !ID_RE.test(c.id) || !Number.isFinite(c.updatedAt) || typeof c.deleted !== 'boolean') {
          return reply.code(400).send({ error: 'invalid_record' });
        }
        if (!c.deleted && (c.data === null || typeof c.data !== 'object')) return reply.code(400).send({ error: 'invalid_record' });
      }
      const uid = req.userId!;
      const run = db.transaction(() => {
        for (const c of changes) {
          const ex = getRecord.get(uid, c.id) as { updated_at: number; deleted: number } | undefined;
          if (shouldApply(ex && { updatedAt: ex.updated_at, deleted: !!ex.deleted }, c)) {
            upsert.run(uid, c.id, c.deleted ? null : JSON.stringify(c.data), Math.floor(c.updatedAt), c.deleted ? 1 : 0);
          }
        }
        return changedSince.all(uid, since) as { seq: number; id: string; data: string | null; updated_at: number; deleted: number }[];
      });
      const rows = run();
      const cursor = rows.length ? rows[rows.length - 1].seq : since;
      return {
        cursor,
        records: rows.map((r) => ({ id: r.id, data: r.data ? JSON.parse(r.data) : null, updatedAt: r.updated_at, deleted: !!r.deleted })),
      };
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
