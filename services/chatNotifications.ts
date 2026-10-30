import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, push, ref, serverTimestamp, set } from '@react-native-firebase/database';
import * as Notifications from 'expo-notifications';
import { Href, router, useSegments } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isChatOnScreen } from './chatPresence';
import { ensureFirebaseApp, ensureSignedIn } from './firebaseApp';

// Chat pushes arrive as data-only FCM messages and are drawn here, because a
// notification Android draws from the FCM payload can't have an inline Reply.
// Required from index.js, so the reply task below is defined in headless
// launches too (a reply to a notification of a killed app).

const CHANNEL_ID = 'chat';
const CATEGORY_ID = 'chat-message';
const REPLY_ACTION_ID = 'reply';
const REPLY_TASK_NAME = 'chat-notification-reply';
const HANDLED_REPLIES_KEY = '@chat_notification_handled_replies';
const REPLY_TIMEOUT_MS = 20000;

export interface ChatMessagePushData {
  roomId: string;
  senderName?: string;
  body?: string;
}

// One per room, so a new message replaces the previous one instead of stacking
const notificationId = (roomId: string) => `chat-${roomId}`;

let setupPromise: Promise<void> | null = null;

// Channel and category are stored by the OS; creating them again is a no-op
// update, but once per JS context is enough.
export const setupChatNotifications = () => {
  if (!setupPromise) {
    setupPromise = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Chat',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
        });
      }
      await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
        {
          identifier: REPLY_ACTION_ID,
          buttonTitle: 'Reply',
          textInput: { submitButtonTitle: 'Send', placeholder: 'Message' },
          options: { opensAppToForeground: false },
        },
      ]);
    })().catch((error) => {
      setupPromise = null; // Let the next notification try again
      console.error('Error setting up chat notifications:', error);
    });
  }
  return setupPromise;
};

const presentChatNotification = async (
  roomId: string,
  content: { title: string; body: string },
) => {
  await setupChatNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(roomId),
    content: {
      ...content,
      data: { type: 'chat-message', roomId },
      categoryIdentifier: CATEGORY_ID,
    },
    // A channel-only trigger means "now" on Android; iOS has no channels
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
};

export const showChatMessageNotification = async ({
  roomId,
  senderName,
  body,
}: ChatMessagePushData) => {
  if (!roomId) return;
  // Already reading it
  if (isChatOnScreen()) return;

  await presentChatNotification(roomId, {
    title: senderName || 'New message',
    body: body || 'Sent a message',
  });
};

// Handles an FCM message if it's a chat message. Returns whether it was one.
export const handleChatPushMessage = async (remoteMessage: {
  data?: { [key: string]: string | object };
}) => {
  const data = remoteMessage.data;
  if (data?.type !== 'chat-message') return false;

  try {
    await showChatMessageNotification({
      roomId: String(data.roomId || ''),
      senderName: String(data.senderName || ''),
      body: String(data.body || ''),
    });
  } catch (error) {
    console.error('Error showing chat notification:', error);
  }
  return true;
};

// The room a notification response is about, if it's one of ours. In the
// background task the data can arrive as a JSON `dataString` rather than
// `data`, so the identifier is the fallback.
const getChatRoomId = (response: Notifications.NotificationResponse) => {
  const { identifier, content } = response.notification.request;
  let data = content.data as { type?: string; roomId?: string } | null | undefined;
  const dataString = (content as { dataString?: unknown }).dataString;
  if (!data && typeof dataString === 'string') {
    try {
      data = JSON.parse(dataString);
    } catch {
      data = null;
    }
  }

  if (data?.type === 'chat-message' && data.roomId) return data.roomId;
  if (identifier?.startsWith('chat-')) return identifier.slice('chat-'.length);
  return null;
};

const withTimeout = <T>(promise: Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), REPLY_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

// Android can deliver the same reply twice: to the background task, and to the
// response listener (straight away if the app is alive, or queued until the
// next launch if it was killed). Claim each reply once, in memory for this JS
// context and in storage across contexts.
const claimedReplies = new Set<string>();

