import { addDays } from './dates';
import type { DateStr, Settings } from './types';
import type { Prediction } from './predict';

export interface ReminderPrefs {
  periodSoon: boolean;
  /** Days before the predicted period to notify (0 = on the day). */
  periodDaysBefore: number;
  fertile: boolean;
  /** Hour of day (0-23) for the event reminders above. */
  hour: number;
  daily: boolean;
  dailyHour: number;
  dailyMinute: number;
  /** Generic wording so a lock screen reveals nothing about health data. */
  discreet: boolean;
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  periodSoon: false, periodDaysBefore: 2, fertile: false, hour: 9, daily: false, dailyHour: 21, dailyMinute: 0, discreet: true,
};

export interface PlannedReminder {
  kind: 'period' | 'fertile';
  date: DateStr;
  hour: number;
  minute: number;
  /** Local wall-clock time. */
  at: Date;
  title: string;
  body: string;
}

const MAX_PLANNED = 40; // iOS caps pending local notifications at 64; leave room for the daily one.

function at(date: DateStr, hour: number, minute = 0): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/** Upcoming dated reminders for the next few predicted cycles. Pure; scheduling is done per platform. */
export function planReminders(p: Prediction, settings: Settings, prefs: ReminderPrefs, now: Date, cycles = 4): PlannedReminder[] {
  if (!p.nextPeriodStart || !p.lastPeriodStart) return [];
  const out: PlannedReminder[] = [];
  const luteal = Math.min(16, Math.max(10, settings.lutealLength));
  const text = (specific: string) => (prefs.discreet ? { title: 'Cyclo', body: 'You have a reminder.' } : { title: 'Cyclo', body: specific });
  for (let i = 0; i < cycles; i++) {
    const start = addDays(p.nextPeriodStart, i * p.stats.avgCycle);
    if (prefs.periodSoon) {
      const date = addDays(start, -prefs.periodDaysBefore);
      out.push({ kind: 'period', date, hour: prefs.hour, minute: 0, at: at(date, prefs.hour), ...text(prefs.periodDaysBefore === 0 ? 'Your period is expected today.' : `Your period is expected in ${prefs.periodDaysBefore} day${prefs.periodDaysBefore === 1 ? '' : 's'}.`) });
    }
    if (prefs.fertile) {
      const date = addDays(start, -luteal - 5);
      out.push({ kind: 'fertile', date, hour: prefs.hour, minute: 0, at: at(date, prefs.hour), ...text('Your fertile window is estimated to start today.') });
    }
  }
  return out.filter((r) => r.at.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PLANNED);
}
