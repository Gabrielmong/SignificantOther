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
  replyingTo?: {
    messageId: number;
    message: string;
    uid: string;
  };
  onReplyPress?: (messageId: number) => void;
  partnerName?: string;
}

export const Message = ({
  index,
  lastMessageTimestamp,
  message,
  timestamp,
  uid,
  onLongPress,
  replyingTo,
  onReplyPress,
  partnerName,
}: MessageType) => {
  const user = useAppSelector((state) => state.user);
  const { theme } = useAppTheme();

  const showTimeIndicator = useMemo(() => {
    if (index === 0) return true;

    if (lastMessageTimestamp === undefined) return true;

    const date = new Date(timestamp);
    const lastDate = new Date(lastMessageTimestamp);

    return date.getMinutes() - lastDate.getMinutes() < 0;
  }, [timestamp]);

  const isOwnMessage = uid === user?.uid;
  const isReplyOwnMessage = replyingTo?.uid === user?.uid;

  const truncateMessage = (msg: string, maxLength: number = 50) => {
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  };

  return (
    <>
      {showTimeIndicator && (
        <Box
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing[1],
          }}>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textTertiary,
            }}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </Text>
        </Box>
      )}
      <Box
        style={{
          flexDirection: 'row',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          width: '100%',
          padding: theme.spacing[2],
        }}>
        <Pressable
          style={{
            flexDirection: 'column',
            backgroundColor: isOwnMessage ? theme.colors.messageSelf : theme.colors.messagePartner,
            padding: theme.spacing[3],
            borderRadius: theme.radii.md,
            borderBottomLeftRadius: isOwnMessage ? theme.radii.md : 0,
            borderBottomRightRadius: isOwnMessage ? 0 : theme.radii.md,
            ...theme.shadows.sm,
            gap: theme.spacing[2],
          }}
          onLongPress={onLongPress}>
          {/* Reply Preview */}
          {replyingTo && (
            <Pressable
              onPress={() => onReplyPress?.(replyingTo.messageId)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                padding: theme.spacing[2],
                borderRadius: theme.radii.sm,
                borderLeftWidth: 3,
                borderLeftColor: 'rgba(255, 255, 255, 0.5)',
              }}>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                  marginBottom: theme.spacing[1],
                }}>
                {isReplyOwnMessage ? 'You' : partnerName || 'Partner'}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: theme.fontSize.sm,
                }}
                numberOfLines={1}>
                {truncateMessage(replyingTo.message)}
              </Text>
            </Pressable>
          )}

          {/* Main Message */}
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
            }}>
            {message}
          </Text>
        </Pressable>
      </Box>
    </>
  );
};
