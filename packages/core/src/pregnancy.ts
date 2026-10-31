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
