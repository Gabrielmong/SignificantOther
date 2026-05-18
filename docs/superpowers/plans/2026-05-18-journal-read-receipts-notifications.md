# Journal Read Receipts & Opt-in Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in push notifications on journal entry creation and read receipts showing whether a partner has opened an entry.

**Architecture:** Two new fields on `Journal` (`notifyPartner`, `readAt`) drive all behavior — the CF checks `notifyPartner` before sending, the detail screen writes `readAt` on partner open, and the list + detail screens surface the receipt to the author.

**Tech Stack:** React Native (Expo), Firebase Realtime Database, Firebase Cloud Functions v2, TypeScript, lucide-react-native, @gluestack-ui/themed, react-native `Alert`.

---

### Task 1: Extend the Journal type

**Files:**
- Modify: `types/Journal.ts`

- [ ] **Update the Journal type**

Replace the entire file content:

```ts
export type Journal = {
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  notifyPartner: boolean;
  readAt: string | null;
};

export type JournalObject = {
  [id: string]: Journal;
};
```

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: any new errors are only "property missing" complaints in the editor/list/detail files — those are fixed in later tasks.

- [ ] **Commit**

```bash
git add types/Journal.ts
git commit -m "feat: add notifyPartner and readAt fields to Journal type"
```

---

### Task 2: Add markJournalEntryAsRead to Firebase hook

**Files:**
- Modify: `hooks/useFirebase.tsx`

- [ ] **Add markJournalEntryAsRead function**

Find the `deleteEntryInJournal` function (around line 488) and insert the new function directly after it:

```ts
const markJournalEntryAsRead = async (roomId: string, entryId: string) => {
  const entryRef = databaseRef(db, `rooms/${roomId}/journal/${entryId}`);
  await update(entryRef, { readAt: new Date().toISOString() });
};
```

- [ ] **Expose the function in the return object**

Find the `return {` statement near the bottom of `useFirebase` and add `markJournalEntryAsRead` to it alongside the other journal functions.

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no new errors.

- [ ] **Commit**

```bash
git add hooks/useFirebase.tsx
git commit -m "feat: add markJournalEntryAsRead firebase hook"
```

---

### Task 3: Gate the cloud function on notifyPartner

**Files:**
- Modify: `c:\projects\SignificantOtherCF\functions\src\index.ts`

- [ ] **Add early return to onNewJournalEntry**

Find the `onNewJournalEntry` export (around line 419). Inside the handler body, the first line after `const entry = event.data.val();` is a `logger.debug(...)` call. Insert the early-return **after** `const entry = event.data.val();` and **before** `const roomRef = ...`:

```ts
export const onNewJournalEntry = onValueCreated(
  {
    ref: 'rooms/{roomId}/journal/{entryId}',
  },
  (event) => {
    const { roomId } = event.params;
    const entry = event.data.val();
    logger.debug(`New journal entry in room ${roomId}: ${JSON.stringify(entry)}`);

    // Only notify if the author opted in
    if (!entry?.notifyPartner) return Promise.resolve();

    const roomRef = db.ref(`rooms/${roomId}`);
    // ... rest of function unchanged
```

- [ ] **Deploy the function**

```bash
cd c:\projects\SignificantOtherCF\functions
npm run build
cd ..
firebase deploy --only functions:onNewJournalEntry
```

Expected: deployment succeeds, function listed in Firebase console.

