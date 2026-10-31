import { addDays } from './dates';
import type { DateStr, Settings } from './types';
import type { Prediction } from './predict';

export interface TimeOfDay { on: boolean; hour: number; minute: number }

export interface ReminderPrefs {
  /** Generic wording so a lock screen reveals nothing about health data. */
  discreet: boolean;
  periodSoon: TimeOfDay & { daysBefore: number };
  periodStart: TimeOfDay;
  periodEnd: TimeOfDay;
  ovulation: TimeOfDay;
  fertile: TimeOfDay;
  pill: TimeOfDay;
  temperature: TimeOfDay;
  weight: TimeOfDay;
  sleep: TimeOfDay;
  /** Repeats every `everyHours` between `hour` and `endHour`. */
  water: TimeOfDay & { endHour: number; everyHours: number };
  dailyLog: TimeOfDay;
}

const t = (hour: number, minute = 0): TimeOfDay => ({ on: false, hour, minute });
export const DEFAULT_REMINDERS: ReminderPrefs = {
  discreet: true,
  periodSoon: { ...t(10), daysBefore: 2 },
  periodStart: t(10),
  periodEnd: t(20),
  ovulation: t(20),
  fertile: t(9),
  pill: t(21),
  temperature: t(7),
  weight: t(8),
  sleep: t(9),
  water: { ...t(9), endHour: 21, everyHours: 3 },
  dailyLog: t(21),
};

/** Merge persisted prefs (possibly from an older version) over the defaults. */
export function normalizeReminders(r: unknown): ReminderPrefs {
  const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_REMINDERS } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_REMINDERS)) {
    const d = (DEFAULT_REMINDERS as unknown as Record<string, unknown>)[k];
    const v = o[k];
    if (typeof d === 'object' && v && typeof v === 'object') out[k] = { ...d, ...v };
    else if (typeof d === typeof v) out[k] = v;
  }
  return out as unknown as ReminderPrefs;
}

export type ReminderKind = 'periodSoon' | 'periodStart' | 'periodEnd' | 'ovulation' | 'fertile';

export interface PlannedReminder {
  kind: ReminderKind;
  date: DateStr;
  /** Local wall-clock time. */
  at: Date;
  title: string;
  body: string;
}

export const APP_NAME = 'Avelune';
export const DISCREET = { title: APP_NAME, body: 'You have a reminder.' };

const MAX_PLANNED = 40; // iOS caps pending local notifications at 64; leave room for the daily ones.

function at(date: DateStr, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/** Upcoming dated reminders for the next few predicted cycles. Pure; scheduling is done per platform. */
export function planReminders(p: Prediction, settings: Settings, prefs: ReminderPrefs, now: Date, cycles = 4): PlannedReminder[] {
  if (!p.nextPeriodStart || !p.lastPeriodStart || settings.pregnancyLmp) return [];
  const out: PlannedReminder[] = [];
  const luteal = Math.min(16, Math.max(10, settings.lutealLength));
  const add = (kind: ReminderKind, pref: TimeOfDay, date: DateStr, body: string) => {
    if (!pref.on) return;
    out.push({ kind, date, at: at(date, pref.hour, pref.minute), ...(prefs.discreet ? DISCREET : { title: APP_NAME, body }) });
  };
  for (let i = 0; i < cycles; i++) {
    const start = addDays(p.nextPeriodStart, i * p.stats.avgCycle);
    const n = prefs.periodSoon.daysBefore;
    add('periodSoon', prefs.periodSoon, addDays(start, -n), n === 0 ? 'Your period is expected today.' : `Your period is expected in ${n} day${n === 1 ? '' : 's'}.`);
    add('periodStart', prefs.periodStart, start, 'Has your period started? Tap to log it.');
    add('periodEnd', prefs.periodEnd, addDays(start, p.stats.avgPeriod - 1), 'Has your period ended? Log your last day.');
    const ov = addDays(start, -luteal);
    add('ovulation', prefs.ovulation, ov, 'Ovulation is estimated for today.');
    add('fertile', prefs.fertile, addDays(ov, -5), 'Your fertile window is estimated to start today.');
  }
  return out.filter((r) => r.at.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PLANNED);
}

export interface DailyReminder { kind: string; hour: number; minute: number; title: string; body: string }

/** Repeating daily reminders (pill, water, temperature...). */
export function dailyReminders(prefs: ReminderPrefs): DailyReminder[] {
  const out: DailyReminder[] = [];
  const add = (kind: string, p: TimeOfDay, body: string, hour = p.hour) => {
    if (p.on) out.push({ kind, hour, minute: p.minute, ...(prefs.discreet ? DISCREET : { title: APP_NAME, body }) });
  };
  add('pill', prefs.pill, 'Time for your pill.');
  add('temperature', prefs.temperature, 'Take your temperature before getting up.');
  add('weight', prefs.weight, 'Log your weight.');
  add('sleep', prefs.sleep, 'How did you sleep? Log it.');
  add('dailyLog', prefs.dailyLog, "Don't forget to log how you feel today.");
  if (prefs.water.on) {
    const step = Math.max(1, prefs.water.everyHours);
    for (let h = prefs.water.hour; h <= prefs.water.endHour; h += step) add(`water-${h}`, prefs.water, 'Time for a glass of water.', h);
  }
  return out;
}
