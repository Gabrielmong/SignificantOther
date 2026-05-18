# Whiteboard Snapshots (Saveable Shared Board)

**Date:** 2026-05-18  
**Status:** Approved

---

## Overview

Allow both users to save named snapshots of the current shared board at any time. Snapshots are stored separately from the live drawing, are append-only (no delete or restore), and can be browsed in a gallery inside the whiteboard screen.

The live board at `rooms/{roomId}/whiteboard` is unchanged by this feature.

---

## Data Model

New Firebase Realtime Database path: `rooms/{roomId}/whiteboardSnapshots/{snapshotId}`

```ts
interface WhiteboardSnapshot {
  paths: PathData[];     // copy of the board's paths at save time
  canvasColor: string;   // background color at save time
  savedBy: string;       // userId of the user who pressed Save
  savedAt: string;       // ISO 8601 timestamp
}
```

`snapshotId` is a Firebase push key (auto-generated). Snapshots are never mutated after creation.

`PathData` is the existing interface from `components/Whiteboard/Whiteboard.tsx`:
```ts
interface PathData {
  path: string[];
  color: string;
  width: number;
}
```

---

## UI Changes

### Whiteboard Toolbar (`app/(tabs)/Home/WhiteBoard.tsx`)

Two new buttons added to the existing toolbar (alongside undo, eraser, color picker, etc.):

1. **Save button** (bookmark/camera icon) — writes a snapshot of the current `storedPaths` and `storedCanvasColor` to Firebase. On success, shows a brief toast: "Board saved". On failure, shows an error toast.

2. **History button** (clock icon) — opens the snapshot gallery bottom sheet modal.

### Snapshot Gallery Modal

A bottom sheet or standard Modal rendered inside `WhiteBoard.tsx`:

- **Header:** "Saved boards"
- **Body:** Vertically scrollable list of snapshots, sorted newest-first.
- **Each row:**
  - Mini SVG preview (same rendering logic as `WhiteBoardPreview`, scaled down)
  - Formatted date and time (e.g. "May 18, 2026 · 3:42 PM")
  - Saved-by label ("You" if `savedBy === currentUserId`, otherwise partner's display name)
- **Tap a row** → opens a full-screen read-only view of that snapshot (modal overlay, close button in top-right).
- **Empty state:** "No saved boards yet" message.

### Full-Screen Snapshot Viewer

A modal that fills the screen:

- Renders the snapshot's paths on a canvas matching the snapshot's `canvasColor`.
- Close (X) button dismisses back to the gallery.
- Read-only — no drawing or interaction.
- Shows saved-by and savedAt in a small footer bar.

---

## Firebase Hook Changes (`hooks/useFirebase.tsx`)

### New: `saveWhiteboardSnapshot(roomId: string, snapshot: WhiteboardSnapshot): Promise<void>`

Calls Firebase `push()` on `rooms/{roomId}/whiteboardSnapshots` with the snapshot object. The push key becomes the `snapshotId`.

### New: `getWhiteboardSnapshots(roomId: string): Promise<WhiteboardSnapshot[]>`

One-time `get()` on `rooms/{roomId}/whiteboardSnapshots`. Returns snapshots sorted by `savedAt` descending (newest first). Returns empty array if none exist.

No real-time listener needed — snapshots are loaded when the gallery modal opens.

---

## State Management (`hooks/useWhiteboard.tsx`)

Add to the existing hook:

- `snapshots: WhiteboardSnapshot[]` — list loaded when gallery opens
- `snapshotsLoading: boolean`
- `selectedSnapshot: WhiteboardSnapshot | null` — drives the full-screen viewer
- `handleSaveSnapshot()` — reads current `storedPaths` + `storedCanvasColor`, calls `saveWhiteboardSnapshot`, shows toast
- `handleOpenGallery()` — sets gallery visible, calls `getWhiteboardSnapshots` to populate list
- `handleSelectSnapshot(snapshot)` — sets `selectedSnapshot`
- `handleCloseSnapshot()` — clears `selectedSnapshot`
- `handleCloseGallery()` — closes gallery, clears `snapshots`

---

## Error Handling

- Save failure shows an error toast; the live board is unaffected.
- Gallery load failure shows an inline error message in the modal.
- Full-screen viewer renders nothing gracefully if a snapshot has empty paths.

---

## Out of Scope

- Delete or restore snapshots (not requested).
- Auto-save on interval (not requested).
- Snapshot count limit / pruning.
- Cloud function trigger on snapshot creation.
