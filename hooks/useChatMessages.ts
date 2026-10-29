import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageAudio, MessageImage, MessageReply, MessageStatus, MessageType } from '../types';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import {
  deleteChatMedia,
  editMessageText,
  reserveMessageId,
  uploadChatImage,
  uploadVoiceNote,
  writeMediaMessage,
} from '../services/chatMedia';
import type { PickedPhoto } from '../services/photoUpload';

const PAGE_SIZE = 50;

type Draft = { message: string; replyingTo?: MessageReply };

// A photo or voice note on its way: the file uploads first, then the message is
// written. `uploaded` is kept once the file is up, so a retry only rewrites.
type MediaJob =
  | {
      kind: 'image';
      photo: PickedPhoto;
      caption: string;
      replyingTo?: MessageReply;
      uploaded?: MessageImage;
    }
  | {
      kind: 'audio';
      uri: string;
      durationMs: number;
      replyingTo?: MessageReply;
      uploaded?: MessageAudio;
    };

type PendingMedia = { message: MessageType; job: MediaJob };

const without = <T>(record: Record<string, T>, id: string) => {
  if (!(id in record)) return record;
  const { [id]: _removed, ...rest } = record;
  return rest;
};

// Oldest first; the key breaks ties between messages sent in the same millisecond
const byTime = (a: MessageType, b: MessageType) =>
  a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * A room's chat: the latest page, live updates, older pages on demand, and
 * this device's outgoing messages with their delivery state.
 */
