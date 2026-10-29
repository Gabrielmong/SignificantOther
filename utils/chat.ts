import { MessageAttachment, MessageType } from '../types';

const ATTACHMENT_NOUNS: Record<MessageAttachment['kind'], string> = {
  countdown: 'countdown',
  wishlist: 'wish',
  favorite: 'favorite',
  place: 'place',
  milestone: 'milestone',
  journal: 'journal entry',
};

// Where a shared item's card leads. Built here from the kind and id, never
// taken from the message: the message comes from the database, and a stored
// route could point anywhere (an external URL, a screen with odd params).
// Favorites have no destination: each partner's list is private, so the
// recipient's Favorites screen would show their own list, not the shared item
// (the card already shows it).
const ATTACHMENT_ROUTES: Record<MessageAttachment['kind'], string | null> = {
  countdown: '/(tabs)/Home/Countdowns',
  wishlist: '/(tabs)/Home/Wishlist',
  favorite: null,
  place: '/(tabs)/YouTwo/Places',
  milestone: '/(tabs)/YouTwo/Story',
  journal: '/(tabs)/Home/Journal',
};

// Database keys (push keys, uuids) only; anything else isn't used in a path
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/** The in-app route for a shared item, or null for a kind this version doesn't know */
export const attachmentRoute = (attachment: Pick<MessageAttachment, 'kind' | 'id'>) => {
  const base = ATTACHMENT_ROUTES[attachment.kind];
  if (!base) return null;
  // Journal entries have their own screen; other kinds open their list
  if (attachment.kind === 'journal' && SAFE_ID.test(attachment.id)) {
    return `${base}/${attachment.id}`;
  }
  return base;
};

/**
 * A message as plain text, for reply previews, copying and the options sheet.
 * A message that's only a shared item has no text, so it reads as e.g.
 * "Shared a countdown: Our trip".
 */
export const messagePreview = (
  message: Pick<MessageType, 'message' | 'attachment'> &
    Partial<Pick<MessageType, 'image' | 'audio'>>,
) => {
  if (message.message) return message.message;
  if (message.image) return '📷 Photo';
  if (message.audio) return '🎤 Voice note';
  if (message.attachment) {
    const { kind, title } = message.attachment;
    return `Shared a ${ATTACHMENT_NOUNS[kind]}: ${title}`;
  }
  return '';
};

// Own messages can be edited for this long after sending
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Only plain text messages: photos, voice notes and shared items keep what was sent */
export const isEditableMessage = (message: MessageType, uid: string | null, now = Date.now()) =>
  message.uid === uid &&
  !!message.message &&
  !message.image &&
  !message.audio &&
  !message.attachment &&
  now - message.timestamp < EDIT_WINDOW_MS;

const isToday = (date: Date, now: Date) => date.toDateString() === now.toDateString();

/**
 * A chat day divider: "Today", "Yesterday", a weekday within the last week,
 * else "Mon, Oct 12" (with the year when it isn't this year)
 */
export const dayLabel = (timestamp: number, now = new Date()) => {
  const date = new Date(timestamp);
  if (isToday(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isToday(date, yesterday)) return 'Yesterday';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sixDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
  if (timestamp >= sixDaysAgo && timestamp < startOfToday) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
};

export const timeLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// http(s) only: message text comes from the partner's phone, and any other
// scheme (intent:, tel:, app deep links…) could do more than open a page
const LINK_PATTERN = /https?:\/\/[^\s<>"]+/gi;
// Punctuation that ends a sentence rather than the link ("see https://x.com.")
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/;

export const isWebLink = (url: string) => /^https?:\/\/\S+$/i.test(url);

/** Splits text into plain runs and http(s) links, in order */
export const splitLinks = (text: string): { text: string; url?: string }[] => {
  const parts: { text: string; url?: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, '');
    const start = match.index ?? 0;
    if (!isWebLink(url)) continue;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: url, url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
};
