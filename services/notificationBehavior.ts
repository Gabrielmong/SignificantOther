import * as Notifications from 'expo-notifications';

// How a notification behaves when it arrives while the app is open. Shared by
// every setNotificationHandler call, since the last one set wins app-wide.
// Chat messages make a sound, which on Android is what gives a heads-up
// banner; reminders like On This Day stay quiet in the tray.
export const appNotificationBehavior = async (
  notification: Notifications.Notification,
): Promise<Notifications.NotificationBehavior> => {
  const isChatMessage = notification.request.content.data?.type === 'chat-message';

  return {
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: isChatMessage,
    shouldSetBadge: false,
  };
};
