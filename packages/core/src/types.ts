/** ISO calendar date, e.g. "2026-10-31". Always local-calendar, never a timestamp. */
export type DateStr = string;

/** 0 none, 1 spotting, 2 light, 3 medium, 4 heavy */
export type Flow = 0 | 1 | 2 | 3 | 4;

export interface DayLog {
  date: DateStr;
  flow: Flow;
  symptoms: string[];
  moods: string[];
  /** Basal body temperature in °C (converted for display). */
  bbt?: number;
  /** Cervical mucus / ovulation test / sex etc. kept as free tags. */
  tags: string[];
  notes?: string;
}

export interface Settings {
  cycleLength: number;
  periodLength: number;
  lutealLength: number;
}

export const DEFAULT_SETTINGS: Settings = { cycleLength: 28, periodLength: 5, lutealLength: 14 };

/** A syncable record. `id` is "day:YYYY-MM-DD" or "settings". */
export interface SyncRecord {
  id: string;
  /** JSON-encoded DayLog | Settings, or null when deleted. */
  data: DayLog | Settings | null;
  /** Client wall-clock ms of last edit; used for last-write-wins. */
  updatedAt: number;
  deleted: boolean;
}


/**
 * What the server sees: an opaque id, an opaque encrypted blob and an edit timestamp
 * (needed for last-write-wins). Tombstones are encrypted too.
 */
export interface WireRecord {
  id: string;
  blob: string;
  updatedAt: number;
}

export interface SyncRequest {
  since: number;
  changes: WireRecord[];
}

export interface SyncResponse {
  cursor: number;
  records: WireRecord[];
}

/** Public key-derivation parameters stored on the server so any device can derive the same key. */
export interface KeyInfo {
  salt: string;
  kdf: { N: number; r: number; p: number };
  /** Encrypted known constant used to verify a passphrase before syncing. */
  check: string;
}
