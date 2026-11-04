import { beforeEach, describe, expect, it } from 'vitest';
import { createKeyInfo, decryptRecord, encryptRecord, unlockKeys, type Keys, type KeyInfo, type SyncRecord } from '@avelune/core';
import { buildApp } from '../src/app';
import { openDb } from '../src/db';

const rec = (date: string, flow: number, updatedAt: number, deleted = false): SyncRecord => ({
  id: `day:${date}`, updatedAt, deleted,
  data: deleted ? null : { date, flow: flow as 0, symptoms: [], moods: [], tags: [] },
});

let app: ReturnType<typeof buildApp>;
let db: ReturnType<typeof openDb>;
beforeEach(() => { db = openDb(':memory:'); app = buildApp({ db, rateLimit: false }); });

const auth = (token: string) => ({ authorization: `Bearer ${token}` });
async function register(email = 'a@b.co', password = 'password123') {
  const r = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password } });
  return { res: r, token: r.json().token as string };
}
/** Register and set up E2EE like a real client would. */
async function account(email = 'a@b.co', pass = 'correct horse battery') {
  const { token } = await register(email);
  const { info, keys } = await createKeyInfo(pass);
  await app.inject({ method: 'PUT', url: '/api/e2ee', headers: auth(token), payload: { info } });
  return { token, keys, info };
}
const sync = (token: string, since: number, changes: unknown[]) =>
  app.inject({ method: 'POST', url: '/api/sync', headers: auth(token), payload: { since, changes } });
const enc = (k: Keys, r: SyncRecord) => encryptRecord(k, r);

describe('auth', () => {
  it('registers, rejects duplicates/weak passwords, logs in', async () => {
    expect((await register()).res.statusCode).toBe(200);
    expect((await register()).res.statusCode).toBe(409);
    expect((await register('x@y.co', 'short')).res.statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'A@b.co', password: 'password123' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.co', password: 'nope-nope' } })).statusCode).toBe(401);
  });
  it('requires a token for sync', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/sync', payload: {} })).statusCode).toBe(401);
  });
  it('can disable registration', async () => {
    const a = buildApp({ db: openDb(':memory:'), allowRegistration: false, rateLimit: false });
    expect((await a.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'a@b.co', password: 'password123' } })).statusCode).toBe(403);
  });
});

