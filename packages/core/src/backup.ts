import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { hkdf } from '@noble/hashes/hkdf';
import { scryptAsync } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha256';
import { gunzipSync, gzipSync } from 'fflate';
import { DEFAULT_KDF, b64decode, b64encode, utf8Decode, utf8Encode } from './e2ee';
import type { KeyInfo, SyncRecord } from './types';

/**
 * Encrypted backup files (".avelune"), independent of any server.
 *
 *   passphrase --scrypt(salt)--> master --HKDF("avelune/backup/v1")--> key
 *   file = JSON header (format, version, kdf, salt, created) + XChaCha20-Poly1305(gzip(JSON payload))
 *
 * The header reveals only that this is an Avelune backup and when it was made.
 */
export const BACKUP_FORMAT = 'avelune-backup';

export interface BackupPayload {
  v: 1;
  createdAt: number;
  /** Every day log and the settings record, exactly as stored. */
  records: SyncRecord[];
  /** Device preferences (name, units, reminders, theme…). */
  prefs?: Record<string, unknown>;
}

export interface BackupKey { salt: string; kdf: KeyInfo['kdf']; key: string }

interface BackupFile { format: typeof BACKUP_FORMAT; v: 1; kdf: KeyInfo['kdf']; salt: string; createdAt: number; data: string }

const AAD = utf8Encode('avelune-backup/v1');

/** Derive the backup key once; it can be cached (e.g. in secure storage) so automatic backups need no prompt. */
export async function createBackupKey(passphrase: string, salt: string = b64encode(randomBytes(16)), kdf: KeyInfo['kdf'] = DEFAULT_KDF): Promise<BackupKey> {
  const master = await scryptAsync(utf8Encode(passphrase.normalize('NFKC')), b64decode(salt), { ...kdf, dkLen: 32 });
  const key = hkdf(sha256, master, undefined, utf8Encode('avelune/backup/v1'), 32);
  return { salt, kdf: { ...kdf }, key: b64encode(key) };
}

export function sealBackup(k: BackupKey, payload: BackupPayload): string {
  const nonce = randomBytes(24);
  const plain = gzipSync(utf8Encode(JSON.stringify(payload)));
  const ct = xchacha20poly1305(b64decode(k.key), nonce, AAD).encrypt(plain);
  const file: BackupFile = { format: BACKUP_FORMAT, v: 1, kdf: k.kdf, salt: k.salt, createdAt: payload.createdAt, data: `v1.${b64encode(nonce)}.${b64encode(ct)}` };
  return JSON.stringify(file);
}

export function readBackupHeader(text: string): Omit<BackupFile, 'data'> | null {
  try {
    const f = JSON.parse(text) as BackupFile;
    if (f?.format !== BACKUP_FORMAT || f.v !== 1 || typeof f.data !== 'string') return null;
    return { format: f.format, v: f.v, kdf: f.kdf, salt: f.salt, createdAt: f.createdAt };
  } catch { return null; }
}

/** Decrypt with an already-derived key (throws "wrong_passphrase" if it does not match). */
export function openBackupWithKey(text: string, k: BackupKey): BackupPayload {
  const f = JSON.parse(text) as BackupFile;
  if (f?.format !== BACKUP_FORMAT || f.v !== 1) throw new Error('not_a_backup');
  if (f.salt !== k.salt) throw new Error('wrong_passphrase');
  const [v, n, c, extra] = f.data.split('.');
  if (v !== 'v1' || !n || !c || extra !== undefined) throw new Error('not_a_backup');
  let plain: Uint8Array;
  try { plain = xchacha20poly1305(b64decode(k.key), b64decode(n), AAD).decrypt(b64decode(c)); } catch { throw new Error('wrong_passphrase'); }
  const payload = JSON.parse(utf8Decode(gunzipSync(plain))) as BackupPayload;
  if (payload?.v !== 1 || !Array.isArray(payload.records)) throw new Error('not_a_backup');
  return payload;
}

export async function openBackup(text: string, passphrase: string): Promise<BackupPayload> {
  const h = readBackupHeader(text);
  if (!h) throw new Error('not_a_backup');
  return openBackupWithKey(text, await createBackupKey(passphrase, h.salt, h.kdf));
}

/** "avelune-backup-2026-11-03-1530.avelune" */
export function backupFileName(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `avelune-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.avelune`;
}
