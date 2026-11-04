import { describe, expect, it } from 'vitest';
import { utf8Decode, utf8Encode, b64decode, b64encode, createKeyInfo, decryptRecord, encryptRecord, exportMaster, keysFromMaster, unlockKeys } from '../src';
import type { SyncRecord } from '../src';

const rec: SyncRecord = {
  id: 'day:2026-10-01', updatedAt: 1700000000000, deleted: false,
  data: { date: '2026-10-01', flow: 3, symptoms: ['Cramps'], moods: [], tags: [], notes: 'secret note 🌸 دورة' },
};

describe('base64url', () => {
  it('round-trips every length', () => {
    for (let n = 0; n < 40; n++) {
      const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
      expect(Array.from(b64decode(b64encode(b)))).toEqual(Array.from(b));
    }
    expect(() => b64decode('a$b')).toThrow();
  });
});

describe('utf8', () => {
  it('matches TextEncoder/TextDecoder, including emoji and non-latin text', () => {
    for (const s of ['', 'abc', 'é ü ñ', 'دورة 🌸 周期', 'a\u{10FFFF}z']) {
      expect(Array.from(utf8Encode(s))).toEqual(Array.from(new TextEncoder().encode(s)));
      expect(utf8Decode(new TextEncoder().encode(s))).toBe(s);
    }
  });
});

describe('e2ee', () => {
  it('encrypts without leaking plaintext or the logical id', async () => {
    const { keys } = await createKeyInfo('correct horse battery');
    const w = encryptRecord(keys, rec);
    expect(w.blob).not.toContain('secret');
    expect(w.blob).not.toContain('Cramps');
    expect(w.id).not.toContain('2026');
    expect(w.updatedAt).toBe(rec.updatedAt);
    expect(decryptRecord(keys, w)).toEqual(rec);
    // fresh nonce every time
    expect(encryptRecord(keys, rec).blob).not.toBe(w.blob);
  });

  it('a second device derives the same keys from the public key info', async () => {
    const { info, keys } = await createKeyInfo('correct horse battery');
    const k2 = await unlockKeys('correct horse battery', info);
    expect(decryptRecord(k2, encryptRecord(keys, rec))).toEqual(rec);
    expect(exportMaster(keysFromMaster(exportMaster(k2)))).toBe(exportMaster(keys));
  });

  it('rejects the wrong passphrase and short passphrases', async () => {
    const { info } = await createKeyInfo('correct horse battery');
    await expect(unlockKeys('wrong passphrase!', info)).rejects.toThrow('wrong_passphrase');
    await expect(createKeyInfo('short')).rejects.toThrow('weak_passphrase');
  });

  it('detects tampering and server-side relabelling', async () => {
    const { keys } = await createKeyInfo('correct horse battery');
    const w = encryptRecord(keys, rec);
    const flipped = { ...w, blob: w.blob.slice(0, -2) + (w.blob.endsWith('AA') ? 'BB' : 'AA') };
    expect(() => decryptRecord(keys, flipped)).toThrow();
    const other = encryptRecord(keys, { ...rec, id: 'day:2026-10-02' });
    expect(() => decryptRecord(keys, { ...w, id: other.id })).toThrow(); // blob bound to its id
    const { keys: foreign } = await createKeyInfo('another long passphrase');
    expect(() => decryptRecord(foreign, w)).toThrow();
  });

  it('encrypts tombstones too', async () => {
    const { keys } = await createKeyInfo('correct horse battery');
    const t: SyncRecord = { id: 'day:2026-10-01', data: null, deleted: true, updatedAt: 5 };
    expect(decryptRecord(keys, encryptRecord(keys, t))).toEqual(t);
  });
});