- [ ] **Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: gate journal notification on notifyPartner flag"
```

---

### Task 4: Add opt-in Alert in the journal editor

**Files:**
- Modify: `app/(tabs)/Home/Journal/editor.tsx`

- [ ] **Add Alert import and Redux selector**

At the top of the file, add `Alert` to the react-native import and add the Redux import:

```ts
import { Alert, StatusBar, TouchableOpacity, ScrollView, TextInput } from 'react-native';
```

```ts
import { useAppSelector } from '../../../../state';
```

- [ ] **Read partnerName from Redux**

Inside `JournalEditor()`, after the existing hooks, add:

```ts
const { partnerName } = useAppSelector((state) => state.room);
```

- [ ] **Replace the new-entry save block with an Alert-gated version**

Find the `else if (user.roomId) {` branch inside `handleSave` (around line 90). Replace it entirely:

```ts
} else if (user.roomId) {
  Alert.alert(
    'Notify ' + (partnerName || 'your partner') + '?',
    'They will receive a push notification about this entry.',
    [
      {
        text: 'No',
        style: 'cancel',
        onPress: async () => {
          const newEntry: Journal = {
            author: user.displayName || '',
            authorId: user.uid || '',
            title: title.trim(),
            description: description.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyPartner: false,
            readAt: null,
          };
          await createEntryInJournal(user.roomId!, newEntry);
          showToast({ title: 'Success', description: 'Entry created', status: 'success' });
          router.back();
        },
      },
      {
        text: 'Yes',
        onPress: async () => {
          const newEntry: Journal = {
            author: user.displayName || '',
            authorId: user.uid || '',
            title: title.trim(),
            description: description.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyPartner: true,
            readAt: null,
          };
          await createEntryInJournal(user.roomId!, newEntry);
          showToast({ title: 'Success', description: 'Entry created', status: 'success' });
          router.back();
        },
      },
    ],
  );
}
```

Also update the edit-entry block (the `if (params.id && user.roomId)` branch) to include the two new fields so it doesn't wipe them on update. Find the `updatedEntry` object and add the fields that should be preserved — since edit doesn't change these, keep them as-is by passing the loaded values or omitting them from the partial update. The existing `updateEntryInJournal` uses Firebase `update()` which merges, so just don't include `notifyPartner` and `readAt` in the update payload to avoid overwriting them:

```ts
const updatedEntry = {
  author: user.displayName || '',
  authorId: user.uid || '',
  title: title.trim(),
  description: description.trim(),
  updatedAt: new Date().toISOString(),
};
```

(Remove `createdAt: ''` from the existing object too — it was being overwritten incorrectly.)

- [ ] **Move setLoading(false) into Alert callbacks**

The `finally { setLoading(false); }` block fires immediately when using `Alert` (Alert is non-blocking). Move `setLoading(false)` into each Alert callback, at the end of each `onPress`. Remove the `finally` block from the new-entry branch.

The updated `handleSave` for the new-entry path:

```ts
const handleSave = async () => {
  if (!title.trim() || !description.trim()) {
    showToast({
      title: 'Incomplete',
      description: 'Please fill in both title and description',
      status: 'warning',
    });
    return;
  }

  setLoading(true);

  try {
    if (params.id && user.roomId) {
      const updatedEntry = {
        author: user.displayName || '',
        authorId: user.uid || '',
        title: title.trim(),
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      };
      await updateEntryInJournal(user.roomId, String(params.id), updatedEntry as Journal);
      showToast({ title: 'Success', description: 'Entry updated', status: 'success' });
      setLoading(false);
      router.back();
    } else if (user.roomId) {
      const roomId = user.roomId;
      setLoading(false);
      Alert.alert(
        'Notify ' + (partnerName || 'your partner') + '?',
        'They will receive a push notification about this entry.',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: async () => {
              const newEntry: Journal = {
                author: user.displayName || '',
                authorId: user.uid || '',
                title: title.trim(),
                description: description.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                notifyPartner: false,
                readAt: null,
              };
              await createEntryInJournal(roomId, newEntry);
              showToast({ title: 'Success', description: 'Entry created', status: 'success' });
              router.back();
            },
          },
          {
            text: 'Yes',
            onPress: async () => {
              const newEntry: Journal = {
                author: user.displayName || '',
                authorId: user.uid || '',
                title: title.trim(),
                description: description.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                notifyPartner: true,
                readAt: null,
              };
              await createEntryInJournal(roomId, newEntry);
              showToast({ title: 'Success', description: 'Entry created', status: 'success' });
              router.back();
            },
          },
        ],
      );
    }
  } catch (error) {
    showToast({ title: 'Error', description: 'Failed to save entry', status: 'error' });
    setLoading(false);
  }
};
```

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Manual test: new entry shows Alert**

Start the app. Open Journal → New Entry, fill in a title and description, tap Save. Verify the Alert appears asking "Notify [partnerName]?". Tap "No" — entry saves without notification. Tap "Yes" — entry saves and CF triggers notification.

- [ ] **Commit**

```bash
git add app/"(tabs)"/Home/Journal/editor.tsx
git commit -m "feat: prompt user to notify partner when saving new journal entry"
```

---

### Task 5: Show Seen indicator on journal list

**Files:**
- Modify: `app/(tabs)/Home/Journal/index.tsx`

- [ ] **Add readAt to destructured map fields**

Find the `.map(({ id, authorId, title, description, author, createdAt }) =>` line (around line 160). Add `readAt`:

```ts
journal.map(({ id, authorId, title, description, author, createdAt, readAt }) => {
```

- [ ] **Add Seen badge to the entry card footer**

Inside the map, `isSelf` is already computed. After the existing author badge `HStack` (the one with `User` icon, around line 236), add the Seen badge conditionally:

```ts
{isSelf && readAt && (
  <HStack
    style={{
      alignItems: 'center',
      gap: theme.spacing[1],
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: theme.spacing[2],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.radii.full,
    }}>
    <Eye size={12} color="#FFFFFF" />
    <Text
      style={{
        fontSize: theme.fontSize.xs,
        color: '#FFFFFF',
        fontWeight: theme.fontWeight.semibold,
      }}>
      Seen
    </Text>
  </HStack>
)}
```

- [ ] **Add Eye to the lucide import**

The current import is: `import { ArrowLeft, Plus, Calendar, User, ChevronRight } from 'lucide-react-native';`

Add `Eye`: `import { ArrowLeft, Plus, Calendar, User, ChevronRight, Eye } from 'lucide-react-native';`

- [ ] **Manual test**

Open an entry as the partner. Return to the list as the author. Verify "Seen" badge appears on that card.

- [ ] **Commit**

```bash
git add app/"(tabs)"/Home/Journal/index.tsx
git commit -m "feat: show Seen badge on journal entries viewed by partner"
```

---

### Task 6: Mark entry as read and show receipt on detail screen

**Files:**
- Modify: `app/(tabs)/Home/Journal/[id].tsx`

- [ ] **Add markJournalEntryAsRead to the Firebase destructure**

Find: `const { getEntryInJournal, deleteEntryInJournal } = useFirebase();`

Replace with:

```ts
const { getEntryInJournal, deleteEntryInJournal, markJournalEntryAsRead } = useFirebase();
```

- [ ] **Mark entry as read when partner opens it**

Find the `loadData` function. After `setNote(data)` and before `setLoading(false)`, add the read-marking logic:

```ts
const loadData = async () => {
  if (params.id && user.roomId) {
    getEntryInJournal(user.roomId, String(params.id)).then((data) => {
      setNote(data);
      // Mark as read if we're the partner (not the author) and it hasn't been read yet
      if (data && data.authorId !== user.uid && !data.readAt) {
        markJournalEntryAsRead(user.roomId!, String(params.id)).catch(() => {
          // Fire-and-forget — read receipt failure is silent
        });
      }
      setLoading(false);
    });
  }
};
```

- [ ] **Add Eye to the lucide import**

Find: `import { ArrowLeft, Edit, Trash, Calendar, User, Clock } from 'lucide-react-native';`

Add `Eye`: `import { ArrowLeft, Edit, Trash, Calendar, User, Clock, Eye } from 'lucide-react-native';`

- [ ] **Show Seen [datetime] in metadata card for the author**

Find the metadata card `<Box>` (around line 222). After the `{isUpdated && ...}` block, add:

```ts
{isSelf && note?.readAt && (
  <HStack style={{ alignItems: 'center', gap: theme.spacing[2] }}>
    <Eye size={16} color={theme.colors.textSecondary} />
    <Text
      style={{
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
      }}>
      Seen: {formatDateTime(note.readAt)}
    </Text>
  </HStack>
)}
```

- [ ] **Manual test**

Open an entry as the partner. Verify `readAt` is written to Firebase (check the database console). Open the same entry as the author. Verify "Seen: [date]" appears in the metadata card.

- [ ] **Commit**

```bash
git add "app/(tabs)/Home/Journal/[id].tsx"
git commit -m "feat: mark journal entry read on partner open, show receipt to author"
```
