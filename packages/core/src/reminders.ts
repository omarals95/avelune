import { addDays } from './dates';
import { contraceptionEvents } from './contraception';
import { tr, trn } from './i18n';
import type { DateStr, Medication, Settings } from './types';
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

export type ReminderKind = 'periodSoon' | 'periodStart' | 'periodEnd' | 'ovulation' | 'fertile' | 'contraception';

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
/** DISCREET in the current language. */
const discreet = () => ({ title: APP_NAME, body: tr('You have a reminder.') });

const MAX_PLANNED = 40; // iOS caps pending local notifications at 64; leave room for the daily ones.

function at(date: DateStr, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/** Upcoming dated reminders for the next few predicted cycles. Pure; scheduling is done per platform. */
export function planReminders(p: Prediction, settings: Settings, prefs: ReminderPrefs, now: Date, cycles = 4): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  // Contraception schedule (pack, ring, patch, injection, replacement), independent of cycle predictions.
  const pr = settings.profile;
  if (pr?.contraReminders && !settings.pregnancyLmp) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = prefs.pill.on ? prefs.pill : { hour: 9, minute: 0 };
    for (const e of contraceptionEvents(pr, today, 120)) {
      out.push({ kind: 'contraception', date: e.date, at: at(e.date, time.hour, time.minute), ...(prefs.discreet ? discreet() : { title: APP_NAME, body: e.text }) });
    }
  }
  if (!p.nextPeriodStart || !p.lastPeriodStart || settings.pregnancyLmp || p.noForecast) return finish(out, now);
  const luteal = Math.min(16, Math.max(10, settings.lutealLength));
  const add = (kind: ReminderKind, pref: TimeOfDay, date: DateStr, body: string) => {
    if (!pref.on) return;
    out.push({ kind, date, at: at(date, pref.hour, pref.minute), ...(prefs.discreet ? discreet() : { title: APP_NAME, body }) });
  };
  for (let i = 0; i < cycles; i++) {
    const start = addDays(p.nextPeriodStart, i * p.stats.avgCycle);
    const n = prefs.periodSoon.daysBefore;
    // With a wide window, warn ahead of its start rather than its middle.
    const soon = i === 0 && p.nextPeriodRange && p.confidence === 'low' ? p.nextPeriodRange[0] : start;
    const around = soon !== start;
    add('periodSoon', prefs.periodSoon, addDays(soon, -n), n === 0
      ? (around ? tr('Your period may start today or so.') : tr('Your period may start today.'))
      : around ? trn(n, 'Your period may start in {n} day or so.|Your period may start in {n} days or so.') : trn(n, 'Your period may start in {n} day.|Your period may start in {n} days.'));
    add('periodStart', prefs.periodStart, start, tr('Has your period started? Tap to log it.'));
    add('periodEnd', prefs.periodEnd, addDays(start, p.stats.avgPeriod - 1), tr('Has your period ended? Log your last day.'));
    if (p.fertileHidden) continue;
    const ov = addDays(start, -luteal);
    add('ovulation', prefs.ovulation, ov, tr('Ovulation is estimated for today.'));
    add('fertile', prefs.fertile, addDays(ov, -5), tr('Your fertile window is estimated to start today.'));
  }
  return finish(out, now);
}
const finish = (out: PlannedReminder[], now: Date) => out.filter((r) => r.at.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PLANNED);

export interface DailyReminder { kind: string; hour: number; minute: number; title: string; body: string }

/** Repeating daily reminders (pill, water, temperature...). */
export function dailyReminders(prefs: ReminderPrefs, meds: Medication[] = []): DailyReminder[] {
  const out: DailyReminder[] = [];
  const add = (kind: string, p: TimeOfDay, body: string, hour = p.hour) => {
    if (p.on) out.push({ kind, hour, minute: p.minute, ...(prefs.discreet ? discreet() : { title: APP_NAME, body }) });
  };
  add('pill', prefs.pill, tr('Time for your pill.'));
  add('temperature', prefs.temperature, tr('Take your temperature before getting up.'));
  add('weight', prefs.weight, tr('Log your weight.'));
  add('sleep', prefs.sleep, tr('How did you sleep? Log it.'));
  add('dailyLog', prefs.dailyLog, tr("Don't forget to log how you feel today."));
  for (const m of meds) {
    if (!m.active || !m.reminder) continue;
    out.push({ kind: `med-${m.id}`, hour: m.reminder.hour, minute: m.reminder.minute, ...(prefs.discreet ? discreet() : { title: APP_NAME, body: m.dose ? tr('Time for {name} ({dose}).', { name: m.name, dose: m.dose }) : tr('Time for {name}.', { name: m.name }) }) });
  }
  if (prefs.water.on) {
    const step = Math.max(1, prefs.water.everyHours);
    for (let h = prefs.water.hour; h <= prefs.water.endHour; h += step) add(`water-${h}`, prefs.water, tr('Time for a glass of water.'), h);
  }
  return out;
}
