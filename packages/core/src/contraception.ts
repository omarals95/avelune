import { addDays, diffDays } from './dates';
import type { CycleProfile, DateStr, PillPack } from './types';

/**
 * Contraception schedules: pill packs, ring and patch cycles, injection due dates and
 * IUD/implant replacement. Pure date maths; reminders are scheduled from these events.
 */
export type ContraEventKind = 'pack-start' | 'break-start' | 'ring-out' | 'ring-in' | 'patch-change' | 'patch-free' | 'injection' | 'replace';
export interface ContraEvent { date: DateStr; kind: ContraEventKind; text: string }

const PACK: Record<PillPack, { active: number; total: number }> = {
  '21+7': { active: 21, total: 28 }, '24+4': { active: 24, total: 28 }, '28': { active: 28, total: 28 }, continuous: { active: 28, total: 28 },
};
/** Typical licensed duration in years (check your own device's leaflet). */
export const DEVICE_YEARS: Partial<Record<NonNullable<CycleProfile['contraception']>, number>> = { 'hormonal-iud': 8, 'copper-iud': 10, implant: 3 };
const addYears = (d: DateStr, y: number) => `${+d.slice(0, 4) + y}${d.slice(4)}`;

/** Upcoming events from `today` for `days` days. */
export function contraceptionEvents(p: CycleProfile, today: DateStr, days = 120): ContraEvent[] {
  const m = p.contraception ?? 'none';
  const out: ContraEvent[] = [];
  const end = addDays(today, days);
  const push = (date: DateStr, kind: ContraEventKind, text: string) => { if (date >= today && date <= end) out.push({ date, kind, text }); };
  const cyc = (start: DateStr | null | undefined, len: number, fn: (cycleStart: DateStr) => void) => {
    if (!start) return;
    const k = Math.max(0, Math.floor(diffDays(start, today) / len));
    for (let i = k; i <= k + Math.ceil(days / len) + 1; i++) fn(addDays(start, i * len));
  };
  if (m === 'combined-pill') {
    const pack = PACK[p.pillPack ?? '21+7'];
    cyc(p.packStart, pack.total, (s) => {
      push(s, 'pack-start', 'Start a new pill pack today.');
      if (pack.active < pack.total) push(addDays(s, pack.active), 'break-start', 'Your pill-free days start today.');
    });
  } else if (m === 'ring') {
    cyc(p.packStart ?? p.contraceptionSince, 28, (s) => {
      push(addDays(s, 21), 'ring-out', 'Take your ring out today.');
      push(s, 'ring-in', 'Insert a new ring today.');
    });
  } else if (m === 'patch') {
    cyc(p.packStart ?? p.contraceptionSince, 28, (s) => {
      push(s, 'patch-change', 'Apply a new patch today.');
      push(addDays(s, 7), 'patch-change', 'Change your patch today.');
      push(addDays(s, 14), 'patch-change', 'Change your patch today.');
      push(addDays(s, 21), 'patch-free', 'Your patch-free week starts today.');
    });
  } else if (m === 'injection' && p.contraceptionSince) {
    // Every 12–13 weeks; remind at 12 weeks.
    cyc(p.contraceptionSince, 91, (s) => { if (s > p.contraceptionSince!) push(addDays(s, -7), 'injection', 'Your next injection is due within about a week.'); });
  } else if (DEVICE_YEARS[m] && p.contraceptionSince) {
    const due = addYears(p.contraceptionSince, DEVICE_YEARS[m]!);
    push(addDays(due, -60), 'replace', `Your ${m === 'implant' ? 'implant' : 'IUD'} is due for replacement in about two months. Check the date with your clinic.`);
    push(due, 'replace', `Your ${m === 'implant' ? 'implant' : 'IUD'} reaches its usual replacement date today.`);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** One-line status for the current day, e.g. "Pill pack day 12 of 21". */
export function contraceptionStatus(p: CycleProfile, today: DateStr): string | null {
  const m = p.contraception ?? 'none';
  const dayIn = (start: DateStr | null | undefined, len: number) => (start && start <= today ? (diffDays(start, today) % len) + 1 : null);
  if (m === 'combined-pill') {
    const pack = PACK[p.pillPack ?? '21+7'];
    const d = dayIn(p.packStart, pack.total);
    if (!d) return null;
    return d <= pack.active ? `Pill pack day ${d} of ${pack.active}` : `Pill-free day ${d - pack.active} of ${pack.total - pack.active}`;
  }
  if (m === 'ring' || m === 'patch') {
    const d = dayIn(p.packStart ?? p.contraceptionSince, 28);
    if (!d) return null;
    if (m === 'ring') return d <= 21 ? `Ring week ${Math.ceil(d / 7)} of 3` : `Ring-free day ${d - 21} of 7`;
    return d <= 21 ? `Patch ${Math.ceil(d / 7)} of 3 (day ${((d - 1) % 7) + 1})` : `Patch-free day ${d - 21} of 7`;
  }
  if (m === 'injection' && p.contraceptionSince) {
    const next = addDays(p.contraceptionSince, Math.ceil((diffDays(p.contraceptionSince, today) + 1) / 91) * 91);
    return `Next injection around ${next}`;
  }
  if (DEVICE_YEARS[m] && p.contraceptionSince) return `Replacement due ${addYears(p.contraceptionSince, DEVICE_YEARS[m]!)}`;
  return null;
}
