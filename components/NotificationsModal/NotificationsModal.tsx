import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Modal,
  Box,
  Text,
  Button,
  Switch,
} from '@gluestack-ui/themed';
import * as Notifications from 'expo-notifications';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import { useAppToast, useAuth, useAppTheme } from '../../hooks';
import { appNotificationBehavior } from '../../services/notificationBehavior';
import { isOnThisDayEnabled, setOnThisDayEnabled } from '../../services/onThisDay';
import { useAppSelector } from '../../state';
import { CHECKIN_ID, CHECKIN_TITLE, checkinIdsToCancel } from '../../utils/checkin';
import { IconButton } from '../IconButton';

const formatTimeLabel = (time: number) => {
  return time < 10 ? `0${time}` : time;
};

export const NotificationsModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const { getPermission, requestUserPermission, revokeUserPermission, editExtraProfile } =
    useAuth();
  const { theme } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const { showToast } = useAppToast();
  const { notifications } = useAppSelector((state) => state.user);
  const [notificationTime, setNotificationTime] = useState(notifications?.checkin || [9, 0]);
  const [checkingChanged, setCheckingChanged] = useState(false);
  const [onThisDay, setOnThisDay] = useState(true);

  useEffect(() => {
    if (isOpen) isOnThisDayEnabled().then(setOnThisDay);
  }, [isOpen]);

  const onOnThisDayChange = (on: boolean) => {
    setOnThisDay(on);
    setOnThisDayEnabled(on);
  };

  const onSwitchChange = async () => {
    if (enabled) {
      cancelAllNotifications();
      setEnabled(false);
      // Off means off: On this day stays off until turned back on
      onOnThisDayChange(false);

      showToast({ description: 'Notifications disabled', status: 'success', title: 'Success' });
    } else {
      await requestUserPermission();

      const permission = await getPermission();

      setEnabled(permission);

      if (permission) {
        setNotificationHandler();
      }

      showToast({ description: 'Notifications enabled', status: 'success', title: 'Success' });
    }
  };

  const setNotificationHandler = async () => {
    Notifications.setNotificationHandler({ handleNotification: appNotificationBehavior });
  };

  const addNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_ID,
      content: {
        title: CHECKIN_TITLE,
        body: 'Let your significant other know how you feel today.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: notificationTime[0],
        minute: notificationTime[1],
        repeats: true,
      },
    });
  };

  // Replaces only the check-in reminder. Unlike turning notifications off,
  // this keeps push registration and every other scheduled notification.
  const cancelCheckinReminder = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      checkinIdsToCancel(scheduled).map((id) => Notifications.cancelScheduledNotificationAsync(id)),
    );
  };

  const cancelAllNotifications = async () => {
    Notifications.unregisterForNotificationsAsync();
    Notifications.cancelAllScheduledNotificationsAsync();
    revokeUserPermission();
  };

  useEffect(() => {
    const checkPermission = async () => {
      const permission = await getPermission();
      setEnabled(permission);
    };

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Steps in 15-minute increments, wrapping around midnight in both directions
  const stepTime = (minutes: number) =>
    setNotificationTime(([hour, minute]) => {
      const total = (((hour * 60 + minute + minutes) % 1440) + 1440) % 1440;
      return [Math.floor(total / 60), total % 60];
    });

  const handleTimeMinus = () => stepTime(-15);

  const handleTimePlus = () => stepTime(15);

  // Never saved counts as changed, so the first Save schedules the reminder
  useEffect(() => {
    const saved = notifications?.checkin;
    setCheckingChanged(
      !saved || notificationTime[0] !== saved[0] || notificationTime[1] !== saved[1],
    );
  }, [notificationTime, notifications?.checkin]);

  const handleSave = async () => {
    await editExtraProfile({
      notifications: { checkin: [notificationTime[0], notificationTime[1]] },
    });

    onSave();

    if (checkingChanged) {
      try {
        await cancelCheckinReminder();
        await addNotification();
      } catch (error) {
        console.error('Error updating check-in reminder:', error);
      }
    }
  };

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent>
        <ModalCloseButton onPress={onClose} />

        <ModalHeader>
          <Box>
            <Text
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.colors.text,
              }}>
              Notifications
            </Text>
          </Box>
        </ModalHeader>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: theme.commonSpacing.screenPadding,
            gap: theme.spacing[5],
          }}>
          <Box
            style={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.md,
                color: theme.colors.text,
              }}>
              Notifications {enabled ? 'enabled' : 'disabled'}
            </Text>
            <Switch
              value={enabled}
              onValueChange={onSwitchChange}
              trackColor={{
                true: theme.colors.primary,
                false: theme.colors.textTertiary,
              }}
            />
          </Box>

          <Box
            style={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Box style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}>
                On this day
              </Text>
              <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary }}>
                A morning note on days with a memory
              </Text>
            </Box>
            <Switch
              value={enabled && onThisDay}
              onValueChange={onOnThisDayChange}
              isDisabled={!enabled}
              trackColor={{
                true: theme.colors.primary,
                false: theme.colors.textTertiary,
              }}
            />
          </Box>

          <Box
            style={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: theme.fontSize.md,
                color: theme.colors.text,
              }}>
              Check-in notifications
            </Text>

            <Box
              style={{
                flexDirection: 'row',
                gap: theme.spacing[2],
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <IconButton icon={Minus} onPress={handleTimeMinus} size={32} variant="ghost" />

              <Text
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.text,
                  minWidth: 60,
                  textAlign: 'center',
                }}>
                {formatTimeLabel(notificationTime[0])}:{formatTimeLabel(notificationTime[1])}
              </Text>

              <IconButton icon={Plus} onPress={handleTimePlus} size={32} variant="ghost" />
            </Box>
          </Box>
        </Box>

        <Button
          onPress={handleSave}
          style={{
            width: '100%',
            backgroundColor: theme.colors.primary,
            ...theme.shadows.sm,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Save
          </Text>
        </Button>
      </ModalContent>
    </Modal>
  );
};