describe('e2ee key info', () => {
  it('is empty until set, set only once, and lets a second device unlock', async () => {
    const { token } = await register();
    expect((await app.inject({ method: 'GET', url: '/api/e2ee', headers: auth(token) })).json().info).toBeNull();
    const { info } = await createKeyInfo('correct horse battery');
    expect((await app.inject({ method: 'PUT', url: '/api/e2ee', headers: auth(token), payload: { info } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/api/e2ee', headers: auth(token), payload: { info } })).statusCode).toBe(409);
    const got = (await app.inject({ method: 'GET', url: '/api/e2ee', headers: auth(token) })).json().info as KeyInfo;
    await expect(unlockKeys('correct horse battery', got)).resolves.toBeTruthy();
    await expect(unlockKeys('not the passphrase', got)).rejects.toThrow('wrong_passphrase');
  });
  it('rejects malformed or weak KDF parameters', async () => {
    const { token } = await register();
    const { info } = await createKeyInfo('correct horse battery');
    const bad = { ...info, kdf: { N: 2, r: 8, p: 1 } };
    expect((await app.inject({ method: 'PUT', url: '/api/e2ee', headers: auth(token), payload: { info: bad } })).statusCode).toBe(400);
  });
  it('refuses to sync before E2EE is set up', async () => {
    const { token } = await register();
    expect((await sync(token, 0, [])).statusCode).toBe(428);
  });
});

describe('sync (ciphertext only)', () => {
  it('round-trips between two devices with incremental cursors', async () => {
    const { token, keys, info } = await account();
    const a = (await sync(token, 0, [enc(keys, rec('2026-10-01', 3, 100)), enc(keys, rec('2026-10-02', 2, 100))])).json();
    expect(a.records).toHaveLength(2);
    const k2 = await unlockKeys('correct horse battery', info); // "second device"
    const b = (await sync(token, 0, [])).json();
    expect(b.records.map((r: any) => decryptRecord(k2, r).id).sort()).toEqual(['day:2026-10-01', 'day:2026-10-02']);
    const c = (await sync(token, b.cursor, [enc(keys, rec('2026-10-03', 4, 200))])).json();
    expect(c.records).toHaveLength(1);
    expect((await sync(token, c.cursor, [])).json().records).toEqual([]);
  });

  it('stores nothing readable: no plaintext, no dates, no logical ids in the database', async () => {
    const { token, keys } = await account();
    const r = rec('2026-10-01', 3, 100);
    (r.data as any).notes = 'very private note';
    await sync(token, 0, [enc(keys, r)]);
    const dump = JSON.stringify(db.prepare('SELECT * FROM records').all());
    for (const needle of ['very private note', '2026-10-01', 'day:', 'flow', 'symptoms']) expect(dump).not.toContain(needle);
  });

  it('last write wins by timestamp, tombstones propagate (encrypted)', async () => {
    const { token, keys } = await account();
    await sync(token, 0, [enc(keys, rec('2026-10-01', 3, 100))]);
    await sync(token, 0, [enc(keys, rec('2026-10-01', 1, 50))]); // stale: ignored
    let all = (await sync(token, 0, [])).json();
    expect((decryptRecord(keys, all.records[0]).data as any).flow).toBe(3);
    await sync(token, 0, [enc(keys, rec('2026-10-01', 0, 300, true))]);
    all = (await sync(token, 0, [])).json();
    expect(decryptRecord(keys, all.records[0])).toMatchObject({ deleted: true, data: null });
  });

  it('rejects plaintext / malformed records', async () => {
    const { token } = await account();
    for (const bad of [
      { id: 'day:2026-10-01', updatedAt: 1, deleted: false, data: { flow: 3 } },
      { id: 'x'.repeat(43), blob: 'not-a-blob', updatedAt: 1 },
      { id: '../etc', blob: 'v1.aa.bb', updatedAt: 1 },
    ]) expect((await sync(token, 0, [bad])).statusCode).toBe(400);
  });

  it('isolates users', async () => {
    const a = await account('a@b.co');
    const b = await account('c@d.co', 'another long passphrase');
    await sync(a.token, 0, [enc(a.keys, rec('2026-10-01', 3, 100))]);
    expect((await sync(b.token, 0, [])).json().records).toEqual([]);
  });

  it('deletes the account and all its records', async () => {
    const { token, keys } = await account();
    await sync(token, 0, [enc(keys, rec('2026-10-01', 3, 100))]);
    expect((await app.inject({ method: 'DELETE', url: '/api/account', headers: auth(token) })).statusCode).toBe(200);
    expect((await sync(token, 0, [])).statusCode).toBe(401);
    expect(db.prepare('SELECT COUNT(*) c FROM records').get()).toEqual({ c: 0 });
  });
});

import { buildSnapshot, newShareKey, openSnapshot, sealSnapshot, DEFAULT_SETTINGS } from '@avelune/core';
describe('partner shares', () => {
  const snap = () => buildSnapshot([{ date: '2026-10-01', flow: 3, symptoms: [], moods: [], tags: [] }], DEFAULT_SETTINGS, '2026-10-10');
  it('owner publishes, partner reads without an account, only the owner can overwrite or revoke', async () => {
    const owner = await account('a@b.co');
    const other = await account('c@d.co', 'another long passphrase');
    const k = newShareKey();
    const blob = sealSnapshot(k, snap());
    expect((await app.inject({ method: 'PUT', url: `/api/shares/${k.id}`, headers: auth(owner.token), payload: { blob } })).statusCode).toBe(200);
    const got = await app.inject({ method: 'GET', url: `/api/shares/${k.id}` });
    expect(got.statusCode).toBe(200);
    expect(openSnapshot(k, got.json().blob).cycleDay).toBe(10);
    expect((await app.inject({ method: 'PUT', url: `/api/shares/${k.id}`, headers: auth(other.token), payload: { blob } })).statusCode).toBe(403);
    await app.inject({ method: 'DELETE', url: `/api/shares/${k.id}`, headers: auth(other.token) });
    expect((await app.inject({ method: 'GET', url: `/api/shares/${k.id}` })).statusCode).toBe(200); // not revoked by a stranger
    await app.inject({ method: 'DELETE', url: `/api/shares/${k.id}`, headers: auth(owner.token) });
    expect((await app.inject({ method: 'GET', url: `/api/shares/${k.id}` })).statusCode).toBe(404);
  });
  it('rejects bad ids / plaintext and requires auth to write', async () => {
    const { token } = await account();
    const k = newShareKey();
    expect((await app.inject({ method: 'PUT', url: `/api/shares/${k.id}`, payload: { blob: 'v1.a.b' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PUT', url: `/api/shares/${k.id}`, headers: auth(token), payload: { blob: '{"cycleDay":3}' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/shares/short' })).statusCode).toBe(404);
  });
  it('deleting the account removes its shares', async () => {
    const { token } = await account();
    const k = newShareKey();
    await app.inject({ method: 'PUT', url: `/api/shares/${k.id}`, headers: auth(token), payload: { blob: sealSnapshot(k, snap()) } });
    await app.inject({ method: 'DELETE', url: '/api/account', headers: auth(token) });
    expect((await app.inject({ method: 'GET', url: `/api/shares/${k.id}` })).statusCode).toBe(404);
  });
});
