import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFeelingsProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  getFeeling: (
    roomId: string,
    userId: string,
  ) => Promise<{ val: () => { selectedFeeling: string } | null }>;
  updateFeeling: (roomId: string, userId: string, feeling: string) => Promise<void>;
  listenToFeelingChanges: (
    callback: (data: { feeling: string }) => void,
    roomId: string,
    userId: string,
  ) => void;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useFeelings = ({
  roomId,
  userId,
  partnerId,
  getFeeling,
  updateFeeling,
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

  const handleFeelingSend = useCallback(async () => {
    if (!roomId || !userId) return;

    try {
      await updateFeeling(roomId, userId, ownFeeling);

      setShowFeelingModal(false);

      showToast({
        title: 'Feeling updated',
        description: 'Your feeling has been updated',
        status: 'success',
      });
    } catch (error) {
      console.error('Error updating feeling:', error);
    }
  }, [roomId, userId, ownFeeling, updateFeeling, showToast]);

  const loadFeelingData = useCallback(
    async (
      ownFeelingSnapshot?: { val: () => { selectedFeeling: string } | null },
      partnerFeelingSnapshot?: { val: () => { selectedFeeling: string } | null },
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
