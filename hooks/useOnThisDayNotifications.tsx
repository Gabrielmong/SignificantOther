import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, Href } from 'expo-router';
import { useMilestones } from './useMilestones';
import { useGallery } from './useGallery';
import { buildStory, notificationSchedule } from '../utils/story';
import { registerOnThisDayRescheduler, scheduleOnThisDay } from '../services/onThisDay';

const DEBOUNCE_MS = 1000;

// Keeps the "On this day" morning notifications in step with the story, and
// opens the story when one is tapped. Mounted once, inside the signed-in app.
export const useOnThisDayNotifications = () => {
  const { milestones, loading: milestonesLoading } = useMilestones();
  const { photos, loading: photosLoading } = useGallery();
  const ready = !milestonesLoading && !photosLoading;

  // Latest data for reschedules triggered from outside (foreground, settings)
  const latest = useRef({ milestones, photos, ready });
  latest.current = { milestones, photos, ready };

  const reschedule = useCallback(() => {
    const { milestones: ms, photos: ps, ready: ok } = latest.current;
    if (!ok) return;
    scheduleOnThisDay(notificationSchedule(buildStory(ms, ps), new Date()));
  }, []);

  // When the story changes (debounced, so a burst of edits schedules once)
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(reschedule, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [ready, milestones, photos, reschedule]);

  // When the app comes back, and when the notification settings ask
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reschedule();
    });
    const unregister = registerOnThisDayRescheduler(reschedule);
    return () => {
      subscription.remove();
      unregister();
    };
  }, [reschedule]);

  // Show notifications that arrive while the app is open (e.g. at 09:00)
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  // Tapping a notification opens the story at that memory's day
  const handled = useRef(new Set<string>());
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      const data = response.notification.request.content.data as { kind?: string; day?: string };
      if (data?.kind !== 'onThisDay' || !data.day || handled.current.has(id)) return;
      handled.current.add(id);
      // Otherwise the same tap is returned again after the next login
      Notifications.clearLastNotificationResponse();
      router.push({ pathname: '/(tabs)/YouTwo/Story', params: { day: data.day } } as unknown as Href);
    };

    // A tap that launched the app
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch((e) => console.error('Error reading last notification:', e));

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
};
