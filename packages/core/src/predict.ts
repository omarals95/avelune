import { addDays, diffDays } from './dates';
import type { DateStr, DayLog, Settings } from './types';

export interface Period {
  start: DateStr;
  end: DateStr;
  length: number;
}

/** A day counts toward a period when flow is light or heavier (spotting alone does not). */
const PERIOD_FLOW = 2;

/** Group consecutive flow days (allowing a 1-day gap) into periods. */
export function derivePeriods(logs: DayLog[]): Period[] {
  const days = logs
    .filter((l) => l.flow >= PERIOD_FLOW)
    .map((l) => l.date)
    .sort();
  const periods: Period[] = [];
  for (const d of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, d) <= 2) {
      last.end = d;
      last.length = diffDays(last.start, d) + 1;
    } else {
      periods.push({ start: d, end: d, length: 1 });
    }
  }
  return periods;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export interface CycleStats {
  cycleLengths: number[];
  avgCycle: number;
  avgPeriod: number;
  /** Std-dev of cycle length in days; 0 when not enough data. */
  variability: number;
  regularity: 'unknown' | 'regular' | 'somewhat-irregular' | 'irregular';
}

export function computeStats(periods: Period[], settings: Settings): CycleStats {
  const lengths: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const len = diffDays(periods[i - 1].start, periods[i].start);
    // Ignore implausible gaps (missed logging / pregnancy / data entry mistakes).
    if (len >= 15 && len <= 60) lengths.push(len);
  }
  const recent = lengths.slice(-6);
  const avgCycle = recent.length ? Math.round(mean(recent)) : settings.cycleLength;
  const recentPeriods = periods.slice(-6).map((p) => p.length);
  const avgPeriod = recentPeriods.length ? Math.round(mean(recentPeriods)) : settings.periodLength;
  const variability = recent.length >= 3 ? stdev(recent) : 0;
  const regularity: CycleStats['regularity'] =
    recent.length < 3 ? 'unknown' : variability <= 2 ? 'regular' : variability <= 5 ? 'somewhat-irregular' : 'irregular';
  return { cycleLengths: lengths, avgCycle: clamp(avgCycle, 15, 60), avgPeriod: clamp(avgPeriod, 1, 14), variability, regularity };
}

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface Prediction {
  stats: CycleStats;
  lastPeriodStart: DateStr | null;
  /** 1-based day of the current cycle, or null if no period has been logged. */
  cycleDay: number | null;
  phase: Phase | null;
  nextPeriodStart: DateStr | null;
  /** Range for irregular cycles (± variability, min 1 day). */
  nextPeriodRange: [DateStr, DateStr] | null;
  ovulationDate: DateStr | null;
  fertileWindow: [DateStr, DateStr] | null;
  daysUntilPeriod: number | null;
}

export function predict(logs: DayLog[], settings: Settings, now: DateStr): Prediction {
  const periods = derivePeriods(logs);
  const stats = computeStats(periods, settings);
  const last = periods.length ? periods[periods.length - 1] : null;
  if (!last) {
    return { stats, lastPeriodStart: null, cycleDay: null, phase: null, nextPeriodStart: null, nextPeriodRange: null, ovulationDate: null, fertileWindow: null, daysUntilPeriod: null };
  }
  const cycleLen = stats.avgCycle;
  // Roll forward if the predicted start is already in the past without a logged period.
  let next = addDays(last.start, cycleLen);
  let anchor = last.start;
  while (diffDays(next, now) > 0 && diffDays(anchor, now) > cycleLen * 3) {
    anchor = next;
    next = addDays(next, cycleLen);
  }
  const lutealLen = clamp(settings.lutealLength, 10, 16);
  const ovulation = addDays(next, -lutealLen);
  const fertile: [DateStr, DateStr] = [addDays(ovulation, -5), addDays(ovulation, 1)];
  const spread = Math.max(1, Math.round(stats.variability));
  const cycleDay = diffDays(last.start, now) + 1;
  let phase: Phase;
  if (cycleDay >= 1 && cycleDay <= stats.avgPeriod && diffDays(last.start, now) <= last.length + 1) phase = 'menstrual';
  else if (diffDays(fertile[0], now) < 0) phase = 'follicular';
  else if (diffDays(fertile[1], now) <= 0) phase = 'ovulation';
  else phase = 'luteal';
  return {
    stats,
    lastPeriodStart: last.start,
    cycleDay: cycleDay >= 1 ? cycleDay : null,
    phase,
    nextPeriodStart: next,
    nextPeriodRange: [addDays(next, -spread), addDays(next, spread)],
    ovulationDate: ovulation,
    fertileWindow: fertile,
    daysUntilPeriod: diffDays(now, next),
  };
}

export type DayKind = 'period' | 'predicted-period' | 'fertile' | 'ovulation' | 'none';

/** Classify a calendar day for coloring (logged data wins over predictions). */
export function classifyDay(date: DateStr, logs: Map<DateStr, DayLog>, p: Prediction, settings: Settings): DayKind {
  const k = classifyRaw(date, logs, p, settings);
  return k === 'fertile' && settings.showFertileWindow === false ? 'none' : k;
}

/** 1-based cycle day for any date at or after the first logged period (null before it). */
export function cycleDayOf(date: DateStr, logs: DayLog[]): number | null {
  const starts = derivePeriods(logs).map((p) => p.start).filter((s) => s <= date);
  return starts.length ? diffDays(starts[starts.length - 1], date) + 1 : null;
}

function classifyRaw(date: DateStr, logs: Map<DateStr, DayLog>, p: Prediction, settings: Settings): DayKind {
  const log = logs.get(date);
  if (log && log.flow >= PERIOD_FLOW) return 'period';
  if (!p.nextPeriodStart || !p.lastPeriodStart) return 'none';
  // No predictions at or before the last logged period start; logs are the source of truth there.
  if (diffDays(p.lastPeriodStart, date) <= 0) return 'none';
  const cycleLen = p.stats.avgCycle;
  const periodLen = p.stats.avgPeriod;
  const luteal = clamp(settings.lutealLength, 10, 16);
  // Project six cycles ahead so scrolling the calendar forward stays useful.
  for (let i = 0; i < 6; i++) {
    const start = addDays(p.nextPeriodStart, i * cycleLen);
    const off = diffDays(start, date);
    if (off >= 0 && off < periodLen) return 'predicted-period';
    const ov = addDays(start, -luteal);
    if (date === ov) return 'ovulation';
    if (diffDays(addDays(ov, -5), date) >= 0 && diffDays(date, addDays(ov, 1)) >= 0) return 'fertile';
  }
  return 'none';
}
