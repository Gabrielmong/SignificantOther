# "You Two" Gallery

## Goal

Add a shared photo gallery to the "You Two" tab. Both partners can add
photos, one at a time or many at once. Each photo can have a label, a
description, tags and a date. The gallery is a date-grouped grid that the
couple can pinch to resize and filter by tag. Milestone photos appear in
it too.

## Why

"You Two" is where the couple looks back together. Milestones capture the
big moments; the gallery holds everything in between (trips, dates,
everyday photos), organized so it can be browsed years later. This is the
second piece of the "You Two" feature. The first piece (header, counter,
milestones) is in `2026-10-28-you-two-tab-design.md` and is merged. Later
pieces (Places on a map, Timeline + On this day) will build on the photos'
dates and ids.

## Decisions made during brainstorming

- **What a photo has:**
  - the image, plus an optional **label**, **description** and **tags**;
  - a **date**, filled in from when the photo was taken if the phone
    knows it, otherwise today, and always editable *(Claude's call,
    accepted)*.
- **Tags filter the gallery.** Tapping a tag chip shows only photos with
  that tag.
- **Adding photos:** one at a time with its details, **or** many at once.
  When adding many, tags (and an optional label) can be applied to all of
  them, and any single photo can get its own label or description.
- **Layout (from mockups):**
  - On the You Two tab there's a **"Photos" strip** of the latest few
    photos with "See all ›", above "Our story".
  - It opens a **full gallery** screen: a grid with tag chips at the top.
  - Tapping a photo opens it full size, with its label, date,
    description and tags, plus edit and delete.
- **Grouped by date:** the grid has section headers (e.g. "June 2025") so
  photos are separated by when they were taken.
- **Pinch the grid to zoom,** like Google Photos: pinch out for bigger
  tiles (fewer per row), pinch in for more per row.
- **Milestone photos appear in the gallery too.**
- **Shared:** either partner can add, edit or delete. *(Claude's call,
  matching milestones.)*

## Current state (what the builder starts from)

- **You Two tab:** `app/(tabs)/YouTwo/index.tsx` renders `YouTwoHeader`,
  then "Our story" (milestone rows plus the `MilestoneModal`). Its hook
  `hooks/useMilestones.tsx` owns the milestone save and delete flows.
- **Photo upload:** `services/photoUpload.ts` has
  `uploadResizedPhoto(photo: PickedPhoto, folder): Promise<{url, path}>`
  and `deletePhoto(path)`.
  - Uploads resize to ≤ 1600 px, JPEG 0.8, using `expo-image-manipulator`
    loaded lazily, with a 30 s retry limit.
  - `PickedPhoto` is `{ uri, width, height }`.
- **Milestones:** stored at `rooms/{roomId}/milestones/{id}`, with an
  optional `photo: { url, path }` uploaded under
  `rooms/{roomId}/milestones/{id}/`. Special kinds use fixed ids
  (`dating`, …).
  - Saves first check `isConnected()` (`.info/connected`) and refuse
    when offline.
  - A failed write deletes the just-uploaded file.
- **Firebase conventions:** `hooks/useFirebase.tsx` has `newId()`,
  `set`-based writers and `listenTo…Changes` listeners that report empty
  lists too. RTDB rejects `undefined` values.
- **Image picking:** `expo-image-picker` is installed (`~17`). It
  supports `allowsMultipleSelection`, `selectionLimit` and `exif: true`,
  where EXIF `DateTimeOriginal` has the format `"YYYY:MM:DD HH:MM:SS"`.
- **Gestures:** `react-native-gesture-handler` is installed (the app root
  is wrapped in `GestureHandlerRootView`), and so is
  `react-native-reanimated`.
- **Tab bar hiding:** sub-screens hide the tab bar through exact-path
  entries in `TAB_HIDDEN_ROUTES` (`constants/index.ts`).
- **History note:** the user squashed the theming and You Two pieces into
  one commit on `main` (`6517345`). Don't rely on the earlier per-task
  commit hashes.
- **Firebase rules** are the defaults; no rules changes are needed.
- **There is no test runner.** Pure logic is checked with `npx tsx`
  assertion scripts in the git-ignored `.superpowers/checks/`, and the
  rest with `npx tsc --noEmit`, whose 45-error baseline must not grow.

## Components

### 1. Data

