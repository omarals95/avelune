import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planReminders, type Prediction, type ReminderPrefs, type Settings } from '@cyclo/core';

export const remindersSupported = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const CHANNEL = 'reminders';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces every pending local notification with the current plan. Runs entirely on-device:
 * reminders are computed from local data and never involve the server or any push service.
 */
export async function scheduleReminders(p: Prediction, settings: Settings, prefs: ReminderPrefs): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const wantsAny = prefs.periodSoon || prefs.fertile || prefs.daily;
  if (!wantsAny || !(await Notifications.getPermissionsAsync()).granted) return;

  for (const r of planReminders(p, settings, prefs, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
  if (prefs.daily) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Cyclo', body: prefs.discreet ? 'You have a reminder.' : "Don't forget to log how you feel today." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.dailyHour, minute: prefs.dailyMinute, channelId: CHANNEL },
    });
  }
}
