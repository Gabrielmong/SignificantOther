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
  ModalBody,
} from '@gluestack-ui/themed';
import { useEffect, useState } from 'react';
import { useAppToast, useAuth, useAppTheme } from '../../hooks';
import * as Notifications from 'expo-notifications';
import { IconButton } from '../IconButton';
import { Minus, Plus } from 'lucide-react-native';
import { useAppSelector } from '../../state';

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

  const onSwitchChange = async () => {
    if (enabled) {
      cancelAllNotifications();
      setEnabled(false);

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
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  };

  const addNotification = async () => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to check in!',
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
  }, []);

  const handleTimeMinus = () => {
    if (notificationTime[1] === 0) {
      setNotificationTime((prev) => [notificationTime[0] - 1, 15]);
    } else {
      setNotificationTime((prev) => [notificationTime[0], notificationTime[1] - 15]);
    }
  };

  const handleTimePlus = () => {
    if (notificationTime[1] === 45) {
      setNotificationTime((prev) => [notificationTime[0] + 1, 0]);
    } else {
      setNotificationTime((prev) => [notificationTime[0], notificationTime[1] + 15]);
    }
  };

  useEffect(() => {
    if (notifications?.checkin) {
      if (
        notificationTime[0] === notifications.checkin[0] &&
        notificationTime[1] === notifications.checkin[1]
      ) {
        setCheckingChanged(false);
      } else {
        setCheckingChanged(true);
      }
    }
  }, [notificationTime]);

  const handleSave = async () => {
    await editExtraProfile({
      notifications: { checkin: [notificationTime[0], notificationTime[1]] },
    });

    onSave();

    if (checkingChanged) {
      cancelAllNotifications();
      addNotification();
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
