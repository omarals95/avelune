/** ISO calendar date, e.g. "2026-10-31". Always local-calendar, never a timestamp. */
export type DateStr = string;

/** 0 none, 1 spotting, 2 light, 3 medium, 4 heavy */
export type Flow = 0 | 1 | 2 | 3 | 4;

export interface DayLog {
  date: DateStr;
  flow: Flow;
  /** Option ids from the app's symptom catalogue. */
  symptoms: string[];
  moods: string[];
  /** Other option ids, namespaced by category: "sex:protected", "discharge:creamy", "activity:yoga", "other:stress"... */
  tags: string[];
  /** Basal body temperature in °C (converted for display). */
  bbt?: number;
  /** Body weight in kg. */
  weight?: number;
  /** Water in millilitres. */
  water?: number;
  /** Sleep in hours. */
  sleep?: number;
  /** Distance walked/run in km. */
  distance?: number;
  notes?: string;
}

/** Health conditions that change how cycles behave. "no-uterus" covers hysterectomy and endometrial ablation. */
export type Condition = 'pcos' | 'endometriosis' | 'thyroid' | 'perimenopause' | 'no-uterus';

export type Contraception =
  | 'none' | 'combined-pill' | 'mini-pill' | 'hormonal-iud' | 'copper-iud' | 'implant'
  | 'ring' | 'patch' | 'injection' | 'barrier' | 'fam';

/** Context the prediction engine uses to adjust ranges, confidence and which cycles count. */
export interface CycleProfile {
  conditions?: Condition[];
  contraception?: Contraception;
  /** When the current contraception was started or inserted. */
  contraceptionSince?: DateStr | null;
  /** Date hormonal birth control was stopped (cycles before it are withdrawal bleeds, not cycles). */
  stoppedHormonalOn?: DateStr | null;
  /** Hormone replacement therapy (perimenopause/menopause). */
  hrt?: boolean;
  /** In fertility treatment (IVF/IUI): cycles follow the clinic's plan. */
  fertilityTreatment?: boolean;
}

/** Life stage outside of ordinary cycling. Pregnancy itself is `pregnancyLmp`. */
export type LifeStage =
  | { kind: 'cycling' }
  | { kind: 'postpartum'; since: DateStr; breastfeeding?: boolean; returnedOn?: DateStr | null }
  | { kind: 'loss'; since: DateStr }
  | { kind: 'paused'; since: DateStr };

export interface PastPregnancy { lmp: DateStr; end: DateStr; outcome: 'birth' | 'loss' | 'ended' }

export interface Settings {
  cycleLength: number;
  periodLength: number;
  lutealLength: number;
  /** Show the whole fertile window; when false only the ovulation day is highlighted. */
  showFertileWindow?: boolean;
  /** Show cycle-day numbers above calendar dates. */
  showCycleDays?: boolean;
  /** Pregnancy mode: first day of last menstrual period. */
  pregnancyLmp?: DateStr | null;
  /** Daily water target in ml. */
  waterTarget?: number;
  profile?: CycleProfile;
  stage?: LifeStage;
  /** Finished pregnancies; cycles that overlap them never count toward averages. */
  pregnancies?: PastPregnancy[];
  /** Per-cycle override keyed by the cycle's period start date. */
  cycleOverrides?: Record<DateStr, 'include' | 'exclude'>;
  /** 'off' = no forecast, only "days since your last period". */
  forecastMode?: 'auto' | 'off';
  /** Expected period date whose "late" notice the user dismissed. */
  lateDismissedFor?: DateStr | null;
}

export const DEFAULT_SETTINGS: Settings = {
  cycleLength: 28, periodLength: 5, lutealLength: 14, showFertileWindow: true, showCycleDays: false, pregnancyLmp: null, waterTarget: 2250,
};

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
