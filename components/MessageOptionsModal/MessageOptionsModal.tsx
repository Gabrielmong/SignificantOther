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

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />

      <ModalContent>
        <ModalHeader>
          <Text>Message Options</Text>

          <ModalCloseButton onPress={onClose} />
        </ModalHeader>

        <ModalBody>
          <Box
            style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              padding: 20,
            }}>
            <Box
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: currentMessage?.uid === user.uid ? '#8859ff' : '#323aba',
                padding: 10,
                borderRadius: 10,
                borderBottomLeftRadius: currentMessage?.uid === user.uid ? 10 : 0,
                borderBottomRightRadius: currentMessage?.uid === user.uid ? 0 : 10,
              }}>
              <Text>{currentMessage?.message}</Text>
            </Box>

            <Text>{timeAgo(currentMessage?.timestamp || 0)}</Text>
            <Box
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
              }}>
              <Button variant="outline" onPress={onCopyMessage}>
                <Text>Copy</Text>
              </Button>

              <Button variant="outline" onPress={onReplyMessage}>
                <Text>Reply</Text>
              </Button>

              {currentMessage?.uid === user.uid && (
                <Button variant="outline" onPress={onDeleteMessage}>
                  <Text>Delete</Text>
                </Button>
              )}
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
