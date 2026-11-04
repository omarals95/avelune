import { describe, expect, it } from 'vitest';
import { backupFileName, createBackupKey, openBackup, openBackupWithKey, readBackupHeader, sealBackup, type BackupPayload } from '../src';

const payload: BackupPayload = {
  v: 1, createdAt: Date.UTC(2026, 10, 3, 15, 30),
  records: [{ id: 'day:2026-11-01', data: { date: '2026-11-01', flow: 3, symptoms: ['cramps'], moods: [], tags: [], notes: 'private note' }, updatedAt: 1, deleted: false }],
  prefs: { name: 'O' },
};

describe('encrypted backups', () => {
  it('round-trips and hides the contents', async () => {
    const k = await createBackupKey('correct horse battery');
    const file = sealBackup(k, payload);
    expect(file).not.toContain('private note');
    expect(file).not.toContain('cramps');
    expect(readBackupHeader(file)?.createdAt).toBe(payload.createdAt);
    expect(await openBackup(file, 'correct horse battery')).toEqual(payload);
    expect(openBackupWithKey(file, k)).toEqual(payload);
  });
  it('rejects a wrong passphrase and non-backup files', async () => {
    const file = sealBackup(await createBackupKey('correct horse battery'), payload);
    await expect(openBackup(file, 'wrong passphrase!')).rejects.toThrow('wrong_passphrase');
    await expect(openBackup('{"hello":1}', 'x')).rejects.toThrow('not_a_backup');
  });
  it('names files by date', () => {
    expect(backupFileName(new Date(2026, 10, 3, 9, 5).getTime())).toBe('avelune-backup-2026-11-03-0905.avelune');
  });
});