Photos live at `rooms/{roomId}/photos/{id}`:

```ts
type Photo = {
  id: string;
  url: string;          // full image (≤ 1600px)
  path: string;         // storage path of the full image
  thumbUrl?: string;    // grid thumbnail (missing on old milestone photos)
  thumbPath?: string;
  width?: number;       // of the full image, for layout
  height?: number;
  day: string;          // "YYYY-MM-DD", when it was taken
  label?: string;
  description?: string;
  tags?: Record<string, true>;   // normalized tag → true
  milestoneId?: string; // set on photos that belong to a milestone
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
};
```

- **Thumbnails** *(Claude's call)*: every upload also stores a small copy
  (about 400 px on the long edge) for the grid, so scrolling dozens of
  photos doesn't load full-size images. Extend the upload helper to
  produce both and return both URLs and paths.
- **Storage paths:** `rooms/{roomId}/photos/{photoId}/{uuid}.jpg` and
  `…/{uuid}_thumb.jpg`.
- **Tags:**
  - Stored as a map, so they can be updated without index juggling.
  - Normalized to trimmed lowercase, with internal spaces collapsed.
  - Shown as typed, lowercase is fine *(Claude's call)*.
  - The tag picker suggests existing tags across all photos, so "trips"
    isn't spelled three ways.
- **Date from the photo:** read `exif.DateTimeOriginal` (or
  `DateTimeDigitized`) when the picker returns it. Otherwise use today.

### 2. Milestone photos in the gallery

*(Claude's call on mechanism.)* A milestone that has a photo gets a
linked gallery entry with a fixed id, `ms-{milestoneId}`. This is the same
pattern as anniversary countdowns.

- **When it's created or updated:** whenever the milestone is saved with
  a photo, through the existing save flow in `useMilestones`.
- **What it holds:**
  - `url` and `path` are the milestone's photo; the milestone keeps its
    own `photo` too, so piece 1 is unchanged.
  - The `thumb*` fields come from the milestone photo's upload. Milestone
    uploads therefore also produce a thumbnail; store it on the
    milestone's photo object as `thumbUrl` and `thumbPath`.
  - `day` is the milestone's day, `label` is the milestone's title, and
    `milestoneId` is set.
- **When it's removed:** when the milestone's photo is removed or the
  milestone is deleted.
- **What the gallery can do with it:** add tags and a description, which
  survive later milestone saves (the save must merge, not overwrite those
  two fields). Its image, date and label follow the milestone. Deleting
  it from the gallery is not offered; its detail view says "From
  milestone: {title}" and links to the You Two tab.
- **Files:** the milestone owns the file. Deleting the gallery entry never
  deletes the file; the milestone flow does.
- **Milestone photos saved before this piece** *(Claude's call,
  builder-check follow-up)*. They have only `{ url, path }`: no thumbnail
  and no size. In practice there are likely none yet, since uploads need
  the rebuilt dev client.
  - `thumbUrl`, `thumbPath`, `width` and `height` are **optional** on
    `Photo` and on the milestone's photo object.
  - The grid falls back to the full `url` when `thumbUrl` is missing.
  - On load, the gallery hook creates the missing `ms-{id}` entry for any
    milestone that has a photo but no gallery entry. No thumbnail is
    generated for it.
  - No download-and-reupload backfill.
- **A milestone changing type** *(Claude's call, builder-check
  follow-up)*. When its kind changes, `saveMilestone` moves it to a new
  id. The gallery entry moves with it: read `ms-{old}`, write `ms-{new}`
  with the old entry's tags and description carried over, then delete
  `ms-{old}`.

### 3. Adding photos

- **One "+ Add" button** opens the system picker with multiple selection
  (`selectionLimit` 30, `exif: true`) *(Claude's call)*.
  - **One photo picked:** a details sheet with a preview, label, date,
    description and tags.
  - **Several picked:** the bulk sheet from the mockup:
    - a thumbnail row, where tapping ✎ on a thumbnail edits that photo's
      own label, description and date;
    - "Tags for all" with suggestions plus "+ new tag";
    - "Label for all", which is optional, and a photo's own label wins
      over it;
    - an "Upload N photos" button.
- **Upload:**
  - Check `isConnected()` first and refuse with a toast when offline,
    like milestones.
  - Upload one at a time, showing "Uploading 3 of 12". Each photo's
    record is written right after its own upload succeeds.
  - **A failed photo doesn't stop the batch.** At the end the sheet stays
    open with only the failed photos selected and a "Retry" button.
    Nothing that succeeded is uploaded twice.
  - If a record write fails, its just-uploaded files are deleted.

### 4. Gallery screen

- **Route:** `app/(tabs)/YouTwo/Photos.tsx`. The tab bar is hidden there
  (add `/YouTwo/Photos` to `TAB_HIDDEN_ROUTES`), with a back button
  matching other sub-screens.
- **Tag chips:** "All" plus every tag in use, sorted by how many photos
  have it. One tag is active at a time *(Claude's call)*.
- **Grid:**
  - Sections by month, newest first, with headers like "June 2025". At
    the densest zoom level, sections are by year instead.
  - Within a section, photos are sorted by `day` descending, then
    `createdAt`.
  - Thumbnails come from `thumbUrl`, as square tiles.
- **Pinch to zoom:** column counts step through **2 · 3 · 5**
  *(Claude's call; 3 is the default)*. A pinch past a threshold moves one
  step, with a short layout animation. The last choice is remembered on
  the device (AsyncStorage).
- **Empty states:** with no photos, "Add your first photo". With a tag
  filter that matches nothing (e.g. after a delete), fall back to "All".

### 5. Photo viewer

- **Opens on tap.** It's full-screen with a dark background, and
  swipe left or right moves through the photos in the current filter and
  order.
- **Details:** label, date ("Jun 12, 2025"), description and tag chips.
  Tapping a tag returns to the grid filtered by it.
- **Edit:** label, date, description and tags, in the same form as the
  single-photo add sheet, without the image.
- **Delete:** asks for confirmation, then removes the record, then both
  files. Not available for milestone photos (see §2).
- **Zooming a single photo:** pinch-zoom inside the viewer is *not* part
  of this piece *(Claude's call)*. The user asked for grid zoom.

### 6. On the You Two tab

- A "Photos" section **above "Our story"**, holding a horizontal strip of
  the 8 newest photos by `day` (thumbnails, 70 px) and "See all {count} ›".
  Tapping a thumbnail opens the viewer on that photo, with the full
  gallery order behind it.
- With no photos, the strip becomes a single "+ Add photos" tile that
  starts the add flow.

## Non-goals

- Albums or folders, beyond tags.
- Video.
- Pinch-zoom inside the single-photo viewer.
- Sharing or exporting photos outside the app, or saving to the camera
  roll.
- Face or location detection, and auto-tagging.
- Comments or reactions on photos.
- Places and map pins (piece 3) and the Timeline / On this day (piece 4).
  Those reuse `day` and `id` from here.

## Anti-goals

*(Claude's call, consistent with piece 1.)*

- **Lost photos.** A photo that silently fails to upload or save, or a
  batch where one failure loses the rest. Failures must be visible and
  retryable.
- **Orphaned files** left in Storage after a delete or failed save, and
  the opposite: a gallery delete removing a milestone's file.
- **A slow grid,** from loading full-size images as tiles.
- **Duplicate tags** that differ only in case or spaces.

## Verification

Run `npx tsc --noEmit` (no new errors) and `tsx` checks for the pure
logic:

- tag normalization;
- the EXIF date parse, with fallback;
- grouping into month and year sections;
- sorting;
- choosing the zoom step.

Then on a device:

1. Add one photo with details; it appears under the right month.
2. Add 10 at once with shared tags, giving one its own label. Then cut
   the network mid-batch: the failed ones are offered for retry and
   nothing is duplicated.
3. Filter by tag. Pinch through 2, 3 and 5 columns. The choice survives a
   restart.
4. The viewer swipes through the filtered set. Edit and delete work, and
   the files are gone from Storage after a delete.
5. Give a milestone a photo: it appears in the gallery labeled with the
   milestone's title. Tag it, then edit the milestone: the tag stays.
   Remove the milestone's photo: the gallery entry goes, and its file is
   deleted exactly once.
6. The partner's phone sees everything live.

## Left to the builder

- Component split and file names.
- The pinch threshold and the animation.
- How the viewer pages (FlatList with `pagingEnabled` or similar).
- The thumbnail's exact size and quality (about 400 px, JPEG about 0.7).
- How the bulk sheet lays out on small screens.
