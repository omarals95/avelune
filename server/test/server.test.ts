import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { openDb } from '../src/db';

const day = (date: string, flow: number, updatedAt: number, deleted = false) => ({
  id: `day:${date}`, updatedAt, deleted,
  data: deleted ? null : { date, flow, symptoms: [], moods: [], tags: [] },
});

let app: ReturnType<typeof buildApp>;
beforeEach(() => { app = buildApp({ db: openDb(':memory:'), rateLimit: false }); });

async function register(email = 'a@b.co', password = 'password123') {
  const r = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password } });
  return { res: r, token: r.json().token as string };
}
const sync = (token: string, since: number, changes: unknown[]) =>
  app.inject({ method: 'POST', url: '/api/sync', headers: { authorization: `Bearer ${token}` }, payload: { since, changes } });

describe('auth', () => {
  it('registers, rejects duplicates/weak passwords, logs in', async () => {
    expect((await register()).res.statusCode).toBe(200);
    expect((await register()).res.statusCode).toBe(409);
    expect((await register('x@y.co', 'short')).res.statusCode).toBe(400);
    const ok = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'A@b.co', password: 'password123' } });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.co', password: 'nope-nope' } });
    expect(bad.statusCode).toBe(401);
  });
  it('requires a token for sync', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/sync', payload: {} })).statusCode).toBe(401);
  });
  it('can disable registration', async () => {
    const a = buildApp({ db: openDb(':memory:'), allowRegistration: false, rateLimit: false });
    const r = await a.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'a@b.co', password: 'password123' } });
    expect(r.statusCode).toBe(403);
  });
});

describe('sync', () => {
  it('round-trips between two devices with incremental cursors', async () => {
    const { token } = await register();
    const a = (await sync(token, 0, [day('2026-10-01', 3, 100), day('2026-10-02', 2, 100)])).json();
    expect(a.records).toHaveLength(2);
    const b = (await sync(token, 0, [])).json();
    expect(b.records).toHaveLength(2);
    const c = (await sync(token, b.cursor, [day('2026-10-03', 4, 200)])).json();
    expect(c.records.map((r: any) => r.id)).toEqual(['day:2026-10-03']);
    expect((await sync(token, c.cursor, [])).json().records).toEqual([]);
  });
  it('last write wins and tombstones propagate', async () => {
    const { token } = await register();
    await sync(token, 0, [day('2026-10-01', 3, 100)]);
    await sync(token, 0, [day('2026-10-01', 1, 50)]); // stale: ignored
    let all = (await sync(token, 0, [])).json();
    expect(all.records[0].data.flow).toBe(3);
    await sync(token, 0, [day('2026-10-01', 0, 300, true)]);
    all = (await sync(token, 0, [])).json();
    expect(all.records[0]).toMatchObject({ deleted: true, data: null });
  });
  it('isolates users', async () => {
    const a = await register('a@b.co');
    const b = await register('c@d.co');
    await sync(a.token, 0, [day('2026-10-01', 3, 100)]);
    expect((await sync(b.token, 0, [])).json().records).toEqual([]);
  });
  it('rejects malformed records', async () => {
    const { token } = await register();
    expect((await sync(token, 0, [{ id: '../etc', updatedAt: 1, deleted: false, data: {} }])).statusCode).toBe(400);
  });
  it('deletes the account', async () => {
    const { token } = await register();
    await sync(token, 0, [day('2026-10-01', 3, 100)]);
    expect((await app.inject({ method: 'DELETE', url: '/api/account', headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(200);
    expect((await sync(token, 0, [])).statusCode).toBe(401);
  });
});
