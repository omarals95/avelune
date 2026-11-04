import { addDays, diffDays } from './dates';
import type { DateStr, DayLog } from './types';

/**
 * Ovulation from body signals, combined into one estimate:
 *
 *  - Temperature (BBT): the "three over six" rule — three consecutive readings all above the highest of the
 *    previous six (at least four present), the third at least 0.2 °C above it. Ovulation is the day before the
 *    first high reading. This confirms ovulation after the fact.
 *  - LH test: the first positive test of the cycle; ovulation usually follows within about 12–36 hours (day + 1).
 *  - Cervical mucus: the "peak day", the last day of egg-white or watery mucus before it dries up.
 *
 * When signals agree (within two days) they are combined; the temperature shift confirms, LH and mucus
 * make the date more precise.
 */
export type OvSource = 'bbt' | 'lh' | 'mucus';

export interface DetectedOvulation {
  date: DateStr;
  sources: OvSource[];
  /** A temperature shift has confirmed that ovulation already happened. */
  confirmed: boolean;
  /** Highest temperature of the six days before the shift (°C), for drawing the cover line. */
  coverline?: number;
  /** First day of the temperature shift. */
  shiftStart?: DateStr;
  lhDate?: DateStr;
  peakDate?: DateStr;
}

const FERTILE_MUCUS = ['discharge:egg-white', 'discharge:watery'];

/** Three-over-six temperature shift over consecutive days (null gaps allowed in the six-day baseline). */
export function bbtShift(days: DateStr[], temp: (d: DateStr) => number | undefined): { index: number; coverline: number } | null {
  for (let i = 6; i + 2 < days.length; i++) {
    const prev = days.slice(i - 6, i).map(temp).filter((t): t is number => t != null);
    if (prev.length < 4) continue;
    const cover = Math.max(...prev);
    const next = days.slice(i, i + 3).map(temp);
    if (next.every((t) => t != null && t > cover) && (next[2] as number) >= cover + 0.2) return { index: i, coverline: cover };
  }
  return null;
}

/** Detect ovulation between `start` (period start) and `end` (inclusive), from logged signals. */
export function detectOvulation(logs: Map<DateStr, DayLog>, start: DateStr, end: DateStr): DetectedOvulation | null {
  const n = diffDays(start, end) + 1;
  if (n < 8) return null;
  const days = Array.from({ length: n }, (_, i) => addDays(start, i));
  // Signals in the first five days are period-time noise.
  const from = 5;

  const shift = bbtShift(days, (d) => logs.get(d)?.bbt);
  const bbtDate = shift && shift.index - 1 >= from ? days[shift.index - 1] : null;

  const lhDate = days.slice(from).find((d) => logs.get(d)?.tags.includes('tests:ovu-pos')) ?? null;

  let peakDate: DateStr | null = null;
  for (let i = from; i < days.length; i++) {
    const fertile = FERTILE_MUCUS.some((t) => logs.get(days[i])?.tags.includes(t));
    const nextDry = i + 1 < days.length && logs.get(days[i + 1])?.tags.some((t) => t.startsWith('discharge:') && !FERTILE_MUCUS.includes(t));
    if (fertile && nextDry) { peakDate = days[i]; break; }
  }

  const close = (a: DateStr, b: DateStr) => Math.abs(diffDays(a, b)) <= 2;
  if (bbtDate) {
    const sources: OvSource[] = ['bbt'];
    let date = bbtDate;
    // A positive LH test pins the day more precisely than the temperature rise alone.
    if (lhDate && close(addDays(lhDate, 1), bbtDate)) { sources.push('lh'); date = addDays(lhDate, 1); }
    if (peakDate && close(peakDate, date)) sources.push('mucus');
    return { date, sources, confirmed: true, coverline: shift!.coverline, shiftStart: days[shift!.index], lhDate: lhDate ?? undefined, peakDate: peakDate ?? undefined };
  }
  if (lhDate) {
    const date = addDays(lhDate, 1);
    const sources: OvSource[] = ['lh'];
    if (peakDate && close(peakDate, date)) sources.push('mucus');
    return { date, sources, confirmed: false, lhDate, peakDate: peakDate ?? undefined };
  }
  if (peakDate) return { date: peakDate, sources: ['mucus'], confirmed: false, peakDate };
  return null;
}

/** Short human description: "temperature rise and positive LH test". */
export function describeSources(s: OvSource[]): string {
  const name: Record<OvSource, string> = { bbt: 'temperature rise', lh: 'positive LH test', mucus: 'fertile cervical mucus' };
  const parts = s.map((x) => name[x]);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}
