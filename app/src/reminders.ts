import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dailyReminders, planReminders, type Prediction, type ReminderPrefs, type Settings } from '@cyclo/core';

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
  const dated = planReminders(p, settings, prefs, new Date());
  const daily = dailyReminders(prefs);
  if ((!dated.length && !daily.length) || !(await Notifications.getPermissionsAsync()).granted) return;
  for (const r of dated) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
  for (const r of daily) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL },
    });
  }
}
