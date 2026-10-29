import { useState, useEffect, useCallback, useRef } from 'react';
import { successFeedback } from '../utils/haptics';
import type { Unsubscribe } from 'firebase/database';

interface UseFeelingsProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  getFeeling: (
    roomId: string,
    userId: string,
  ) => Promise<{ val: () => { selectedFeeling: string } | null }>;
  updateFeeling: (roomId: string, userId: string, feeling: string) => Promise<void>;
  logFeelingHistory: (roomId: string, userId: string, feeling: string, at?: number) => Promise<void>;
  listenToFeelingChanges: (
    callback: (data: { feeling: string }) => void,
    roomId: string,
    userId: string,
  ) => Unsubscribe;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useFeelings = ({
  roomId,
  userId,
  partnerId,
  getFeeling,
  updateFeeling,
  logFeelingHistory,
  listenToFeelingChanges,
  showToast,
}: UseFeelingsProps) => {
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [ownFeeling, setOwnFeeling] = useState<string>('neutral');
  const [oldFeeling, setOldFeeling] = useState<string>('neutral');
  const [feeling, setFeeling] = useState<string>('neutral');

  // Use ref to track modal state to avoid listener recreation
  const modalOpenRef = useRef(false);

  // Update ref when modal state changes
  useEffect(() => {
    modalOpenRef.current = showFeelingModal;
  }, [showFeelingModal]);

  // Listen to partner's feeling changes
  useEffect(() => {
    if (!roomId || !partnerId) return;

    const unsubscribe = listenToFeelingChanges(
      (data) => {
        setFeeling(data.feeling);
      },
      roomId,
      partnerId,
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, partnerId]);

  // Listen to own feeling changes (to sync updates from Firebase)
  useEffect(() => {
    if (!roomId || !userId) return;

    const unsubscribe = listenToFeelingChanges(
      (data) => {
        // Only update if modal is not open to avoid resetting user's selection
        if (!modalOpenRef.current) {
          setOwnFeeling(data.feeling);
          setOldFeeling(data.feeling);
        }
      },
      roomId,
      userId,
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const handleFeelingPress = useCallback(() => {
    setOldFeeling(ownFeeling);
    setShowFeelingModal(true);
  }, [ownFeeling]);

  const handleFeelingClosePress = useCallback(() => {
    setOwnFeeling(oldFeeling);
    setShowFeelingModal(false);
  }, [oldFeeling]);

  const handleFeelingSend = useCallback(
    async (selectedFeeling: string) => {
      if (!roomId || !userId) return;

      try {
        const savedAt = Date.now();
        setOwnFeeling(selectedFeeling);

        // Only log actual changes. The history write is started before the
        // feeling update and not awaited: update() resolves only on server
        // confirmation, so this queues it locally right away with the
        // save-time timestamp, and a failure never blocks or toasts.
        if (selectedFeeling !== oldFeeling) {
          logFeelingHistory(roomId, userId, selectedFeeling, savedAt).catch((error) =>
            console.error('Error logging feeling history:', error),
          );
        }

        await updateFeeling(roomId, userId, selectedFeeling);
        successFeedback();

        setShowFeelingModal(false);

        showToast({
          title: 'Feeling updated',
          description: 'Your feeling has been updated',
          status: 'success',
        });
      } catch (error) {
        console.error('Error updating feeling:', error);
      }
    },
    [roomId, userId, oldFeeling, updateFeeling, logFeelingHistory, showToast],
  );

  const loadFeelingData = useCallback(
    async (
      ownFeelingSnapshot?: { val: () => { selectedFeeling: string } | null } | null,
      partnerFeelingSnapshot?: { val: () => { selectedFeeling: string } | null } | null,
    ) => {
      if (ownFeelingSnapshot?.val()) {
        setOwnFeeling(ownFeelingSnapshot.val()!.selectedFeeling);
      }

      if (partnerFeelingSnapshot?.val()) {
        setFeeling(partnerFeelingSnapshot.val()!.selectedFeeling);
      }
    },
    [],
  );

  return {
    // State
    showFeelingModal,
    ownFeeling,
    setOwnFeeling,
    feeling,

    // Handlers
    handleFeelingPress,
    handleFeelingClosePress,
    handleFeelingSend,
    loadFeelingData,
  };
};
