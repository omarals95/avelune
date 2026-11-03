import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { backupFileName, createBackupKey, openBackup, openBackupWithKey, readBackupHeader, sealBackup, type BackupKey, type BackupPayload } from '@cyclo/core';
import { secure } from './secure';
import { useStore } from './store';

/**
 * Automatic encrypted backups for people who don't run a sync server.
 *
 * - Android: files go to a folder the user picks (Downloads, an SD card, or a cloud-synced folder) through the
 *   system folder picker, so they survive uninstalling the app or moving to a new phone.
 * - iOS: files go to Avelune's Documents/Backups folder, visible in the Files app ("On My iPhone › Avelune")
 *   and included in iCloud/iTunes device backups.
 * - Web: a download on demand (browsers cannot write files in the background).
 *
 * The passphrase never leaves the device: only the derived key is cached in secure storage so
 * scheduled backups need no prompt.
 */
const KEY_ID = 'avelune.backup.key';
const SAF = FileSystem.StorageAccessFramework;
export const MIN_BACKUP_PASSPHRASE = 8;
export const backupCaps = {
  auto: Platform.OS !== 'web',
  pickFolder: Platform.OS === 'android',
};
const IOS_DIR = `${FileSystem.documentDirectory ?? ''}Backups/`;

export async function loadBackupKey(): Promise<BackupKey | null> {
  const raw = await secure.get(KEY_ID);
  try { return raw ? (JSON.parse(raw) as BackupKey) : null; } catch { return null; }
}

/** Derive and remember the backup key (a new random salt each time the passphrase changes). */
export async function setBackupPassphrase(passphrase: string) {
  if (passphrase.length < MIN_BACKUP_PASSPHRASE) throw new Error('short_passphrase');
  const key = await createBackupKey(passphrase);
  await secure.set(KEY_ID, JSON.stringify(key));
}

export async function forgetBackupKey() { await secure.del(KEY_ID); }

/** Android: ask for a folder. Returns null if the user cancels. */
export async function chooseBackupFolder(): Promise<{ uri: string; label: string } | null> {
  if (Platform.OS !== 'android') return null;
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) return null;
  const decoded = decodeURIComponent(perm.directoryUri);
  const label = decoded.split(/tree\//).pop()?.replace(/^primary:/, 'Phone storage/') ?? 'Chosen folder';
  return { uri: perm.directoryUri, label };
}

function payload(): BackupPayload {
  const s = useStore.getState();
  return { v: 1, createdAt: Date.now(), records: Object.values(s.records), prefs: s.backupPrefs() };
}
const dayCount = (p: BackupPayload) => p.records.filter((r) => r.id.startsWith('day:') && !r.deleted).length;

/** Write one encrypted backup now. Returns the file location. */
export async function backupNow(): Promise<{ file: string; days: number }> {
  const key = await loadBackupKey();
  if (!key) throw new Error('no_key');
  const p = payload();
  const text = sealBackup(key, p);
  const name = backupFileName(p.createdAt);
  const { backup, setBackup } = useStore.getState();
  let file: string;
  try {
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      file = name;
    } else if (Platform.OS === 'android') {
      if (!backup.dirUri) throw new Error('no_folder');
      file = await SAF.createFileAsync(backup.dirUri, name, 'application/octet-stream');
      await FileSystem.writeAsStringAsync(file, text);
      await prune(backup.keep);
    } else {
      await FileSystem.makeDirectoryAsync(IOS_DIR, { intermediates: true }).catch(() => undefined);
      file = IOS_DIR + name;
      await FileSystem.writeAsStringAsync(file, text);
      await prune(backup.keep);
    }
  } catch (e) {
    setBackup({ lastError: (e as Error).message });
    throw e;
  }
  const days = dayCount(p);
  setBackup({ lastAt: p.createdAt, lastFile: file, lastDays: days, lastError: null });
  return { file, days };
}

/** Keep the newest `keep` backup files and delete older ones (only files Avelune named). */
async function prune(keep: number) {
  const { backup } = useStore.getState();
  try {
    const list = Platform.OS === 'android' && backup.dirUri ? await SAF.readDirectoryAsync(backup.dirUri) : (await FileSystem.readDirectoryAsync(IOS_DIR)).map((n) => IOS_DIR + n);
    const ours = list.filter((u) => /avelune-backup-\d{4}-\d{2}-\d{2}-\d{4}/.test(decodeURIComponent(u)))
      .sort((a, b) => (decodeURIComponent(a) < decodeURIComponent(b) ? 1 : -1));
    for (const u of ours.slice(Math.max(1, keep))) await FileSystem.deleteAsync(u, { idempotent: true });
  } catch { /* best effort */ }
}

/** Decrypt the newest backup with the saved key and confirm it holds today's data. */
export async function verifyLatestBackup(): Promise<number> {
  const { backup, setBackup } = useStore.getState();
  const key = await loadBackupKey();
  if (!key || !backup.lastFile || Platform.OS === 'web') throw new Error('nothing_to_verify');
  const text = await FileSystem.readAsStringAsync(backup.lastFile);
  const p = openBackupWithKey(text, key);
  const days = dayCount(p);
  setBackup({ verifiedAt: Date.now() });
  return days;
}

/** Back up automatically once a day when something changed. Called on start-up and after edits. */
export async function maybeAutoBackup() {
  const s = useStore.getState();
  const b = s.backup;
  if (!b.enabled || !backupCaps.auto || (Platform.OS === 'android' && !b.dirUri)) return;
  const DAY = 24 * 3600 * 1000;
  if (b.lastAt && Date.now() - b.lastAt < DAY) return;
  const changed = !b.lastAt || Object.values(s.records).some((r) => r.updatedAt > b.lastAt!);
  if (!changed) return;
  if (!(await loadBackupKey())) return;
  await backupNow().catch(() => undefined);
}

/** Read a picked backup file and decrypt it with the passphrase. */
export async function readBackup(text: string, passphrase: string) {
  if (!readBackupHeader(text)) throw new Error('not_a_backup');
  return openBackup(text, passphrase);
}

export const BACKUP_ERRORS: Record<string, string> = {
  no_key: 'Set a backup passphrase first.',
  no_folder: 'Choose a folder for your backups first.',
  short_passphrase: `Use at least ${MIN_BACKUP_PASSPHRASE} characters.`,
  wrong_passphrase: 'That passphrase does not open this backup.',
  not_a_backup: 'That file is not an Avelune backup.',
  nothing_to_verify: 'There is no backup on this device to check yet.',
  mismatch: 'The two passphrases do not match.',
};
export const backupError = (e: unknown) => BACKUP_ERRORS[(e as Error)?.message] ?? `Something went wrong (${(e as Error)?.message ?? e}).`;
