# Whiteboard Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow either user to save named snapshots of the shared board at any time, and browse them in a gallery inside the whiteboard screen.

**Architecture:** Snapshots are append-only writes to `rooms/{roomId}/whiteboardSnapshots/{snapshotId}` (Firebase push keys). The whiteboard screen gains a Save toolbar button and a History button that opens a gallery modal. A second modal shows the selected snapshot full-screen read-only using the same SVG rendering as `WhiteBoardPreview`. All snapshot state lives directly in `WhiteBoard.tsx` (consistent with how the screen already calls Firebase functions directly).

**Tech Stack:** React Native, Firebase Realtime Database (`push`), TypeScript, react-native-svg (`Svg`, `Path`), @gluestack-ui/themed, lucide-react-native.

---

### Task 1: Create WhiteboardSnapshot type

**Files:**
- Create: `types/WhiteboardSnapshot.ts`
- Modify: `types/index.ts`

- [ ] **Create the type file**

```ts
import { PathData } from '../components';

export type WhiteboardSnapshot = {
  paths: PathData[];
  canvasColor: string;
  savedBy: string;
  savedAt: string;
};
```

- [ ] **Export from types/index.ts**

Add to `types/index.ts`:

```ts
export * from './WhiteboardSnapshot';
```

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Commit**

```bash
git add types/WhiteboardSnapshot.ts types/index.ts
git commit -m "feat: add WhiteboardSnapshot type"
```

---

### Task 2: Add snapshot functions to Firebase hook

**Files:**
- Modify: `hooks/useFirebase.tsx`

- [ ] **Add push to firebase/database imports**

Find the import line:
```ts
import {
  getDatabase,
  ref as databaseRef,
  onValue,
  update,
  get,
  child,
  remove,
} from 'firebase/database';
```

Add `push`:
```ts
import {
  getDatabase,
  ref as databaseRef,
  onValue,
  update,
  get,
  child,
  remove,
  push,
} from 'firebase/database';
```

- [ ] **Add WhiteboardSnapshot to the type imports**

Find: `import { Journal, JournalObject } from '../types/Journal';`

Add below it:
```ts
import { WhiteboardSnapshot } from '../types/WhiteboardSnapshot';
```

- [ ] **Add saveWhiteboardSnapshot function**

Insert after the `getWhiteboard` function (around line 181):

```ts
const saveWhiteboardSnapshot = async (roomId: string, snapshot: WhiteboardSnapshot) => {
  const snapshotsRef = databaseRef(db, `rooms/${roomId}/whiteboardSnapshots`);
  await push(snapshotsRef, snapshot);
};
```

- [ ] **Add getWhiteboardSnapshots function**

Insert directly after `saveWhiteboardSnapshot`:

```ts
const getWhiteboardSnapshots = async (roomId: string): Promise<WhiteboardSnapshot[]> => {
  const snapshotsRef = databaseRef(db, `rooms/${roomId}/whiteboardSnapshots`);
  const snapshot = await get(snapshotsRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val() as Record<string, WhiteboardSnapshot>;
  return Object.values(data).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
};
```

- [ ] **Expose both functions in the return object**

Find the `return {` at the bottom of `useFirebase` and add both functions to it.

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Commit**

```bash
git add hooks/useFirebase.tsx
git commit -m "feat: add saveWhiteboardSnapshot and getWhiteboardSnapshots firebase hooks"
```

---

### Task 3: Update WhiteBoard screen — Save button + gallery modal

**Files:**
- Modify: `app/(tabs)/Home/WhiteBoard.tsx`

This task adds the Save button, the History button, and the full gallery + viewer modals.

- [ ] **Update imports**

Replace the current lucide import:
```ts
import { ArrowLeft, Copy, Edit, Eye } from 'lucide-react-native';
```
With:
```ts
import { ArrowLeft, Bookmark, Clock, Edit, Eye, X } from 'lucide-react-native';
```

Add `Path` and `Svg` from react-native-svg (for the snapshot viewer):
```ts
import { Path, Svg } from 'react-native-svg';
```

