import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFlowersProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  getFlower: (
    roomId: string,
    userId: string,
  ) => Promise<{ val: () => { selectedFlower: string; message: string } | null }>;
  updateFlower: (roomId: string, userId: string, flower: string, message: string) => Promise<void>;
  listenToFlowerChanges: (
    callback: (data: { flower: string; message: string }) => void,
    roomId: string,
    userId: string,
  ) => void;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useFlowers = ({
  roomId,
  userId,
  partnerId,
  getFlower,
  updateFlower,
  listenToFlowerChanges,
  showToast,
}: UseFlowersProps) => {
  const [flowerMessage, setFlowerMessage] = useState<string>('');
  const [flower, setFlower] = useState<string>('daisy');
  const [showFlowerModal, setShowFlowerModal] = useState(false);
  const [ownFlower, setOwnFlower] = useState<string>('daisy');
  const [ownFlowerMessage, setOwnFlowerMessage] = useState<string>('');
  const [oldFlowerValues, setOldFlowerValues] = useState({
    selectedFlower: 'daisy',
    message: '',
  });

  // Use ref to track modal state to avoid listener recreation
  const modalOpenRef = useRef(false);

  // Update ref when modal state changes
  useEffect(() => {
    modalOpenRef.current = showFlowerModal;
  }, [showFlowerModal]);

  // Listen to partner's flower changes
  useEffect(() => {
    if (!roomId || !partnerId) return;

    const unsubscribe = listenToFlowerChanges(
      (data) => {
        setFlower(data.flower);
        setFlowerMessage(data.message);
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

  // Listen to own flower changes (to sync updates from Firebase)
  useEffect(() => {
    if (!roomId || !userId) return;

    const unsubscribe = listenToFlowerChanges(
      (data) => {
        // Only update if modal is not open to avoid resetting user's selection
        if (!modalOpenRef.current) {
          setOwnFlower(data.flower);
          setOwnFlowerMessage(data.message);
          setOldFlowerValues({
            selectedFlower: data.flower,
            message: data.message,
          });
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

  const handleFlowerSend = useCallback(async () => {
    if (!roomId || !userId) return;

    try {
      await updateFlower(roomId, userId, ownFlower, ownFlowerMessage);

      setShowFlowerModal(false);

      showToast({
        title: 'Flower updated',
        description: 'Your flower has been updated',
        status: 'success',
      });
    } catch (error) {
      console.error('Error updating flower:', error);
    }
  }, [roomId, userId, ownFlower, ownFlowerMessage, updateFlower, showToast]);

  const handleFlowerOpenPress = useCallback(() => {
    setOldFlowerValues({
      selectedFlower: ownFlower,
      message: ownFlowerMessage,
    });

    setShowFlowerModal(true);
  }, [ownFlower, ownFlowerMessage]);

  const handleFlowerClosePress = useCallback(() => {
    setOwnFlower(oldFlowerValues.selectedFlower);
    setOwnFlowerMessage(oldFlowerValues.message);
    setShowFlowerModal(false);
  }, [oldFlowerValues]);

  const loadFlowerData = useCallback(
    async (
      partnerFlowerSnapshot?: { val: () => { selectedFlower: string; message: string } | null },
      ownFlowerSnapshot?: { val: () => { selectedFlower: string; message: string } | null },
    ) => {
      if (partnerFlowerSnapshot?.val()) {
        const data = partnerFlowerSnapshot.val();
        if (data) {
          setFlower(data.selectedFlower);
          setFlowerMessage(data.message);
        }
      }

      if (ownFlowerSnapshot?.val()) {
        const data = ownFlowerSnapshot.val();
        if (data) {
          setOwnFlower(data.selectedFlower);
          setOwnFlowerMessage(data.message);
        }
      }
    },
    [],
  );

  return {
    // State
    flower,
    flowerMessage,
    showFlowerModal,
    ownFlower,
    setOwnFlower,
    ownFlowerMessage,
    setOwnFlowerMessage,

    // Handlers
    handleFlowerSend,
    handleFlowerOpenPress,
    handleFlowerClosePress,
    loadFlowerData,
  };
};
