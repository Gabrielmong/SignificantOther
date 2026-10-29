import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { DailyQuestionDay } from '../types';
import { MAX_ANSWER_LENGTH, questionForDate, todayKey } from '../utils/dailyQuestion';

export type DailyQuestionStatus = 'unanswered' | 'waiting' | 'revealed';

interface UseDailyQuestionProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  saveDailyAnswer: (
    roomId: string,
    uid: string,
    dateKey: string,
    question: string,
    text: string,
  ) => Promise<void>;
  editDailyAnswer: (roomId: string, uid: string, dateKey: string, text: string) => Promise<void>;
  listenToDailyQuestionDay: (
    roomId: string,
    dateKey: string,
    callback: (day: DailyQuestionDay | null) => void,
  ) => () => void;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useDailyQuestion = ({
  roomId,
  userId,
  partnerId,
  saveDailyAnswer,
  editDailyAnswer,
  listenToDailyQuestionDay,
  showToast,
}: UseDailyQuestionProps) => {
  const [dateKey, setDateKey] = useState(() => todayKey());
  const [snapshot, setSnapshot] = useState<{
    dateKey: string;
    day: DailyQuestionDay | null;
  } | null>(null);

  // Move to the next question when the app returns after the couple's midnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setDateKey(todayKey());
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setSnapshot(null);
    if (!roomId) return;

    const unsubscribe = listenToDailyQuestionDay(roomId, dateKey, (day) =>
      setSnapshot({ dateKey, day }),
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dateKey]);

  // Only trust a snapshot for the current date; until it arrives we don't
  // know whether either partner has already answered.
  const loaded = snapshot?.dateKey === dateKey;
  const day = loaded ? snapshot.day : null;

  const question = day?.question || questionForDate(dateKey);
  const myAnswer = userId ? (day?.answers?.[userId] ?? null) : null;
  // Fall back to "any other answer in the room" in case the partner's id
  // hasn't loaded yet, so the lock and reveal never depend on Redux timing.
  const partnerKey =
    partnerId || Object.keys(day?.answers ?? {}).find((uid) => uid !== userId) || null;
  const partnerAnswer = partnerKey ? (day?.answers?.[partnerKey] ?? null) : null;
  const status: DailyQuestionStatus = !myAnswer
    ? 'unanswered'
    : partnerAnswer
      ? 'revealed'
      : 'waiting';

  const submitAnswer = useCallback(
    async (text: string): Promise<boolean> => {
      const answer = text.trim().slice(0, MAX_ANSWER_LENGTH);
      if (!roomId || !userId || !answer) return false;
      if (!loaded) return false;

      // Your answer locks once the partner has answered; a first answer is
      // always allowed.
      if (myAnswer && partnerAnswer) {
        showToast({
          title: 'Answers are locked',
          description: 'Your partner already answered',
          status: 'error',
        });
        return false;
      }

      try {
        if (myAnswer) {
          await editDailyAnswer(roomId, userId, dateKey, answer);
        } else {
          await saveDailyAnswer(roomId, userId, dateKey, question, answer);
        }
        return true;
      } catch (error) {
        console.error('Error saving daily answer:', error);
        showToast({
          title: "Couldn't save your answer",
          description: 'Please try again',
          status: 'error',
        });
        return false;
      }
    },
    [
      roomId,
      userId,
      dateKey,
      loaded,
      question,
      myAnswer,
      partnerAnswer,
      saveDailyAnswer,
      editDailyAnswer,
      showToast,
    ],
  );

  return { dateKey, question, myAnswer, partnerAnswer, status, loaded, submitAnswer };
};
