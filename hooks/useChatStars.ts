import {
  get,
  getDatabase,
  onValue,
  ref as databaseRef,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database';
import { useEffect, useState } from 'react';

import { ensureFirebaseApp } from '../services/firebaseApp';
import { MessageType } from '../types';
import { useAppToast } from './useAppToast';

const db = () => {
  ensureFirebaseApp();
  return getDatabase();
};

// Stars are private: rooms/{roomId}/chatStars/{uid}/{messageId} holds when you
// starred it, and only you read your own list
const starsRef = (roomId: string, uid: string) =>
  databaseRef(db(), `rooms/${roomId}/chatStars/${uid}`);

/** Fetches one message by key; null once it's been deleted */
export const getChatMessage = async (roomId: string, messageId: string) => {
  const snapshot = await get(databaseRef(db(), `rooms/${roomId}/messages/${messageId}`));
  if (!snapshot.exists()) return null;
  return { id: snapshot.key as string, ...snapshot.val() } as MessageType;
};

/** Your starred messages in a room (messageId → starred at), live, plus a toggle */
export const useChatStars = (roomId: string | null, uid: string | null) => {
  const { showToast } = useAppToast();
  const [stars, setStars] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !uid) return;
    setLoading(true);
    return onValue(
      starsRef(roomId, uid),
      (snapshot) => {
        setStars(snapshot.val() || {});
        setLoading(false);
      },
      (error) => {
        console.error('Error loading starred messages:', error);
        setLoading(false);
      },
    );
  }, [roomId, uid]);

  const setStarred = async (messageId: string, starred: boolean) => {
    if (!roomId || !uid) return;
    const starRef = databaseRef(db(), `rooms/${roomId}/chatStars/${uid}/${messageId}`);
    try {
      await (starred ? set(starRef, serverTimestamp()) : remove(starRef));
    } catch (error) {
      console.error('Error starring message:', error);
      showToast({
        title: starred ? "Couldn't star the message" : "Couldn't unstar the message",
        description: 'Please check your connection and try again.',
        status: 'error',
      });
    }
  };

  return {
    stars,
    loading,
    setStarred,
    toggleStar: (messageId: string) => setStarred(messageId, !stars[messageId]),
  };
};
