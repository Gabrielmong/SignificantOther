# "You Two" Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared photo gallery on the You Two tab. It has single and bulk add with tags, labels, descriptions and a date from the photo, a month-grouped grid you can pinch to resize and filter by tag, a swipeable viewer, and milestone photos mirrored into it.

**Architecture:**
- Pure logic lives in `utils/photos.ts` and is checked with `tsx`: tag normalization, EXIF dates, grouping, zoom steps, and the milestone-to-gallery fields.
- Photos are stored at `rooms/{roomId}/photos/{id}`, each with a full image and a ~400 px thumbnail.
- A `useGallery` hook owns listening, batch upload with retry, edits, deletes, and backfilling milestone entries.
- `useMilestones` keeps a linked `ms-{milestoneId}` gallery entry in step through `update`, which merges, so gallery-side tags and description survive.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, Firebase RTDB and Storage (web SDK), `expo-image-picker` ~17 (multi-select, EXIF), `expo-image-manipulator` (already installed and loaded lazily), `react-native-gesture-handler` and `react-native-reanimated` (installed), AsyncStorage. There is no test runner; pure helpers are checked with `npx tsx` scripts in the git-ignored `.superpowers/checks/`, everything else with `npx tsc --noEmit` plus the device checklist in Task 8.

**Spec:** `docs/superpowers/specs/2026-10-28-you-two-gallery-design.md`

## Global Constraints

- **Data paths:**
  - Photo records: `rooms/{roomId}/photos/{id}`.
  - Storage: `rooms/{roomId}/photos/{photoId}/{uuid}.jpg` and `…/{uuid}_thumb.jpg`.
  - Ids come from `newId()` (existing).
  - The milestone mirror's id is `ms-{milestoneId}`.
- **Image sizes:**
  - Full image ≤ 1600 px on the long edge, JPEG 0.8 (unchanged).
  - Thumbnail ≤ 400 px on the long edge, JPEG 0.7.
- **Tags:**
  - Normalized: trimmed, lowercased, internal whitespace collapsed to a single space; empty means dropped.
  - Stored as `Record<string, true>`.
  - Firebase RTDB keys can't contain `. # $ / [ ]`, so strip those characters during normalization.
- **Dates:**
  - `day` is `"YYYY-MM-DD"`.
  - EXIF `DateTimeOriginal`, then `DateTimeDigitized` (format `"YYYY:MM:DD HH:MM:SS"`).
  - Fall back to today, using `toDay` from `utils/milestones.ts`.
- **Picker:** `allowsMultipleSelection: true`, `selectionLimit: 30`, `exif: true`, `mediaTypes: ['images']`.
- **Zoom:** steps `2 · 3 · 5`, default `3`. At 5 columns, sections are by year; otherwise by month. The choice is saved under the AsyncStorage key `@SignificantOther:galleryColumns`.
- **Strip:** the 8 newest photos by `day`, 70 px thumbnails, "See all {count} ›", placed above "Our story".
- **Route:** `app/(tabs)/YouTwo/Photos.tsx`. Add `'/YouTwo/Photos'` to `TAB_HIDDEN_ROUTES`. Navigate with `router.push('/(tabs)/YouTwo/Photos' as Href)`, the same cast pattern as before.
- **Shared rules:**
  - RTDB rejects `undefined`, so omit optional keys; use `null` only inside `update` to delete a key.
  - Check `isConnected()` before any upload batch; when offline, show the toast "You're offline".
- **Milestone mirrors:**
  - Never deletable from the gallery.
  - Never delete their files from gallery code; the milestone owns them.
