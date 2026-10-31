import { addDays, diffDays, parseDate, toDateStr } from './dates';
import type { DateStr } from './types';

/** Where a value came from. `manual` = logged in Avelune, `sample` = demo data (never mixed with real sources). */
export type HealthSource = 'appleHealth' | 'healthConnect' | 'fitbit' | 'manual' | 'sample';

/**
 * One calendar day of normalised health data. Every provider (HealthKit, Health Connect — which also carries
 * Samsung Health and Fitbit data on Android — and the Fitbit Web API) maps into this shape.
 */
export interface HealthDay {
  date: DateStr;
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  /** Total sleep for the night ending on `date`, in minutes. */
  sleepMin?: number;
  /** Sleep window as minutes from local midnight of `date` (negative = previous evening). */
  sleepStart?: number;
  sleepEnd?: number;
  restingHr?: number;
  hrMin?: number;
  hrMax?: number;
  hrAvg?: number;
  weightKg?: number;
  /** Basal / skin temperature in °C. */
  temperatureC?: number;
  spo2?: number;
  waterMl?: number;
  sources?: Partial<Record<keyof Omit<HealthDay, 'date' | 'sources'>, HealthSource>>;
}

export type HealthMetric = Exclude<keyof HealthDay, 'date' | 'sources' | 'sleepStart' | 'sleepEnd'>;

/** Higher wins when two connected sources report the same metric for the same day. */
const PRIORITY: Record<HealthSource, number> = { manual: 5, appleHealth: 4, healthConnect: 3, fitbit: 2, sample: 0 };

export function mergeHealthDays(existing: Record<DateStr, HealthDay>, incoming: HealthDay[], source: HealthSource): Record<DateStr, HealthDay> {
  const out = { ...existing };
  for (const d of incoming) {
    const cur: HealthDay = { ...(out[d.date] ?? { date: d.date }), sources: { ...(out[d.date]?.sources ?? {}) } };
    for (const [k, v] of Object.entries(d) as [keyof HealthDay, unknown][]) {
      if (k === 'date' || k === 'sources' || v == null || (typeof v === 'number' && !Number.isFinite(v))) continue;
      const metric = k as keyof NonNullable<HealthDay['sources']>;
      const had = cur.sources![metric];
      if (!had || PRIORITY[source] >= PRIORITY[had]) {
        (cur as unknown as Record<string, unknown>)[k] = v;
        cur.sources![metric] = source;
      }
    }
    out[d.date] = cur;
  }
  return out;
}

/** Remove every value contributed by one source (e.g. when disconnecting it or clearing sample data). */
export function dropSource(days: Record<DateStr, HealthDay>, source: HealthSource): Record<DateStr, HealthDay> {
  const out: Record<DateStr, HealthDay> = {};
  for (const [date, d] of Object.entries(days)) {
    const next: HealthDay = { date, sources: {} };
    for (const [k, src] of Object.entries(d.sources ?? {})) {
      if (src === source) continue;
      (next as unknown as Record<string, unknown>)[k] = (d as unknown as Record<string, unknown>)[k];
      if (k === 'sleepMin') { next.sleepStart = d.sleepStart; next.sleepEnd = d.sleepEnd; }
      next.sources![k as keyof NonNullable<HealthDay['sources']>] = src;
    }
    if (Object.keys(next.sources!).length) out[date] = next;
  }
  return out;
}

export type Bucket = 'day' | 'week' | 'month';
export interface SeriesPoint { label: string; start: DateStr; value: number | null }

/** Sum-like metrics add up within a bucket; the rest are averaged. */
const SUMMED = new Set<HealthMetric>(['steps', 'distanceKm', 'activeKcal', 'waterMl']);

export function series(days: Record<DateStr, HealthDay>, metric: HealthMetric, end: DateStr, count: number, bucket: Bucket = 'day'): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const startOf = (i: number): [DateStr, DateStr] => {
    if (bucket === 'day') { const d = addDays(end, i - count + 1); return [d, d]; }
    if (bucket === 'week') { const e = addDays(end, (i - count + 1) * 7); return [addDays(e, -6), e]; }
    const ref = parseDate(end);
    const s = new Date(ref.getFullYear(), ref.getMonth() - (count - 1 - i), 1);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    return [toDateStr(s), toDateStr(e > ref ? ref : e)];
  };
  for (let i = 0; i < count; i++) {
    const [s, e] = startOf(i);
    const vals: number[] = [];
    for (let k = 0; k <= diffDays(s, e); k++) { const v = days[addDays(s, k)]?.[metric]; if (typeof v === 'number') vals.push(v); }
    const value = !vals.length ? null : SUMMED.has(metric) && bucket !== 'day' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals.reduce((a, b) => a + b, 0) / vals.length;
    const label = bucket === 'day' ? String(+s.slice(8)) : bucket === 'week' ? `${+s.slice(8)}/${+s.slice(5, 7)}` : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][+s.slice(5, 7) - 1];
    points.push({ label, start: s, value: value == null ? null : Math.round(value * 100) / 100 });
  }
  return points;
}

/** Most recent value of a metric on or before `date`, with the day it was recorded. */
export function latest(days: Record<DateStr, HealthDay>, metric: HealthMetric, date: DateStr, lookback = 30): { value: number; date: DateStr } | null {
  for (let i = 0; i < lookback; i++) {
    const d = addDays(date, -i);
    const v = days[d]?.[metric];
    if (typeof v === 'number') return { value: v, date: d };
  }
  return null;
}

export const fmtSleep = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} m`;
export const fmtThousands = (n: number) => Math.round(n).toLocaleString('en-US');

/** Deterministic, clearly-labelled sample data so widgets can be previewed before connecting a tracker. */
export function sampleHealth(end: DateStr, days = 120, seed = 7): HealthDay[] {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: HealthDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const cyc = (days - i) % 28; // gentle cycle-linked temperature and resting HR rise after ovulation
    const luteal = cyc >= 15;
    const steps = Math.round(4500 + rnd() * 7000);
    const sleepMin = Math.round(390 + rnd() * 110);
    const sleepStart = -Math.round(30 + rnd() * 90);
    out.push({
      date, steps, distanceKm: Math.round(steps * 0.00072 * 100) / 100, activeKcal: Math.round(steps * 0.045 + rnd() * 80),
      sleepMin, sleepStart, sleepEnd: sleepStart + sleepMin,
      restingHr: Math.round(58 + (luteal ? 3 : 0) + rnd() * 4), hrMin: Math.round(52 + rnd() * 5), hrMax: Math.round(118 + rnd() * 40), hrAvg: Math.round(70 + rnd() * 8),
      weightKg: Math.round((61.5 + Math.sin((days - i) / 18) * 0.8 + (luteal ? 0.4 : 0) + rnd() * 0.3) * 10) / 10,
      temperatureC: Math.round((36.3 + (luteal ? 0.32 : 0) + rnd() * 0.12) * 100) / 100,
      spo2: Math.round(96 + rnd() * 3), waterMl: Math.round((1.2 + rnd() * 1.4) * 4) * 250,
    });
  }
  return out;
}