Add `ScrollView` from react-native (the gluestack one already imported is fine for the gallery list, but we need the native one for performance — use gluestack's `ScrollView` already in scope):

Add `WhiteboardSnapshot` type import:
```ts
import { WhiteboardSnapshot } from '../../../types';
```

Add `useAuth` is already imported. Add `useAppSelector`:
```ts
import { useAppSelector } from '../../../state';
```

- [ ] **Add snapshot state variables**

Inside `WhiteBoard()`, after the existing `useState` declarations, add:

```ts
const [snapshots, setSnapshots] = useState<WhiteboardSnapshot[]>([]);
const [snapshotsLoading, setSnapshotsLoading] = useState(false);
const [galleryOpen, setGalleryOpen] = useState(false);
const [selectedSnapshot, setSelectedSnapshot] = useState<WhiteboardSnapshot | null>(null);
```

- [ ] **Add snapshot Firebase functions to the destructure**

Find: `const { listenToWhiteboardEvents, updateWhiteboard, getWhiteboard, updateWhiteBoardName } = useFirebase();`

Replace with:

```ts
const {
  listenToWhiteboardEvents,
  updateWhiteboard,
  getWhiteboard,
  updateWhiteBoardName,
  saveWhiteboardSnapshot,
  getWhiteboardSnapshots,
} = useFirebase();
```

- [ ] **Add partnerName from Redux**

After the existing `const [roomId, ...]` line, add:

```ts
const { partnerName } = useAppSelector((state) => state.room);
```

- [ ] **Add handleSaveSnapshot handler**

After the existing `canvasCallback` function, add:

```ts
const handleSaveSnapshot = async () => {
  if (!roomId || !user.uid) return;
  const snapshot: WhiteboardSnapshot = {
    paths: storedPaths,
    canvasColor: storedCanvasColor,
    savedBy: user.uid,
    savedAt: new Date().toISOString(),
  };
  try {
    await saveWhiteboardSnapshot(roomId, snapshot);
    // Brief visual confirmation via the existing toast pattern is not available here,
    // so show an Alert
    Alert.alert('Saved', 'Board snapshot saved.');
  } catch {
    Alert.alert('Error', 'Failed to save snapshot.');
  }
};
```

Add `Alert` to the react-native import: the file currently doesn't import from react-native. Add:
```ts
import { Alert } from 'react-native';
```

- [ ] **Add handleOpenGallery handler**

```ts
const handleOpenGallery = async () => {
  if (!roomId) return;
  setGalleryOpen(true);
  setSnapshotsLoading(true);
  try {
    const data = await getWhiteboardSnapshots(roomId);
    setSnapshots(data);
  } catch {
    setSnapshots([]);
  } finally {
    setSnapshotsLoading(false);
  }
};
```

- [ ] **Add Save and History buttons to the toolbar**

Find the header `<Box>` that contains the `<IconButton icon={ArrowLeft} .../>` and the `boardName` row (around line 115). In the right side of that row (where `Edit` and `Eye` buttons are), add the two new buttons:

```tsx
<IconButton icon={Bookmark} onPress={handleSaveSnapshot} variant="ghost" size={15} />
<IconButton icon={Clock} onPress={handleOpenGallery} variant="ghost" size={15} />
<IconButton icon={Edit} onPress={handleEditWhiteboardName} variant="ghost" size={15} />
<IconButton icon={Eye} onPress={toggleTools} variant="ghost" size={15} />
```

- [ ] **Add helper: format snapshot date**

After `handleOpenGallery`, add:

```ts
const formatSnapshotDate = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
```

- [ ] **Add Gallery Modal**

Before the closing `</View>` of the main screen (after the existing `editNameModal` modal), add the gallery modal:

```tsx
{/* Snapshot Gallery Modal */}
<Modal isOpen={galleryOpen}>
  <ModalBackdrop onPress={() => setGalleryOpen(false)} />
  <ModalContent
    style={{
      maxHeight: '80%',
      width: '90%',
    }}>
    <ModalCloseButton onPress={() => setGalleryOpen(false)} />
    <ModalHeader>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Saved boards</Text>
    </ModalHeader>

    <Box style={{ padding: 16, flex: 1 }}>
      {snapshotsLoading ? (
        <Box style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Spinner />
        </Box>
      ) : snapshots.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', paddingVertical: 24 }}>
          No saved boards yet
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 480 }}>
          {snapshots.map((snap, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedSnapshot(snap)}
              style={{
                marginBottom: 16,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: snap.canvasColor,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
              <Svg height={120} width="100%">
                {snap.paths?.map((p, pi) => (
                  <Path
                    key={pi}
                    d={p.path.join(' ')}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.width}
                  />
                ))}
              </Svg>
              <Box
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: 8,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                }}>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  {formatSnapshotDate(snap.savedAt)}
                </Text>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  {snap.savedBy === user.uid ? 'You' : partnerName || 'Partner'}
                </Text>
              </Box>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Box>
  </ModalContent>
</Modal>
```

Add `TouchableOpacity` to the react-native import (add alongside `Alert`):
```ts
import { Alert, TouchableOpacity } from 'react-native';
```

- [ ] **Add Full-Screen Snapshot Viewer Modal**

After the gallery modal, add:

```tsx
{/* Full-Screen Snapshot Viewer */}
<Modal isOpen={!!selectedSnapshot}>
  <ModalBackdrop onPress={() => setSelectedSnapshot(null)} />
  <ModalContent style={{ width: '95%', maxHeight: '90%' }}>
    <Box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
      }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Snapshot</Text>
      <TouchableOpacity onPress={() => setSelectedSnapshot(null)}>
        <X size={22} color="#555" />
      </TouchableOpacity>
    </Box>

    {selectedSnapshot && (
      <>
        <Svg
          height={400}
          width="100%"
          style={{ backgroundColor: selectedSnapshot.canvasColor }}>
          {selectedSnapshot.paths?.map((p, pi) => (
            <Path
              key={pi}
              d={p.path.join(' ')}
              fill="none"
              stroke={p.color}
              strokeWidth={p.width}
            />
          ))}
        </Svg>
        <Box
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}>
          <Text style={{ fontSize: 12, color: '#555' }}>
            {formatSnapshotDate(selectedSnapshot.savedAt)}
          </Text>
          <Text style={{ fontSize: 12, color: '#555' }}>
            Saved by {selectedSnapshot.savedBy === user.uid ? 'you' : partnerName || 'partner'}
          </Text>
        </Box>
      </>
    )}
  </ModalContent>
</Modal>
```

- [ ] **Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Manual test: save a snapshot**

Start the app. Open the whiteboard, draw something. Tap the Bookmark icon. Verify "Saved" alert appears. Open Firebase console → `rooms/{roomId}/whiteboardSnapshots` — verify the snapshot node was created with correct fields.

- [ ] **Manual test: view gallery**

Tap the Clock icon. Verify the gallery opens and shows the saved snapshot with a mini preview, date, and saved-by label. Tap a snapshot — verify the full-screen viewer opens with the correct drawing. Tap X — verify it closes.

- [ ] **Commit**

```bash
git add "app/(tabs)/Home/WhiteBoard.tsx"
git commit -m "feat: add snapshot save and gallery to whiteboard screen"
```
