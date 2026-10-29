import { useAppSelector } from '../state';
import { MessageAttachment } from '../types';
import { useAppToast } from './useAppToast';
import { useFirebase } from './useFirebase';
import { tapFeedback } from '../utils/haptics';

/**
 * Sends an item (countdown, wish, place…) into the chat as a tappable card.
 * Stays on the current screen; the card shows up in the chat right away and
 * syncs when the connection allows.
 */
export const useShareToChat = () => {
  const user = useAppSelector((state) => state.user);
  const { sendMessage } = useFirebase();
  const { showToast } = useAppToast();

  return (attachment: MessageAttachment) => {
    if (!user.roomId || !user.uid) return;

    const { delivered } = sendMessage({
      roomId: user.roomId,
      uid: user.uid,
      message: '',
      attachment,
    });

    tapFeedback();
    showToast({ title: 'Shared to chat', description: attachment.title, status: 'success' });

    delivered.catch((error) => {
      console.error('Error sharing to chat:', error);
      showToast({
        title: "Couldn't share to chat",
        description: 'Please check your connection and try again.',
        status: 'error',
      });
    });
  };
};
