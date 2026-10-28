import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { ScheduledMemory } from '../utils/story';
import { parseDay } from '../utils/milestones';
import { createLatestRunner } from '../utils/serial';

export const ON_THIS_DAY_KEY = '@SignificantOther:onThisDayEnabled';

const ID_PREFIX = 'onthisday-';
const NOTIFY_HOUR = 9;

// On unless the user turned it off
export const isOnThisDayEnabled = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(ON_THIS_DAY_KEY)) !== '0';
  } catch (error) {
    console.error('Error reading on this day setting:', error);
    return true;
  }
};

export const setOnThisDayEnabled = async (on: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(ON_THIS_DAY_KEY, on ? '1' : '0');
  } catch (error) {
    console.error('Error saving on this day setting:', error);
  }
  requestOnThisDayReschedule();
};

// Only our own notifications: the check-in reminder is never touched
export const cancelOnThisDay = async (): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (error) {
    console.error('Error cancelling on this day notifications:', error);
  }
};

// One run at a time; a newer run (new data, the switch turned off, logout)
// stops an older one before it schedules anything stale
const runLatest = createLatestRunner();

// Replaces the scheduled morning notifications. Never asks for permission:
// without it (or with the setting off) nothing is scheduled.
export const scheduleOnThisDay = (items: ScheduledMemory[]): Promise<void> =>
  runLatest(async (isCurrent) => {
    await cancelOnThisDay();

    try {
      if (!isCurrent()) return;
      if (!(await isOnThisDayEnabled())) return;
      if (!(await Notifications.getPermissionsAsync()).granted) return;

      for (const item of items) {
        if (!isCurrent()) return;
        const at = parseDay(item.date);
        at.setHours(NOTIFY_HOUR, 0, 0, 0);
        if (at.getTime() <= Date.now()) continue;

        await Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}${item.date}`,
          content: {
            title: item.title,
            body: item.body,
            data: { kind: 'onThisDay', day: item.day },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
        });
      }
    } catch (error) {
      console.error('Error scheduling on this day notifications:', error);
    }
  });

// Removes everything we scheduled, e.g. on logout so the next account on this
// phone never gets the previous couple's memories
export const clearOnThisDay = (): Promise<void> => runLatest(() => cancelOnThisDay());

// Lets the notification settings ask the mounted hook to reschedule
let rescheduler: (() => void) | null = null;

export const registerOnThisDayRescheduler = (fn: () => void): (() => void) => {
  rescheduler = fn;
  return () => {
    if (rescheduler === fn) rescheduler = null;
  };
};

export const requestOnThisDayReschedule = (): void => {
  rescheduler?.();
};
