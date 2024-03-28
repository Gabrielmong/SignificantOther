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
import { useAppToast, useAuth } from '../../hooks';
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
            <Text>Notifications</Text>
          </Box>
        </ModalHeader>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            gap: 20,
          }}>
          <Box
            style={{
              flexDirection: 'row',
              width: '100%',
              justifyContent: 'space-between',
            }}>
            <Text>Notifications {enabled ? 'enabled' : 'disabled'}</Text>
            <Switch
              value={enabled}
              onValueChange={onSwitchChange}
              trackColor={{
                true: '#F5E8C7',
                false: '#7077A1',
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
            <Text>Check-in notifications</Text>

            <Box
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <IconButton icon={Minus} onPress={handleTimeMinus} size={25} />

              <Text>
                {formatTimeLabel(notificationTime[0])}:{formatTimeLabel(notificationTime[1])}
              </Text>

              <IconButton icon={Plus} onPress={handleTimePlus} size={25} />
            </Box>
          </Box>
        </Box>

        <Button
          onPress={handleSave}
          style={{
            width: '100%',
          }}>
          <Text>Save</Text>
        </Button>
      </ModalContent>
    </Modal>
  );
};
