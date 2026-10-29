import {
  getDatabase,
  push,
  ref as databaseRef,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

import { firebaseConfig } from '../config';
import { MessageAudio, MessageImage, MessageReply, MessageType } from '../types';
import { ensureFirebaseApp } from './firebaseApp';
import { deletePhoto, PickedPhoto, uploadPhotoWithThumb } from './photoUpload';

// Photos and voice notes in the chat: their Storage files and the messages
// that carry them. Lives outside useFirebase so the media flow (reserve a key,
// upload, then write) stays in one place.

const db = () => {
  ensureFirebaseApp();
  return getDatabase();
};

const messageRef = (roomId: string, messageId: string) =>
  databaseRef(db(), `rooms/${roomId}/messages/${messageId}`);

// Download URLs getDownloadURL() gives for this app's bucket. Message fields are
// written by the partner's phone, so anything else (another host, a file://
// path, a tracking pixel) is never loaded.
const STORAGE_URL_PREFIXES = [
  `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/`,
];

export const isAppStorageUrl = (url: unknown): url is string =>
  typeof url === 'string' && STORAGE_URL_PREFIXES.some((prefix) => url.startsWith(prefix));

// Database keys only, so a stored path can't climb out of the room's folder
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+(\.[a-z0-9]+)?$/;
const chatFolder = (roomId: string) => `chat/${roomId}`;
const isRoomChatPath = (roomId: string, path: unknown): path is string => {
  if (typeof path !== 'string') return false;
  const prefix = `${chatFolder(roomId)}/`;
  return path.startsWith(prefix) && SAFE_SEGMENT.test(path.slice(prefix.length));
};

/** A new message key, reserved locally (nothing is written) so files can be named after it */
export const reserveMessageId = (roomId: string) =>
  push(databaseRef(db(), `rooms/${roomId}/messages`)).key as string;

/** Resizes and uploads a picked photo plus a thumbnail into the room's chat folder */
export const uploadChatImage = async (
  roomId: string,
  photo: PickedPhoto,
): Promise<MessageImage> => {
  const uploaded = await uploadPhotoWithThumb(photo, chatFolder(roomId));
  return {
    url: uploaded.url,
    thumbUrl: uploaded.thumbUrl,
    width: uploaded.width,
    height: uploaded.height,
    path: uploaded.path,
    thumbPath: uploaded.thumbPath,
  };
};

/** Uploads a recorded voice note as chat/{roomId}/{messageId}.m4a */
export const uploadVoiceNote = async (
  roomId: string,
  messageId: string,
  uri: string,
  durationMs: number,
): Promise<MessageAudio> => {
  const blob = await (await fetch(uri)).blob();
  const path = `${chatFolder(roomId)}/${messageId}.m4a`;
  const storage = getStorage();
  // Fail within 30s instead of retrying for the default 10 minutes
  storage.maxUploadRetryTime = 30000;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, blob, { contentType: 'audio/mp4' });
  return { url: await getDownloadURL(fileRef), durationMs: Math.round(durationMs), path };
};

/**
 * Writes a photo or voice note message under its reserved key. Like
 * sendMessage, it shows locally at once and settles when the server has it.
 */
export const writeMediaMessage = ({
  roomId,
  messageId,
  uid,
  message,
  replyingTo,
  image,
  audio,
}: {
  roomId: string;
  messageId: string;
  uid: string;
  message: string;
  replyingTo?: MessageReply;
  image?: MessageImage;
  audio?: MessageAudio;
}) =>
  set(messageRef(roomId, messageId), {
    message,
    uid,
    timestamp: serverTimestamp(),
    ...(replyingTo && { replyingTo }),
    ...(image && { image }),
    ...(audio && { audio }),
  });

/** Replaces a message's text and stamps it as edited */
export const editMessageText = (roomId: string, messageId: string, message: string) =>
  update(messageRef(roomId, messageId), { message, editedAt: serverTimestamp() });

/**
 * Removes a deleted message's files. Only paths inside this room's chat folder
 * are touched, whatever the message claims. Best effort: a leftover file is
 * only storage, so failures are logged, not thrown.
 */
export const deleteChatMedia = async (
  roomId: string,
  message: Pick<MessageType, 'image' | 'audio'>,
) => {
  const paths = [message.image?.path, message.image?.thumbPath, message.audio?.path].filter(
    (path): path is string => isRoomChatPath(roomId, path),
  );
  await Promise.all(
    paths.map((path) =>
      deletePhoto(path).catch((error) => console.error('Error deleting chat file:', error)),
    ),
  );
};
