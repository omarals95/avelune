import { addDays, diffDays } from './dates';
import type { DateStr } from './types';

export interface PregnancyStatus {
  /** Completed weeks since LMP (gestational age), 0-42. */
  week: number;
  day: number;
  dueDate: DateStr;
  daysToGo: number;
  trimester: 1 | 2 | 3;
}

/** Gestational age is counted from the first day of the last menstrual period (Naegele's rule: +280 days). */
export function pregnancyStatus(lmp: DateStr, now: DateStr): PregnancyStatus {
  const days = Math.max(0, diffDays(lmp, now));
  const week = Math.min(42, Math.floor(days / 7));
  const dueDate = addDays(lmp, 280);
  return { week, day: days % 7, dueDate, daysToGo: diffDays(now, dueDate), trimester: week < 14 ? 1 : week < 28 ? 2 : 3 };
}

export const lmpFromDueDate = (due: DateStr): DateStr => addDays(due, -280);

/** Pregnancy "month" stages used for the growth illustrations (emb-01 … emb-09). */
export type PregnancyStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Completed gestational weeks (from LMP) covered by each stage, inclusive.
 * Stage 9 also covers everything after week 42 (post-term is reported separately by `daysToGo`).
 */
export const PREGNANCY_STAGE_WEEKS: Record<PregnancyStage, [number, number]> = {
  1: [0, 4], 2: [5, 8], 3: [9, 13], 4: [14, 17], 5: [18, 22], 6: [23, 27], 7: [28, 31], 8: [32, 35], 9: [36, 42],
};

/** Stage for a number of completed gestational weeks. */
export function pregnancyStage(completedWeeks: number): PregnancyStage {
  const w = Math.max(0, Math.floor(completedWeeks));
  for (const [k, [, hi]] of Object.entries(PREGNANCY_STAGE_WEEKS)) if (w <= hi) return Number(k) as PregnancyStage;
  return 9;
}

export const TRIMESTER_NAME = { 1: 'First trimester', 2: 'Second trimester', 3: 'Third trimester' } as const;

/**
 * Everything the pregnancy Today view shows, from one calculation so the image and the caption can never disagree.
 * Returns null when the dating (LMP) is missing or invalid.
 */
export interface PregnancyView extends PregnancyStatus {
  stage: PregnancyStage;
  /** "Week 12 · Month 3 · First trimester" */
  caption: string;
  /** Past the due date (still stage 9). */
  postTerm: boolean;
}

export function pregnancyView(lmp: DateStr | null | undefined, now: DateStr): PregnancyView | null {
  if (!lmp || !/^\d{4}-\d{2}-\d{2}$/.test(lmp)) return null;
  const s = pregnancyStatus(lmp, now);
  if (!Number.isFinite(s.week)) return null;
  const stage = pregnancyStage(s.week);
  return { ...s, stage, caption: `Week ${s.week} · Month ${stage} · ${TRIMESTER_NAME[s.trimester]}`, postTerm: s.daysToGo < 0 };
}
