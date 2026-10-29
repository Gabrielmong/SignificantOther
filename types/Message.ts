export interface MessageReply {
  // Key of the replied-to message. Older replies stored its timestamp, which
  // was also its key back then, so both forms resolve to the same message.
  messageId: string | number;
  message: string;
  uid: string;
}

// Something from elsewhere in the app shared into the chat as a tappable card.
// A snapshot: the card keeps showing these values even if the item changes.
export interface MessageAttachment {
  kind: 'countdown' | 'wishlist' | 'favorite' | 'place' | 'milestone' | 'journal';
  id: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  // Unused when opening the card (the app derives the route from kind and id,
  // see attachmentRoute); kept for messages that already carry it
  route?: string;
}

// A photo sent in the chat, uploaded to Storage under chat/{roomId}/ before the
// message is written; the paths let the sender delete the files with it
export interface MessageImage {
  url: string;
  thumbUrl?: string;
  width: number;
  height: number;
  path: string;
  thumbPath?: string;
}

// A recorded voice note (m4a), uploaded to chat/{roomId}/{messageId}.m4a
export interface MessageAudio {
  url: string;
  durationMs: number;
  path: string;
}

export interface MessageType {
  id: string; // Database key: a push() key, or a timestamp on older messages
  uid: string;
  message: string; // May be '' for just an attachment, photo or voice note
  timestamp: number;
  replyingTo?: MessageReply;
  reactions?: Record<string, string>; // uid → emoji
  attachment?: MessageAttachment;
  image?: MessageImage;
  audio?: MessageAudio;
  editedAt?: number; // Server time of the last edit; absent if never edited
}

// Delivery state of this device's own messages; absent once the server has it.
// Photos and voice notes stay 'sending' while their file uploads.
export type MessageStatus = 'sending' | 'failed';
