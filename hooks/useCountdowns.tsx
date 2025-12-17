import { useState, useEffect, useCallback } from 'react';
import { Countdown, CountdownObject, RecurrenceType, RecurrenceUnit } from '../types';
import { calculateNextRecurrenceDate, shouldUpdateCountdown } from '../utils';

interface UseCountdownsProps {
  roomId: string | null;
  userId: string | null;
  createCountdown: (roomId: string, countdown: Countdown) => Promise<string>;
  updateCountdown: (roomId: string, countdownId: string, countdown: Countdown) => Promise<void>;
  deleteCountdown: (roomId: string, countdownId: string) => Promise<void>;
  listenToCountdownChanges: (
    callback: ({ countdowns }: { countdowns: CountdownObject }) => void,
    roomId: string,
  ) => void;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useCountdowns = ({
  roomId,
  userId,
  createCountdown,
  updateCountdown,
  deleteCountdown,
  listenToCountdownChanges,
  showToast,
}: UseCountdownsProps) => {
  const [countdowns, setCountdowns] = useState<CountdownObject>({});
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);

  // Listen to countdown changes
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenToCountdownChanges((data) => {
      setCountdowns(data.countdowns);
    }, roomId);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-update expired recurring countdowns
  useEffect(() => {
    if (!roomId || !countdowns) return;

    const checkAndUpdateCountdowns = async () => {
      const countdownArray = Object.values(countdowns);

      for (const countdown of countdownArray) {
        // Set default recurrence to 'none' for backward compatibility
        const countdownWithRecurrence = {
          ...countdown,
          recurrence: countdown.recurrence || 'none',
        };

        if (shouldUpdateCountdown(countdownWithRecurrence)) {
          // Calculate the next recurrence date
          let nextDate = calculateNextRecurrenceDate(
            countdownWithRecurrence.date,
            countdownWithRecurrence.recurrence,
            countdownWithRecurrence.recurrenceInterval,
            countdownWithRecurrence.recurrenceUnit,
          );

          // If the next date is still in the past (edge case), keep advancing
          while (nextDate < Date.now() && countdownWithRecurrence.recurrence !== 'none') {
            nextDate = calculateNextRecurrenceDate(
              nextDate,
              countdownWithRecurrence.recurrence,
              countdownWithRecurrence.recurrenceInterval,
              countdownWithRecurrence.recurrenceUnit,
            );
          }

          // Update the countdown with the new date
          const countdownId = countdown.id;
          if (countdownId) {
            try {
              await updateCountdown(roomId, countdownId, {
                ...countdown,
                date: nextDate,
              });
            } catch (error) {
              console.error('Error updating recurring countdown:', error);
            }
          }
        }
      }
    };

    // Check immediately when countdowns change
    checkAndUpdateCountdowns();

    // Also check periodically (every minute)
    const interval = setInterval(checkAndUpdateCountdowns, 60000);

    return () => clearInterval(interval);
  }, [countdowns, roomId, updateCountdown]);

  const handleAddCountdown = useCallback(() => {
    setEditingCountdown(null);
    setShowCountdownModal(true);
  }, []);

  const handleEditCountdown = useCallback((countdown: Countdown) => {
    setEditingCountdown(countdown);
    setShowCountdownModal(true);
  }, []);

  const handleSaveCountdown = useCallback(
    async (countdownData: {
      title: string;
      date: number;
      icon: string;
      recurrence?: RecurrenceType;
      recurrenceInterval?: number;
      recurrenceUnit?: RecurrenceUnit;
    }) => {
      if (!roomId || !userId) return;

      try {
        if (editingCountdown) {
          // Update existing countdown
          await updateCountdown(roomId, editingCountdown.id!, {
            ...editingCountdown,
            ...countdownData,
          });
          showToast({
            title: 'Countdown Updated',
            description: 'Your countdown has been updated',
            status: 'success',
          });
        } else {
          // Create new countdown
          await createCountdown(roomId, {
            ...countdownData,
            recurrence: countdownData.recurrence || 'none', // Default to 'none'
            createdAt: Date.now(),
            createdBy: userId,
          });
          showToast({
            title: 'Countdown Created',
            description: 'Your countdown has been created',
            status: 'success',
          });
        }
      } catch (error) {
        console.error('Error saving countdown:', error);
        showToast({
          title: 'Error',
          description: 'Failed to save countdown',
          status: 'error',
        });
      }
    },
    [roomId, userId, editingCountdown, createCountdown, updateCountdown, showToast],
  );

  const handleDeleteCountdown = useCallback(
    async (countdownId: string) => {
      if (!roomId) return;

      try {
        await deleteCountdown(roomId, countdownId);
        showToast({
          title: 'Countdown Deleted',
          description: 'Your countdown has been deleted',
          status: 'success',
        });
      } catch (error) {
        console.error('Error deleting countdown:', error);
        showToast({
          title: 'Error',
          description: 'Failed to delete countdown',
          status: 'error',
        });
      }
    },
    [roomId, deleteCountdown, showToast],
  );

  const handleCloseCountdownModal = useCallback(() => {
    setShowCountdownModal(false);
    setEditingCountdown(null);
  }, []);

  return {
    countdowns,
    showCountdownModal,
    editingCountdown,
    handleAddCountdown,
    handleEditCountdown,
    handleSaveCountdown,
    handleDeleteCountdown,
    handleCloseCountdownModal,
  };
};
