# Journal Read Receipts & Opt-in Notifications

**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Two related features for the journal:

1. **Opt-in partner notification** — when saving a new journal entry the author is asked whether to notify their partner. The notification only fires if they say yes.
2. **Read receipts** — the author can see whether their partner has opened an entry, shown both in the journal list and on the detail view.

---

## Data Model

Two fields are added to the existing `Journal` type in `types/Journal.ts`:

```ts
export type Journal = {
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  notifyPartner: boolean;   // NEW — controls whether CF sends push notification
  readAt: string | null;    // NEW — ISO timestamp written by partner on first open; null until read
};
```

Firebase path: `rooms/{roomId}/journal/{entryId}` — no structural change, just new fields on existing nodes.

---

## UI Changes

### Editor (`app/(tabs)/Home/Journal/editor.tsx`)

- Applies to **new entries only** (edit mode skips the prompt).
- After the user taps Save and the entry is validated, show a React Native `Alert` before calling `createEntryInJournal`:

  > **"Notify [partnerName]?"**  
  > "Your partner will receive a push notification about this entry."  
  > Buttons: **Yes** / **No**

- "Yes" → `notifyPartner: true`; "No" → `notifyPartner: false`. Entry saves regardless.
- `partnerName` is available from the Redux room slice.

### Journal List (`app/(tabs)/Home/Journal/index.tsx`)

- For entries where `authorId === currentUserId` and `readAt` is not null, show a small "Seen" label (or checkmark icon) on the entry card.
- Entries authored by the partner, or not yet read, show nothing extra.

### Journal Detail (`app/(tabs)/Home/Journal/[id].tsx`)

- **Partner view (authorId !== currentUserId):** On component mount, if `readAt` is null, call `markJournalEntryAsRead(roomId, entryId)` which writes the current ISO timestamp to `readAt`. This is a fire-and-forget update — no loading state needed.
- **Author view (authorId === currentUserId):** If `readAt` is not null, display "Seen [formatted date/time]" in the metadata card alongside the existing created/updated timestamps.

---

## Firebase Hook Changes (`hooks/useFirebase.tsx`)

### `createEntryInJournal`
Accept and persist the `notifyPartner` boolean. The `readAt` field is written as `null` on creation.

### New: `markJournalEntryAsRead(roomId: string, entryId: string)`
Sets `readAt` to `new Date().toISOString()` on `rooms/{roomId}/journal/{entryId}`. Only called when the opening user is not the author and `readAt` is currently null (to avoid overwriting a prior read time).

---

## Cloud Function (`SignificantOtherCF/functions/src/index.ts`)

### `onNewJournalEntry` — one-line change

Add an early return at the top of the handler body:

```ts
if (!event.data.val()?.notifyPartner) return null;
```

Everything else (partner FCM token lookup, `sendEachForMulticast`, error logging) is unchanged.

---

## Error Handling

- `markJournalEntryAsRead` failures are silent (fire-and-forget) — a failed read receipt write does not disrupt the user's reading experience.
- The Save alert is non-blocking; if `createEntryInJournal` fails, the existing error handling in the editor applies.
- The CF early-return means no notification is sent if `notifyPartner` is missing/false (safe default).

---

## Out of Scope

- Notifications for **edited** entries (not requested).
- Read receipts for the partner's own entries (they can see their partner's read status, not their own).
- Batch/retroactive read marking.
