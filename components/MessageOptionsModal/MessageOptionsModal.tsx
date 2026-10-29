import {
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Modal,
  Box,
  Button,
  Text,
  Pressable,
} from '@gluestack-ui/themed';
import { timeAgo } from '../../utils';
import { useAppSelector } from '../../state';
import { MessageType } from '../../types';
import { messagePreview } from '../../utils/chat';
import { useAppTheme } from '../../hooks';

interface MessageOptionsModalProps {
  isOpen: boolean;
  currentMessage: MessageType | null;
  onCopyMessage: () => void;
  onDeleteMessage: () => void;
  onReplyMessage: () => void;
  onClose?: () => void;
  // Your current reaction to this message, highlighted in the picker
  myReaction?: string;
  // Absent for messages that can't take a reaction (not on the server yet)
  onReact?: (emoji: string) => void;
  // Absent when the message can't be edited (not yours, too old, not text)
  onEditMessage?: () => void;
  // Absent for messages that can't be starred (not on the server yet)
  onToggleStar?: () => void;
  starred?: boolean;
}

export const MESSAGE_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export const MessageOptionsModal = ({
  isOpen,
  onClose,
  currentMessage,
  onCopyMessage,
  onDeleteMessage,
  onReplyMessage,
  myReaction,
  onReact,
  onEditMessage,
  onToggleStar,
  starred,
}: MessageOptionsModalProps) => {
  const user = useAppSelector((state) => state.user);
  const { theme } = useAppTheme();
  // A photo or voice note alone has no text worth copying
  const copyable = !!currentMessage?.message || !!currentMessage?.attachment;

  const optionButton = (label: string, onPress: () => void) => (
    <Button
      variant="outline"
      onPress={onPress}
      style={{
        borderColor: theme.colors.border,
      }}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
        }}>
        {label}
      </Text>
    </Button>
  );

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent>
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            Message Options
          </Text>

          <ModalCloseButton onPress={onClose} />
        </ModalHeader>

        <ModalBody>
          <Box
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: theme.spacing[3],
              padding: theme.commonSpacing.screenPadding,
            }}>
            {onReact && (
              <Box style={{ flexDirection: 'row', gap: theme.spacing[1] }}>
                {MESSAGE_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => onReact(emoji)}
                    accessibilityRole="button"
                    accessibilityLabel={`React with ${emoji}`}
                    accessibilityState={{ selected: myReaction === emoji }}
                    style={{
                      padding: theme.spacing[2],
                      borderRadius: theme.radii.full,
                      backgroundColor:
                        myReaction === emoji ? theme.colors.surfaceElevated : 'transparent',
                    }}>
                    <Text style={{ fontSize: theme.fontSize['2xl'] }}>{emoji}</Text>
                  </Pressable>
                ))}
              </Box>
            )}

            <Box
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor:
                  currentMessage?.uid === user.uid
                    ? theme.colors.messageSelf
                    : theme.colors.messagePartner,
                padding: theme.spacing[3],
                borderRadius: theme.radii.md,
                borderBottomLeftRadius: currentMessage?.uid === user.uid ? theme.radii.md : 0,
                borderBottomRightRadius: currentMessage?.uid === user.uid ? 0 : theme.radii.md,
                ...theme.shadows.sm,
              }}>
              <Text
                style={{
                  color: theme.colors.white,
                  fontSize: theme.fontSize.md,
                }}>
                {currentMessage ? messagePreview(currentMessage) : ''}
              </Text>
            </Box>

            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.textTertiary,
              }}>
              {timeAgo(currentMessage?.timestamp || 0)}
            </Text>
            <Box
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}>
              {copyable && optionButton('Copy', onCopyMessage)}
              {optionButton('Reply', onReplyMessage)}
              {onToggleStar && optionButton(starred ? 'Unstar' : 'Star', onToggleStar)}
              {onEditMessage && optionButton('Edit', onEditMessage)}

              {currentMessage?.uid === user.uid && (
                <Button
                  variant="outline"
                  onPress={onDeleteMessage}
                  style={{
                    borderColor: theme.colors.error,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.error,
                      fontSize: theme.fontSize.sm,
                      fontWeight: theme.fontWeight.medium,
                    }}>
                    Delete
                  </Text>
                </Button>
              )}
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
