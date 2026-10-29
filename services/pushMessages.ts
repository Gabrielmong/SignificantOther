import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import { handleChatPushMessage } from './chatNotifications';
import { mergeWidgetLastData } from './widgetTask';
import { renderAllWidgets } from '../widgets/renderWidgets';

// Data-only FCM messages, handled the same way in the foreground (onMessage,
// app/_layout.tsx) and in the background. Required from index.js: a push to a
// killed app starts a headless JS task that never renders the app, so the
// route modules (app/_layout.tsx) never load and couldn't register the
// background handler.

type PushMessage = {
  data?: { [key: string]: string | object };
};

async function handleWidgetRefreshMessage(remoteMessage: PushMessage) {
  if (remoteMessage.data?.type !== 'widget-refresh') {
    return false;
  }

  // Merge rather than overwrite, so the cached countdown survives a
  // flower/feeling push.
  const data = await mergeWidgetLastData({
    flower: String(remoteMessage.data.flower || ''),
    message: String(remoteMessage.data.message || ''),
    feeling: String(remoteMessage.data.feeling || ''),
    partnerName: String(remoteMessage.data.partnerName || ''),
  });

  await renderAllWidgets(data);

  return true;
}

// Returns whether the message was one of ours
export const handlePushMessage = async (remoteMessage: PushMessage) =>
  (await handleWidgetRefreshMessage(remoteMessage)) || (await handleChatPushMessage(remoteMessage));

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  const handled = await handlePushMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the background!', remoteMessage);
  }
});
