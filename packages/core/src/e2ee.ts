import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { scryptAsync } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha256';
import type { KeyInfo, SyncRecord, WireRecord } from './types';

/**
 * End-to-end encryption for sync.
 *
 *   passphrase --scrypt(salt)--> master --HKDF--> encKey (XChaCha20-Poly1305)
 *                                         \--HKDF--> idKey  (HMAC-SHA256 for opaque record ids)
 *
 * The server only ever stores: opaque ids, random-looking blobs, edit timestamps, the public salt
 * and a key-check blob. It never receives the passphrase or any key.
 */
export interface Keys { enc: Uint8Array; id: Uint8Array; master: Uint8Array }

export const DEFAULT_KDF = { N: 2 ** 14, r: 8, p: 1 } as const;
export const MIN_PASSPHRASE = 10;

/** Own UTF-8 codec: React Native's Hermes engine has no TextDecoder. */
const te = { encode: utf8Encode };
const td = { decode: utf8Decode };
export function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (const ch of str) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}
export function utf8Decode(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; ) {
    const x = b[i++];
    let c: number;
    if (x < 0x80) c = x;
    else if (x >= 0xc0 && x < 0xe0 && i < b.length + 0) c = ((x & 31) << 6) | (b[i++] & 63);
    else if (x >= 0xe0 && x < 0xf0) { c = ((x & 15) << 12) | ((b[i] & 63) << 6) | (b[i + 1] & 63); i += 2; }
    else if (x >= 0xf0) { c = ((x & 7) << 18) | ((b[i] & 63) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63); i += 3; }
    else throw new Error('bad_utf8');
    out += String.fromCodePoint(c);
  }
  return out;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url without padding (no dependency on btoa/Buffer so it runs on Hermes too). */
export function b64encode(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < b.length) out += B64[(n >> 6) & 63];
    if (i + 2 < b.length) out += B64[n & 63];
  }
  return out;
}

export function b64decode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) throw new Error('bad_base64');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => (i + k < s.length ? B64.indexOf(s[i + k]) : 0));
    const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3];
    out[o++] = (n >> 16) & 255;
    if (i + 2 < s.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < s.length) out[o++] = n & 255;
  }
  return out;
}

function expand(master: Uint8Array): Keys {
  return {
    master,
    enc: hkdf(sha256, master, undefined, te.encode('cyclo/enc/v1'), 32),
    id: hkdf(sha256, master, undefined, te.encode('cyclo/id/v1'), 32),
  };
}

export async function deriveKeys(passphrase: string, saltB64: string, kdf: KeyInfo['kdf'] = DEFAULT_KDF): Promise<Keys> {
  const master = await scryptAsync(te.encode(passphrase.normalize('NFKC')), b64decode(saltB64), { ...kdf, dkLen: 32 });
  return expand(master);
}

export const keysFromMaster = (masterB64: string): Keys => expand(b64decode(masterB64));
export const exportMaster = (k: Keys): string => b64encode(k.master);

function seal(key: Uint8Array, plaintext: Uint8Array, aad: string): string {
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key, nonce, te.encode(aad)).encrypt(plaintext);
  return `v1.${b64encode(nonce)}.${b64encode(ct)}`;
}

function open(key: Uint8Array, blob: string, aad: string): Uint8Array {
  const [v, n, c, extra] = blob.split('.');
  if (v !== 'v1' || !n || !c || extra !== undefined) throw new Error('bad_blob');
  return xchacha20poly1305(key, b64decode(n), te.encode(aad)).decrypt(b64decode(c));
}

const CHECK_PLAINTEXT = 'cyclo-key-check';

/** Create the public parameters for a brand-new account. */
export async function createKeyInfo(passphrase: string): Promise<{ info: KeyInfo; keys: Keys }> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error('weak_passphrase');
  const salt = b64encode(randomBytes(16));
  const keys = await deriveKeys(passphrase, salt, DEFAULT_KDF);
  return { keys, info: { salt, kdf: { ...DEFAULT_KDF }, check: seal(keys.enc, te.encode(CHECK_PLAINTEXT), 'check') } };
}

/** Derive keys from an existing account's parameters; throws 'wrong_passphrase' if they do not match. */
export async function unlockKeys(passphrase: string, info: KeyInfo): Promise<Keys> {
  const keys = await deriveKeys(passphrase, info.salt, info.kdf);
  try {
    if (td.decode(open(keys.enc, info.check, 'check')) === CHECK_PLAINTEXT) return keys;
  } catch { /* fall through */ }
  throw new Error('wrong_passphrase');
}

export const wireId = (keys: Keys, logicalId: string): string => b64encode(hmac(sha256, keys.id, te.encode(logicalId)));

export function encryptRecord(keys: Keys, rec: SyncRecord): WireRecord {
  const id = wireId(keys, rec.id);
  // updatedAt is repeated inside the ciphertext so a malicious server cannot alter it undetected.
  const pt = te.encode(JSON.stringify({ id: rec.id, data: rec.data, deleted: rec.deleted, updatedAt: rec.updatedAt }));
  return { id, blob: seal(keys.enc, pt, id), updatedAt: rec.updatedAt };
}

/** Throws if the blob was tampered with, re-labelled to another id, or encrypted with another key. */
export function decryptRecord(keys: Keys, w: WireRecord): SyncRecord {
  const o = JSON.parse(td.decode(open(keys.enc, w.blob, w.id))) as SyncRecord;
  if (typeof o.id !== 'string' || wireId(keys, o.id) !== w.id || !Number.isFinite(o.updatedAt)) throw new Error('bad_record');
  return { id: o.id, data: o.data, deleted: !!o.deleted, updatedAt: o.updatedAt };
}
