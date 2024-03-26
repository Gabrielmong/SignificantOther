import { Box, Modal, Pressable, Text } from '@gluestack-ui/themed';
import { useAppSelector } from '../../state';
import { useAppTheme } from '../../hooks';
import { useMemo } from 'react';

interface MessageType {
  timestamp: number;
  lastMessageTimestamp?: number;
  message: string;
  uid: string;
  index: number;
  onLongPress?: () => void;
}

export const Message = ({
  index,
  lastMessageTimestamp,
  message,
  timestamp,
  uid,
  onLongPress,
}: MessageType) => {
  const user = useAppSelector((state) => state.user);
  const { colorMode } = useAppTheme();

  const showTimeIndicator = useMemo(() => {
    if (index === 0) return true;

    if (lastMessageTimestamp === undefined) return true;

    const date = new Date(timestamp);
    const lastDate = new Date(lastMessageTimestamp);

    return date.getMinutes() - lastDate.getMinutes() < 0;
  }, [timestamp]);

  return (
    <>
      {showTimeIndicator && (
        <Box
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
          }}>
          <Text
            style={{
              fontSize: 12,
              color: colorMode === 'dark' ? '#ffffff' : '#000000',
            }}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Box>
      )}
      <Box
        style={{
          flexDirection: 'row',
          justifyContent: uid === user?.uid ? 'flex-end' : 'flex-start',
          width: '100%',
          padding: 5,
        }}>
        <Pressable
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: uid === user.uid ? '#8859ff' : '#323aba',
            padding: 10,
            borderRadius: 10,
            borderBottomLeftRadius: uid === user.uid ? 10 : 0,
            borderBottomRightRadius: uid === user.uid ? 0 : 10,
          }}
          onLongPress={onLongPress}>
          <Text>{message}</Text>
        </Pressable>
      </Box>
    </>
  );
};