- **Type errors:** `npx tsc --noEmit` reports **45 errors** on `main`. Don't add any.
- **Commits:** messages end with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A batch where some uploads fail** (a flaky network mid-batch). Expected: the successes are saved exactly once, and the sheet stays open with only the failures selected and a "Retry" button. Owned by Task 4. Device check in Task 8.
2. **Editing a milestone that has a tagged gallery mirror.** Expected: the tags and description on `ms-{id}` survive, because the mirror is written with `update` and only milestone-owned fields. Pinned in Task 1 (`milestoneMirrorFields` never contains `tags` or `description`) and Task 3.
3. **A tag typed with odd characters or case** ("Trips ", "trips", "a.b"). Expected: one tag `trips`, and `a.b` stored as `ab`, with no RTDB error. Pinned in Task 1.
4. **A photo with no EXIF date, or a malformed one** (screenshots, edited images). Expected: today. Pinned in Task 1.
5. **Deleting the last photo carrying the active tag filter.** Expected: the filter falls back to "All" instead of showing an empty grid. Owned by Task 5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/Photo.ts`, `types/index.ts` | Create, modify | `Photo`, `PhotoObject` |
| `types/Milestone.ts` | Modify | `MilestonePhoto` gains optional `thumbUrl`, `thumbPath`, `width`, `height` |
| `utils/photos.ts`, `utils/index.ts` | Create, modify | Pure gallery logic |
| `services/photoUpload.ts` | Modify | `uploadPhotoWithThumb` |
| `hooks/useFirebase.tsx` | Modify | Photo listen/set/update/delete/get |
| `hooks/useMilestones.tsx` | Modify | Keep the `ms-{id}` mirror in step |
| `hooks/useGallery.tsx`, `hooks/index.ts` | Create, modify | Gallery state and flows |
| `components/TagPicker/`, `components/PhotoAddSheet/`, `components/PhotoGrid/`, `components/PhotoViewer/`, `components/PhotoStrip/` | Create | UI |
| `app/(tabs)/YouTwo/Photos.tsx`, `app/(tabs)/YouTwo/index.tsx`, `constants/index.ts` | Create, modify | Screens and route |

---

### Task 1: Types and pure gallery logic

**Files:**
- Create: `types/Photo.ts`, `utils/photos.ts`
- Modify: `types/index.ts`, `types/Milestone.ts`, `utils/index.ts`
- Check: `.superpowers/checks/photos.check.ts`

**Interfaces:**
- Produces (`types/Photo.ts`):
  - `interface Photo`, exactly as in the spec §1, with optional `thumbUrl`, `thumbPath`, `width`, `height`, `label`, `description`, `tags`, `milestoneId`, `updatedAt`
  - `interface PhotoObject { [id: string]: Photo }`
- Produces (`types/Milestone.ts`): `MilestonePhoto` gains `thumbUrl?`, `thumbPath?`, `width?`, `height?`.
- Produces (`utils/photos.ts`). These are pure functions: no React Native imports, and `today` is passed in.
  - `normalizeTag(raw: string): string`: `''` means invalid.
  - `tagsFromList(list: string[]): Record<string, true> | undefined`: normalizes, drops empties, and returns `undefined` when empty.
  - `exifDay(exif: Record<string, unknown> | null | undefined, today: Date): string`
  - `sortPhotos(photos: Photo[]): Photo[]`: `day` descending, then `createdAt` descending.
  - `type Section = { key: string; title: string; photos: Photo[] }`
  - `groupPhotos(photos: Photo[], by: 'month' | 'year'): Section[]`. Input is already sorted. Keys are `"2025-06"` / `"2025"`. Titles are `"June 2025"` / `"2025"`, using `toLocaleDateString('en-US', { month: 'long', year: 'numeric' })`.
  - `ZOOM_STEPS = [2, 3, 5] as const`; `type Columns = 2 | 3 | 5`
  - `nextColumns(current: Columns, pinch: 'in' | 'out'): Columns`. Pinch `out` means bigger tiles, so fewer columns. It clamps at both ends.
  - `tagCounts(photos: Photo[]): { tag: string; count: number }[]`: count descending, then tag ascending.
  - `photosWithTag(photos: Photo[], tag: string | null): Photo[]`: `null` means all.
  - `milestoneMirrorFields(m: Milestone, now: number): Partial<Photo> & { id: string }`. Requires `m.photo`. Returns `id: 'ms-'+m.id`, `url`, `path`, the `thumb*`/`width`/`height` that are present, `day: m.day`, `label: m.title`, `milestoneId: m.id` and `updatedAt: now`. It **never** includes `tags`, `description`, `createdAt` or `createdBy`, and has no `undefined` values.

- [ ] **Step 1: Write the check script** `.superpowers/checks/photos.check.ts` with `node:assert/strict`:
  - `normalizeTag('  Trips  ')` → `'trips'`; `normalizeTag('Road   Trip')` → `'road trip'`; `normalizeTag('a.b#c$d/e[f]')` → `'abcdef'`; `normalizeTag('   ')` → `''`.
  - `tagsFromList(['Trips', 'trips ', ''])` → `{ trips: true }`; `tagsFromList([' '])` → `undefined`.
  - `exifDay({ DateTimeOriginal: '2025:06:12 18:03:44' }, new Date(2026, 9, 28))` → `'2025-06-12'`; with only `DateTimeDigitized: '2024:01:02 00:00:00'` → `'2024-01-02'`; with `{ DateTimeOriginal: 'garbage' }`, `null` or `{}` → `'2026-10-28'`.
  - `groupPhotos(sortPhotos([p('2025-06-12'), p('2025-06-01'), p('2024-12-31')]), 'month').map(s => s.title)` → `['June 2025', 'December 2024']`; with `'year'` → `['2025', '2024']`.
  - `nextColumns(3, 'in')` → `5`; `nextColumns(5, 'in')` → `5`; `nextColumns(3, 'out')` → `2`; `nextColumns(2, 'out')` → `2`.
  - `tagCounts([{tags:{a:true,b:true}}, {tags:{a:true}}])` → `[{tag:'a',count:2},{tag:'b',count:1}]`.
  - `milestoneMirrorFields` on a milestone with `photo: { url: 'u', path: 'p' }`: has `id: 'ms-m1'`, `label` equal to its title, and `'tags' in r === false`, `'description' in r === false`, `'thumbUrl' in r === false`.
- [ ] **Step 2: Run it and watch it fail.** Run `npx tsx .superpowers/checks/photos.check.ts`. Expected: module not found.
- [ ] **Step 3: Write the types and `utils/photos.ts`.** Export them from `types/index.ts` and `utils/index.ts`.
- [ ] **Step 4: Run it and watch it pass.** Expected: `photos: all checks passed`. Also run `npx tsx .superpowers/checks/milestones.check.ts` and expect it to still pass.
- [ ] **Step 5: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: `45`.
- [ ] **Step 6: Commit** `feat(gallery): photo types and pure gallery logic`.

---

### Task 2: Upload with thumbnail, and Firebase photo functions

**Files:**
- Modify: `services/photoUpload.ts`, `hooks/useFirebase.tsx` (next to the milestone functions and in the return object)

**Interfaces:**
- Consumes: `Photo`, `PhotoObject`, `MilestonePhoto` (Task 1).
- Produces (`services/photoUpload.ts`):
  - `type UploadedPhoto = { url: string; path: string; thumbUrl: string; thumbPath: string; width: number; height: number }`
  - `uploadPhotoWithThumb(photo: PickedPhoto, folder: string): Promise<UploadedPhoto>`
    - Renders the full image (≤ 1600) and the thumbnail (≤ 400) from the same source, and uploads both under `${folder}/{uuid}.jpg` and `${folder}/{uuid}_thumb.jpg`.
    - `width`/`height` are the saved full image's dimensions.
    - If the second upload fails, delete the first before rethrowing, so nothing is orphaned.
  - `uploadResizedPhoto` stays exported, but has no remaining callers after Task 3. Keep it; don't delete it in this plan.
- Produces (`hooks/useFirebase.tsx`, returned from `useFirebase()`):
  - `listenToPhotoChanges(cb: (photos: PhotoObject) => void, roomId: string): () => void`: reports `{}` when empty.
  - `setPhoto(roomId: string, photo: Photo): Promise<void>`: `set`.
  - `updatePhoto(roomId: string, id: string, fields: Record<string, unknown>): Promise<void>`: `update`, which merges.
  - `deletePhotoRecord(roomId: string, id: string): Promise<void>`
  - `getPhoto(roomId: string, id: string): Promise<Photo | null>`

- [ ] **Step 1: Implement both files.**
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: `45`.
- [ ] **Step 3: Commit** `feat(gallery): thumbnail upload and photo storage functions`.

---

### Task 3: Milestone photos mirrored into the gallery

**Files:**
- Modify: `hooks/useMilestones.tsx`

**Interfaces:**
- Consumes: `uploadPhotoWithThumb` (instead of `uploadResizedPhoto`), `updatePhoto`, `deletePhotoRecord` and `getPhoto` (Task 2), and `milestoneMirrorFields` (Task 1).
- Produces: there are no signature changes to `useMilestones()`.

Changes to `saveMilestone`:
- The new-photo upload uses `uploadPhotoWithThumb`, and the milestone's `photo` keeps all six fields.
- After the milestone write succeeds, and after the existing old-photo cleanup:
  - **Moved milestone** (`edited.id !== id`): `getPhoto(roomId, 'ms-' + edited.id)`. If it exists, carry over its `tags` and `description` into the new mirror, then `deletePhotoRecord(roomId, 'ms-' + edited.id)`. The record only; never delete its file.
  - **Milestone has a photo:** `updatePhoto(roomId, 'ms-' + id, { ...milestoneMirrorFields(milestone, Date.now()), ...carried, createdAt: <existing mirror's createdAt, or Date.now()>, createdBy: <existing mirror's createdBy, or uid> })`. Read the existing mirror with `getPhoto` only when you need `createdAt`/`createdBy` (i.e. it's new).
  - **Milestone has no photo, but `previous?.photo` existed:** `deletePhotoRecord(roomId, 'ms-' + id)`.
- Mirror failures log and show the toast `{ title: "Couldn't update the gallery", … }`, but the save still returns `true`, the same policy as the countdown sync.

Changes to `removeMilestone`: also `deletePhotoRecord(roomId, 'ms-' + m.id)`, catching and logging errors. The existing code already deletes the milestone's file.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run the checks and type-check.** Run both `tsx` check scripts and expect both to pass. Run `npx tsc --noEmit 2>&1 | grep -c "error TS"` and expect `45`.
- [ ] **Step 3: Commit** `feat(gallery): mirror milestone photos into the gallery`.

---

### Task 4: `useGallery` hook (state, batch upload, edits, backfill)

**Files:**
- Create: `hooks/useGallery.tsx`; modify `hooks/index.ts`

**Interfaces:**
- Consumes: Task 1 helpers, the Task 2 functions plus `listenToMilestoneChanges`, `isConnected` and `newId` (existing), `uploadPhotoWithThumb`, `deletePhoto`, `useAppToast`, and Redux `uid`/`roomId`.
- Produces: `useGallery(): { photos: Photo[]; tags: { tag: string; count: number }[]; loading: boolean; columns: Columns; setColumns(c: Columns): void; addPhotos(items: PendingPhoto[], shared: { tags: string[]; label?: string }, onProgress?: (done: number, total: number) => void): Promise<PendingPhoto[]>; updateDetails(id: string, fields: PhotoDetails): Promise<boolean>; removePhoto(p: Photo): Promise<boolean> }`
  - `photos` is sorted with `sortPhotos`.
  - `type PendingPhoto = { key: string; picked: PickedPhoto; day: string; label?: string; description?: string }`, where `key` is local only, e.g. the asset URI.
  - `type PhotoDetails = { label?: string; description?: string; day: string; tags: string[] }`
  - `addPhotos` **returns the items that failed**; an empty array means everything was saved.
  - Export the types from `hooks/useGallery.tsx`.

Behavior:
- **Listeners:** photos and milestones on `roomId`, unsubscribed on cleanup.
- **Backfill:** in an effect on `[photos, milestones]`, for each milestone with `photo` and no `ms-{id}` record, call `updatePhoto(roomId, 'ms-' + m.id, { ...milestoneMirrorFields(m, Date.now()), createdAt: m.createdAt, createdBy: m.createdBy })`. Guard with a ref of ids already attempted in this session, so it doesn't loop.
- **`addPhotos`:**
  1. If not `isConnected()`: toast "You're offline", and return `items` (all failed).
  2. For each item in order: `id = newId()`, then `uploadPhotoWithThumb(item.picked, \`rooms/${roomId}/photos/${id}\`)`, then `setPhoto` with the fields:
     - `label`: the item's own label, else the shared label;
     - `description`: the item's own;
     - `tags`: `tagsFromList(shared.tags)`;
     - `day`;
     - the uploaded fields;
     - `createdAt` and `createdBy`.

     Omit empty optional keys. If `setPhoto` throws, delete both uploaded files. A failure in either step adds the item to `failed` and continues with the next one. Call `onProgress(i + 1, total)` after each item.
  3. If `failed` is non-empty, show the toast `"{n} photo(s) couldn't be uploaded"`.
- **`updateDetails`:** `updatePhoto` with `label`/`description` set to a value or `null` (to clear), `day`, `tags` (a map, or `null` when empty), and `updatedAt`. Toast on failure and return `false`.
- **`removePhoto`:** refuses (returns `false`) when `p.milestoneId` is set. Otherwise it deletes the record, then `deletePhoto(path)` and `deletePhoto(thumbPath)` when present, logging file errors.
- **`columns`:** loaded from AsyncStorage on mount (default `3`, invalid values → `3`) and saved on change.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: `45`.
- [ ] **Step 3: Commit** `feat(gallery): gallery hook with batch upload and milestone backfill`.

---

### Task 5: Gallery screen, pinch grid and tag filter

**Files:**
- Create: `components/PhotoGrid/PhotoGrid.tsx` + `index.ts`, `app/(tabs)/YouTwo/Photos.tsx`
- Modify: `components/index.ts`, `constants/index.ts` (add `'/YouTwo/Photos'` to `TAB_HIDDEN_ROUTES`)

**Interfaces:**
- Consumes: `useGallery` (Task 4), and `groupPhotos`, `photosWithTag`, `nextColumns` (Task 1).
- Produces: `PhotoGrid({ photos, columns, onColumnsChange, onPhotoPress }: { photos: Photo[]; columns: Columns; onColumnsChange: (c: Columns) => void; onPhotoPress: (photo: Photo, ordered: Photo[]) => void })`

**Grid:**
- A `SectionList` (or `FlashList`-free `SectionList` with rows chunked into `columns`) whose sections come from `groupPhotos(photos, columns === 5 ? 'year' : 'month')`.
- Section headers use `textSecondary` and are semibold.
- Tiles are square, with a 2 px gap, showing `thumbUrl ?? url`.
- Wrap it in a `GestureDetector` with `Gesture.Pinch()`. When the gesture ends:
  - `scale > 1.15` → `nextColumns(c, 'out')`;
  - `scale < 0.87` → `nextColumns(c, 'in')`.
- Animate the change with `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`.

**Screen:**
- A header with a back button (`router.back()`), the title "Photos", and "+ Add", which opens the add flow from Task 6. Until Task 6 lands, wire it to a no-op.
- A horizontal row of tag chips: "All" plus `tags`, where the active chip is `primary` with `onPrimary` text.
- The grid shows `photosWithTag(photos, activeTag)`. When `activeTag` is no longer in `tags`, reset it to `null` (Review Focus 5).
- With no photos, show an empty state: "Add your first photo".
- Tapping a photo opens the viewer (Task 7); until then, a no-op.

- [ ] **Step 1: Implement.** Stage only the `TAB_HIDDEN_ROUTES` line in `constants/index.ts`, if `git diff` shows anything else there.
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: `45`. If the generated route types lag again, use the `as Href` cast.
- [ ] **Step 3: Commit** `feat(gallery): gallery screen with pinch-to-zoom grid and tag filter`.

---

### Task 6: Add flow (single and bulk) with tag picker

**Files:**
- Create: `components/TagPicker/TagPicker.tsx` + `index.ts`, `components/PhotoAddSheet/PhotoAddSheet.tsx` + `index.ts`
- Modify: `components/index.ts`, `app/(tabs)/YouTwo/Photos.tsx` (wire "+ Add")

**Interfaces:**
- Consumes: `useGallery().addPhotos` / `tags` (Task 4), `exifDay` / `normalizeTag` (Task 1), `PendingPhoto` (Task 4).
- Produces:
  - `TagPicker({ selected, suggestions, onChange }: { selected: string[]; suggestions: string[]; onChange: (tags: string[]) => void })`. It shows the selected tags as removable chips, then suggestions that aren't selected as tappable chips, then a "+ new tag" input that adds `normalizeTag(text)` when it's non-empty and not already selected.
  - `pickPhotosForGallery(): Promise<PendingPhoto[]>`, exported from `PhotoAddSheet.tsx`. It calls the picker with the Global Constraints options and maps each asset to `{ key: asset.uri, picked: { uri, width, height }, day: exifDay(asset.exif, new Date()) }`. Cancel returns `[]`. Wrap it in try/catch and show a toast on picker errors.
  - `PhotoAddSheet({ isOpen, items, suggestions, onClose, onUpload }: { isOpen: boolean; items: PendingPhoto[]; suggestions: string[]; onClose: () => void; onUpload: (items: PendingPhoto[], shared: { tags: string[]; label?: string }, onProgress: (d: number, t: number) => void) => Promise<PendingPhoto[]> })`

**Sheet**, a modal following `MilestoneModal` styling:
- **One item:** a large preview, then label, date (`DateTimePicker`, `mode="date"`), description and `TagPicker`. The button reads "Save photo".
- **Several items:**
  - a thumbnail row (64 px), where tapping one opens an inline editor for that item's label, description and date (a small nested form, or the same fields bound to the selected item);
  - "Tags for all" (`TagPicker`);
  - "Label for all" (optional);
  - a button reading "Upload {n} photos".
- **While uploading:** the button shows "Uploading {d} of {t}…"; the backdrop and close button are disabled.
- **After upload:** if the returned failures are empty, close. Otherwise keep only the failed items in the sheet, and the button reads "Retry {n}".

- [ ] **Step 1: Implement and wire** "+ Add" on the Photos screen: `pickPhotosForGallery()` → open the sheet when the result is non-empty.
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(gallery): single and bulk photo add with tags`.

---

### Task 7: Photo viewer with edit and delete

**Files:**
- Create: `components/PhotoViewer/PhotoViewer.tsx` + `index.ts`
- Modify: `components/index.ts`, `app/(tabs)/YouTwo/Photos.tsx`

**Interfaces:**
- Consumes: `useGallery().updateDetails` / `removePhoto` / `tags`, `TagPicker` (Task 6).
- Produces: `PhotoViewer({ isOpen, photos, startIndex, suggestions, onClose, onTagPress, onSave, onDelete }: { isOpen: boolean; photos: Photo[]; startIndex: number; suggestions: string[]; onClose: () => void; onTagPress: (tag: string) => void; onSave: (id: string, d: PhotoDetails) => Promise<boolean>; onDelete: (p: Photo) => Promise<boolean> })`

**Viewer:**
- A full-screen `Modal` on a black background, with a horizontal `FlatList` (`pagingEnabled`, `initialScrollIndex={startIndex}`, `getItemLayout` from the window width) of `url` images, `resizeMode="contain"`.
- **Bottom panel:** label (bold), the date ("Jun 12, 2025"), the description, and tag chips. Tapping a chip calls `onTagPress(tag)`, which closes the viewer and sets the grid filter.
- **Top bar:** close (×), edit (✎) and delete (🗑).
  - For `milestoneId` photos, delete is replaced by the text "From milestone: {label}".
- **Edit:** an inline form with label, date, description and `TagPicker`, then Save → `onSave`.
- **Delete:** `Alert.alert('Delete photo?', …)` → `onDelete`. On success, show the next photo, or close if none is left.

- [ ] **Step 1: Implement and wire** the grid's `onPhotoPress` (pass the filtered, ordered list).
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(gallery): swipeable photo viewer with edit and delete`.

---

### Task 8: Photos strip on You Two, and device checklist

**Files:**
- Create: `components/PhotoStrip/PhotoStrip.tsx` + `index.ts`
- Modify: `components/index.ts`, `app/(tabs)/YouTwo/index.tsx`

**Interfaces:**
- Consumes: `useGallery()` (Task 4), `PhotoViewer` (Task 7), and the add flow (Task 6).
- Produces: `PhotoStrip({ photos, total, onSeeAll, onPhotoPress, onAdd }: { photos: Photo[]; total: number; onSeeAll: () => void; onPhotoPress: (index: number) => void; onAdd: () => void })`

**Strip:**
- A section title "Photos", plus "See all {total} ›" in `primary`, which runs `router.push('/(tabs)/YouTwo/Photos' as Href)`.
- A horizontal row of the first 8 of `photos` as 70 px rounded thumbnails.
- With no photos, a single "+ Add photos" tile that runs the same pick → sheet flow as Task 6.

**On the You Two screen:** place it above "Our story". Tapping a thumbnail opens `PhotoViewer` with the full sorted list and that index.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Final checks.** Run both `tsx` check scripts and expect both to pass. Run `npx tsc --noEmit 2>&1 | grep -c "error TS"` and expect `45`.
- [ ] **Step 3: Commit** `feat(gallery): photos strip on the You Two tab`.
- [ ] **Step 4: Hand the device checklist to the user** (spec, Verification). It needs the rebuilt dev client and their real accounts:
  1. Add one photo with details; it shows under the right month, with its EXIF date.
  2. Add 10 at once with shared tags, one with its own label. Turn on airplane mode mid-batch: the failures are offered as "Retry n" and nothing is duplicated.
  3. Filter by tag. Pinch through 2, 3 and 5 columns (years at 5). The choice survives a restart.
  4. The viewer swipes through the filtered set. Edit works. Delete removes the record, and both files are gone from Storage.
  5. Give a milestone a photo: it appears in the gallery labeled with the milestone title, and can't be deleted from there. Tag it, then edit the milestone: the tag stays. Change the milestone's type: the tag still stays. Remove the milestone's photo: the gallery entry goes.
  6. The partner's phone sees everything live.
