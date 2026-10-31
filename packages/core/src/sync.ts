import type { SyncRecord } from './types';

/**
 * Last-write-wins merge. Ties go to the incoming record only when it is a deletion
 * so tombstones are never resurrected by an equal-timestamp edit.
 */
export function shouldApply(existing: Pick<SyncRecord, 'updatedAt' | 'deleted'> | undefined, incoming: Pick<SyncRecord, 'updatedAt' | 'deleted'>): boolean {
  if (!existing) return true;
  if (incoming.updatedAt > existing.updatedAt) return true;
  if (incoming.updatedAt === existing.updatedAt) return incoming.deleted && !existing.deleted;
  return false;
}

export const dayId = (date: string) => `day:${date}`;
export const SETTINGS_ID = 'settings';

export function mergeRecords(local: Map<string, SyncRecord>, incoming: SyncRecord[]): Map<string, SyncRecord> {
  const out = new Map(local);
  for (const r of incoming) if (shouldApply(out.get(r.id), r)) out.set(r.id, r);
  return out;
}
