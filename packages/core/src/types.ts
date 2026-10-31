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

export interface SyncRequest {
  /** Server cursor from the previous sync (0 on first sync). */
  since: number;
  changes: SyncRecord[];
}

export interface SyncResponse {
  cursor: number;
  records: SyncRecord[];
}
