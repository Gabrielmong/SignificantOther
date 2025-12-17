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
} from '@gluestack-ui/themed';
import { timeAgo } from '../../utils';
import { useAppSelector } from '../../state';
import { MessageType } from '../../types';
import { useAppTheme } from '../../hooks';

interface MessageOptionsModalProps {
  isOpen: boolean;
  currentMessage: MessageType | null;
  onCopyMessage: () => void;
  onDeleteMessage: () => void;
  onReplyMessage: () => void;
  onClose?: () => void;
}

export const MessageOptionsModal = ({
  isOpen,
  onClose,
  currentMessage,
  onCopyMessage,
  onDeleteMessage,
  onReplyMessage,
}: MessageOptionsModalProps) => {
  const user = useAppSelector((state) => state.user);
  const { theme } = useAppTheme();

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
                {currentMessage?.message}
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
                justifyContent: 'center',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}>
              <Button
                variant="outline"
                onPress={onCopyMessage}
                style={{
                  borderColor: theme.colors.border,
                }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                  }}>
                  Copy
                </Text>
              </Button>

              <Button
                variant="outline"
                onPress={onReplyMessage}
                style={{
                  borderColor: theme.colors.border,
                }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                  }}>
                  Reply
                </Text>
              </Button>

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