const claimReply = async (key: string) => {
  if (claimedReplies.has(key)) return false;
  claimedReplies.add(key);

  try {
    const stored = await AsyncStorage.getItem(HANDLED_REPLIES_KEY);
    const handled: string[] = stored ? JSON.parse(stored) : [];
    if (handled.includes(key)) return false;
    await AsyncStorage.setItem(HANDLED_REPLIES_KEY, JSON.stringify([...handled, key].slice(-20)));
  } catch (error) {
    console.error('Error recording chat reply:', error);
  }
  return true;
};

// Writes the reply the same way the chat screen sends a message
const sendReply = async (roomId: string, text: string) => {
  if (!(await ensureSignedIn())) return false;

  const { app, auth } = ensureFirebaseApp();
  const uid = auth.currentUser?.uid;
  if (!uid) return false;

  const db = getDatabase(app);
  const messageRef = push(ref(db, `rooms/${roomId}/messages`));
  await withTimeout(set(messageRef, { message: text, uid, timestamp: serverTimestamp() }));

  // Replying means you've read it; not worth failing the reply over
  set(ref(db, `rooms/${roomId}/chatReads/${uid}`), serverTimestamp()).catch((error) =>
    console.error('Error marking chat read:', error),
  );
  return true;
};

export const handleChatReply = async (response: Notifications.NotificationResponse) => {
  if (response.actionIdentifier !== REPLY_ACTION_ID) return;
  const roomId = getChatRoomId(response);
  const text = response.userText?.trim();
  if (!roomId || !text) return;

  const { identifier } = response.notification.request;
  if (!(await claimReply(`${identifier}:${response.notification.date}`))) return;

  try {
    await sendReply(roomId, text);
    // Android keeps a spinner on an inline reply until the notification changes
    await Notifications.dismissNotificationAsync(identifier);
  } catch (error) {
    console.error('Error sending chat reply:', error);
    // Replaces the spinning one, and keeps Reply so it can be retried
    await presentChatNotification(roomId, {
      title: 'Reply not sent',
      body: `Couldn't send "${text}". Tap to open the chat.`,
    }).catch((e) => console.error('Error showing reply failure:', e));
  }
};

// Android runs this for action presses while the app is backgrounded or killed
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  REPLY_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('Chat notification task error:', error);
      return;
    }
    if (data && 'actionIdentifier' in data) {
      await handleChatReply(data);
    }
  },
);

if (Platform.OS === 'android') {
  Notifications.registerTaskAsync(REPLY_TASK_NAME).catch((error) =>
    console.error('Error registering chat reply task:', error),
  );
}

// Replies while the app is open. Outside the foreground the task above gets
// them (Android runs it whenever the app isn't in the foreground).
Notifications.addNotificationResponseReceivedListener((response) => {
  if (Platform.OS === 'android' && AppState.currentState !== 'active') return;
  handleChatReply(response).catch((e) => console.error('Error handling chat reply:', e));
});

const isChatTap = (response: Notifications.NotificationResponse | null) =>
  !!response &&
  response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
  !!getChatRoomId(response);

// Tapping a chat notification opens the chat. Mounted in the root layout; the
// navigation waits until the signed-in tabs are showing, so a tap that
// launched the app isn't lost to the login / loading redirects.
export const useChatNotificationTaps = () => {
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';
  const [openPending, setOpenPending] = useState(false);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    // A launching tap can come both ways: as the last response and to the listener
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response || !isChatTap(response)) return;
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (handled.current.has(key)) return;
      handled.current.add(key);
      // Otherwise the same tap is returned again after the next login
      Notifications.clearLastNotificationResponse();
      setOpenPending(true);
    };

    // A tap that launched the app
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch((e) => console.error('Error reading last notification:', e));

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!openPending || !inTabs) return;
    setOpenPending(false);
    router.navigate('/(tabs)/Chat' as Href);
  }, [openPending, inTabs]);
};

setupChatNotifications();