export const useChatMessages = (roomId: string | null, uid: string | null) => {
  const { sendMessage, getLatestMessages, getMessagesBefore, listenToMessageChanges, deleteMessage } =
    useFirebase();
  const { showToast } = useAppToast();

  // Keyed by id, so live events, older pages and our own sends can't duplicate
  const [byId, setById] = useState<Record<string, MessageType>>({});
  const [statuses, setStatuses] = useState<Record<string, MessageStatus>>({});
  // Firebase rolls a rejected write back out of the list; keep a copy to retry
  const [failed, setFailed] = useState<Record<string, MessageType & Draft>>({});
  // This device's photos and voice notes until the server has them, shown from
  // the local file meanwhile
  const [media, setMedia] = useState<Record<string, PendingMedia>>({});
  // Deleted while still uploading: the upload finishes, but nothing is sent
  const cancelledRef = useRef(new Set<string>());
  // Ids that arrived after the first page, i.e. while the chat was open
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    let unsubscribe = () => {};

    setById({});
    setNewIds(new Set());
    setLoading(true);

    getLatestMessages(roomId, PAGE_SIZE)
      .then((page) => {
        if (cancelled) return;

        const initialIds = new Set(page.map((m) => m.id));
        setById(Object.fromEntries(page.map((m) => [m.id, m])));
        setHasOlder(page.length === PAGE_SIZE);
        setLoading(false);

        // Starting at the page's oldest message covers deletes/edits on screen
        // and every new message; the page itself is re-reported and deduped
        unsubscribe = listenToMessageChanges(roomId, page[0]?.timestamp ?? null, {
          onAdded: (message) => {
            setById((prev) => ({ ...prev, [message.id]: message }));
            if (!initialIds.has(message.id)) {
              setNewIds((prev) => new Set(prev).add(message.id));
            }
          },
          onChanged: (message) => setById((prev) => ({ ...prev, [message.id]: message })),
          onRemoved: (id) => setById((prev) => without(prev, id)),
        });
      })
      .catch((error) => {
        console.error('Error loading messages:', error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const messages = useMemo(
    () =>
      [
        ...Object.values(byId),
        ...Object.values(failed).filter((m) => !byId[m.id]),
        ...Object.values(media)
          .map((m) => m.message)
          .filter((m) => !byId[m.id]),
      ].sort(byTime),
    [byId, failed, media],
  );

  // id → the local file of a photo or voice note still on its way
  const localUris = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(media).map(([id, { job }]) => [
          id,
          job.kind === 'image' ? job.photo.uri : job.uri,
        ]),
      ) as Record<string, string>,
    [media],
  );

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!roomId || !hasOlder || !oldest || loadingOlderRef.current) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await getMessagesBefore(roomId, oldest, PAGE_SIZE);
      setById((prev) => ({ ...Object.fromEntries(page.map((m) => [m.id, m])), ...prev }));
      setHasOlder(page.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasOlder, messages]);

  // Shows immediately (Firebase applies local writes at once, even offline)
  // and stays 'sending' until the server confirms
  const dispatch = (draft: Draft) => {
    if (!roomId || !uid) return;

    const sentAt = Date.now();
    const { id, delivered } = sendMessage({ roomId, uid, ...draft });
    setStatuses((prev) => ({ ...prev, [id]: 'sending' }));

    delivered
      .then(() => setStatuses((prev) => without(prev, id)))
      .catch((error) => {
        console.error('Error sending message:', error);
        setStatuses((prev) => ({ ...prev, [id]: 'failed' }));
        setFailed((prev) => ({ ...prev, [id]: { id, uid, timestamp: sentAt, ...draft } }));
      });
  };

  /** Returns false when there's nothing to send */
  const send = (text: string, replyingTo?: MessageReply) => {
    const message = text.trim();
    if (!message) return false;

    dispatch({ message, ...(replyingTo && { replyingTo }) });
    return true;
  };

  const dropMedia = (id: string) => {
    setMedia((prev) => without(prev, id));
    setStatuses((prev) => without(prev, id));
  };

  // Shows the photo/voice note at once from the local file, uploads it, then
  // writes the message under the key reserved up front
  const dispatchMedia = async (job: MediaJob) => {
    if (!roomId || !uid) return;

    const id = reserveMessageId(roomId);
    const placeholder: MessageType = {
      id,
      uid,
      timestamp: Date.now(),
      message: job.kind === 'image' ? job.caption : '',
      ...(job.replyingTo && { replyingTo: job.replyingTo }),
      ...(job.kind === 'image'
        ? { image: { url: '', width: job.photo.width, height: job.photo.height, path: '' } }
        : { audio: { url: '', durationMs: job.durationMs, path: '' } }),
    };
    setMedia((prev) => ({ ...prev, [id]: { message: placeholder, job } }));
    setStatuses((prev) => ({ ...prev, [id]: 'sending' }));
    // New from the start, so the stored copy replacing it doesn't animate in again
    setNewIds((prev) => new Set(prev).add(id));

    let uploaded: MessageImage | MessageAudio | undefined = job.uploaded;
    try {
      if (!uploaded) {
        uploaded =
          job.kind === 'image'
            ? await uploadChatImage(roomId, job.photo)
            : await uploadVoiceNote(roomId, id, job.uri, job.durationMs);
        const done = { ...job, uploaded } as MediaJob;
        setMedia((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], job: done } } : prev));
      }

      if (cancelledRef.current.has(id)) {
        cancelledRef.current.delete(id);
        await deleteChatMedia(
          roomId,
          job.kind === 'image'
            ? { image: uploaded as MessageImage }
            : { audio: uploaded as MessageAudio },
        );
        return;
      }

      await writeMediaMessage({
        roomId,
        messageId: id,
        uid,
        message: job.kind === 'image' ? job.caption : '',
        replyingTo: job.replyingTo,
        ...(job.kind === 'image'
          ? { image: uploaded as MessageImage }
          : { audio: uploaded as MessageAudio }),
      });
      dropMedia(id);
    } catch (error) {
      if (cancelledRef.current.delete(id)) return;
      console.error('Error sending media message:', error);
      setStatuses((prev) => (prev[id] ? { ...prev, [id]: 'failed' } : prev));
    }
  };

  const sendImage = (photo: PickedPhoto, caption = '', replyingTo?: MessageReply) =>
    dispatchMedia({ kind: 'image', photo, caption: caption.trim(), replyingTo });

  const sendVoiceNote = (uri: string, durationMs: number, replyingTo?: MessageReply) =>
    dispatchMedia({ kind: 'audio', uri, durationMs, replyingTo });

  const retry = (id: string) => {
    const pending = media[id];
    if (pending) {
      dropMedia(id);
      dispatchMedia(pending.job);
      return;
    }

    const message = failed[id];
    if (!message) return;

    setFailed((prev) => without(prev, id));
    setStatuses((prev) => without(prev, id));
    dispatch({ message: message.message, replyingTo: message.replyingTo });
  };

  /** Saves new text for one of your messages; false when there's nothing to save */
  const edit = (id: string, text: string) => {
    const message = text.trim();
    if (!roomId || !message) return false;

    // Older pages sit outside the live query, so show the edit here too
    setById((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], message, editedAt: Date.now() } } : prev,
    );
    editMessageText(roomId, id, message).catch((error) => {
      console.error('Error editing message:', error);
      showToast({
        title: "Couldn't edit the message",
        description: 'Please check your connection and try again.',
        status: 'error',
      });
    });
    return true;
  };

  const remove = async (id: string) => {
    // Never reached the server, so there's nothing to delete there
    if (failed[id]) {
      setFailed((prev) => without(prev, id));
      setStatuses((prev) => without(prev, id));
      return;
    }

    const pending = media[id];
    if (pending && !byId[id]) {
      if (statuses[id] === 'failed') {
        // The file may be up even though the message never was
        const { job } = pending;
        if (roomId && job.uploaded) {
          deleteChatMedia(
            roomId,
            job.kind === 'image' ? { image: job.uploaded } : { audio: job.uploaded },
          );
        }
      } else {
        // Still uploading: let it finish, then throw the file away
        cancelledRef.current.add(id);
      }
      dropMedia(id);
      return;
    }
    if (!roomId) return;

    const message = byId[id];
    try {
      await deleteMessage(roomId, id);
      // Older pages sit outside the live query, so their delete event never comes
      setById((prev) => without(prev, id));
      if (pending) dropMedia(id);
      if (message?.uid === uid && (message.image || message.audio)) {
        deleteChatMedia(roomId, message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast({
        title: "Couldn't delete the message",
        description: 'Please check your connection and try again.',
        status: 'error',
      });
      throw error;
    }
  };

  return {
    messages,
    statuses,
    newIds,
    loading,
    loadingOlder,
    hasOlder,
    loadOlder,
    send,
    sendImage,
    sendVoiceNote,
    localUris,
    retry,
    edit,
    remove,
  };
};
