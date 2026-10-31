import type { Prediction, ReminderPrefs, Settings } from '@cyclo/core';

/** Browsers cannot reliably fire scheduled notifications while the page is closed, so reminders are mobile-only. */
export const remindersSupported = false;
export async function ensurePermission(): Promise<boolean> { return false; }
export async function scheduleReminders(_p: Prediction, _s: Settings, _r: ReminderPrefs): Promise<void> { /* no-op on web */ }
