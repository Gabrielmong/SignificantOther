# "You Two" Tab: Header, Counter and Milestones

## Goal

Add a center tab, "You Two", where the couple looks back at their story
together. This first piece covers:

- a header with both names and profile photos;
- a "together" counter;
- a shared list of milestones: four special ones plus any the couple adds.

The two key anniversaries also feed the existing countdowns, so they show
up on Home, on the widget and in the Calendar.

## Why

The app covers the day-to-day (feelings, chat, whiteboard, countdowns) but
has no place for the relationship's history. The user wants a page the two
of them open together to look back. It is not a profile to show other
people.

## The bigger feature, and where this piece sits

"You Two" will grow in separate pieces, each designed and built on its own:

1. **This piece:** the tab, header, counter, and milestones (with an
   optional note and photo), plus anniversaries → countdowns.
2. **Gallery:** photos the couple adds, each with a label and description.
3. **Places:** a map of tagged spots ("we met here", "first date"), with
   no location tracking. Milestones gain their optional *place* here.
4. **Timeline + On this day:** milestones, photos and places in one dated
   stream, plus "on this day" memories from past years.

Build this piece so pieces 2–4 can extend it without rework, in two ways.
The photo upload helper must be reusable by the gallery. The milestone
data shape must leave room for a `placeId`.

## Decisions made during brainstorming

- **Tab position:** center of the bottom bar. The order becomes Home ·
  Calendar · **You Two** · Chat · Profile.
- **Header:** "Diana & Gabriel" style names with both profile photos side
  by side.
- **Counter, style C** (picked from mockups): a big day count with a
  years/months/days line under it, e.g. **"1,247 days"** / "as a couple ·
  3y 4m 29d", and "since Jun 30, 2023" below.
- **Counter source, by priority:** married › engaged › dating, using the
  highest one that is set. Labels: "as a couple" (dating), "engaged",
  "married".
- **Milestones:**
  - There are four special ones: **met, dating, engaged, married**.
  - The couple can also add **free-form milestones** of their own.
  - Every milestone has a title and a date. A note, a photo and a place
    are optional. The place is deferred to the Places piece.
- **Anniversaries → countdowns:** the dating, engaged and married
  milestones automatically appear as yearly countdowns on Home, the
  Countdowns screen, the widget and the Calendar.
- **Below the header:** the timeline, then photos and the rest as later
  pieces arrive. In this piece, "the timeline" is the milestone list.

## Current state (what the builder starts from)

- **Tabs:** `app/(tabs)/_layout.tsx` has four `Tabs.Screen`s (Home,
  Calendar, Chat, Profile). Each one is a folder with a `_layout.tsx` that
  renders `<Slot/>`. Icons are lucide, inside `AnimatedTabIcon`, with no
  labels. Tab colors come from the theme (accent themes,
  `docs/superpowers/specs/2026-10-28-accent-themes-design.md`).
- **Hiding the tab bar:** a sub-screen hides it by having its pathname in
  `TAB_HIDDEN_ROUTES` in `constants/index.ts`, matched exactly.
- **Profiles:**
  - My name and photo are in Redux `state.user` (`displayName`,
    `photoURL`).
  - The partner's are in `users/{partnerId}` (`displayName`, `photoURL`),
    read with `getUserProfile(uid)` from `hooks/useFirebase.tsx`.
  - `state.room` holds `{roomId, partnerId, partnerName}`. Its
    `partnerName` comes from `rooms/{roomId}/users/{partnerId}/name`,
    which **no app code writes**, so don't rely on it.
- **No relationship data exists today.** There is no anniversary field,
  and `createRoom` writes no `createdAt`.
- **Countdowns:** stored at `rooms/{roomId}/countdowns/{id}`, typed in
  `types/Countdown.ts`:
  - fields: `title`, `date` (ms), `icon` (emoji), `createdAt`,
    `createdBy`, `recurrence?` (`'yearly'` etc.);
  - `hooks/useCountdowns.tsx` automatically moves expired recurring
    countdowns to their next date and syncs the nearest one to the widget;
  - the Calendar tab (`app/(tabs)/Calendar/index.tsx`) listens to the same
    node.
- **Firebase conventions** (`hooks/useFirebase.tsx`):
  - IDs are `uuid.v4().substring(0, 12)`, written with
    `update(parent, {[id]: {...item, id}})`.
  - Each collection has get/create/update/delete/listen functions.
    `listenToCountdownChanges` is the model; it correctly reports an
    empty list.
  - Several of these functions take the roomId in a parameter
    misleadingly named `uid`.
- **Photos today:**
  - `hooks/useImageUpload.tsx` wraps `expo-image-picker`.
  - `uploadToFirebaseStorage(uri, name)` uploads to a flat `images/{name}`
    path with the JS `firebase/storage` SDK, so two files with the same
    name collide.
  - There is no resizing (`quality: 1`) and no image-manipulation
    dependency.
- There are no database or storage rules files in the repo. The user
  confirmed the live Firebase project still uses the default rules (any
  logged-in user can read and write), so the new
  `rooms/{roomId}/milestones` node and the `rooms/{roomId}/milestones/...`
  storage path need no rules change. Tightening rules is out of scope.

## Components

### 1. Data

**Milestones** live at `rooms/{roomId}/milestones/{id}`:

```ts
type MilestoneKind = 'met' | 'dating' | 'engaged' | 'married' | 'custom';

type Milestone = {
  id: string;
  kind: MilestoneKind;
  title: string;          // special kinds get a default title, editable
  day: string;            // calendar date "YYYY-MM-DD", no time zone
  emoji: string;
  note?: string;
  photo?: { url: string; path: string };  // path = storage path, for deletion
  placeId?: string;       // reserved for the Places piece; unused here
  createdAt: number;
  createdBy: string;      // uid
  updatedAt?: number;
};
```

- Each special kind (`met`, `dating`, `engaged`, `married`) is unique per
  room. `custom` can repeat.
- **Dates are calendar dates, not timestamps** *(Claude's call,
  builder-check follow-up)*:
  - `day` is stored as `"YYYY-MM-DD"`, so "June 30" means June 30 on both
    phones, even if the partners are in different time zones.
  - The counter, the list and the countdowns turn it into a local date on
    each phone when they read it.
- **Future dates are allowed** *(Claude's call, builder-check follow-up)*,
  e.g. an engaged couple adding the planned wedding.
  - The counter uses the highest special milestone whose day is today or
    earlier, so a future wedding never gives a negative count.
  - Before its day, a future milestone's countdown counts down to the
    event itself: title "Our wedding" / "Our engagement" /
    "We start dating", `recurrence: 'none'` behavior until it passes.
  - After its day, the countdown becomes the yearly anniversary. The
    builder can do this by writing it as yearly with the event's date and
    letting the existing roll-forward handle it, as long as the title
    switches from the event to the anniversary once the day has passed.
- Default titles and emojis *(Claude's call)*:
  - Met: "We met" 👋
  - Dating: "Started dating" 💕
  - Engaged: "Got engaged" 💍
  - Married: "Got married" 💒
- Add the usual Firebase functions, following the countdown pattern:
  `listenToMilestoneChanges` (reports empty lists too), plus create,
  update and delete.

**Anniversary countdowns** *(Claude's call: real countdown records, so
Home, the widget, the Countdowns screen and the Calendar need no changes)*:

- When a `dating`, `engaged` or `married` milestone is created or its
  date changes, upsert one countdown in `rooms/{roomId}/countdowns`:
  - `recurrence: 'yearly'`;
  - `date` = the next occurrence of that month/day (ms at local midnight
    on the phone that saves it);
  - `icon` = the milestone emoji;
  - `title`, e.g. "Dating anniversary", "Engagement anniversary",
    "Wedding anniversary";
  - a new field `milestoneId` linking it back.
- Deleting the milestone deletes its countdown.
- Add optional `milestoneId?: string` to the `Countdown` type.
- Countdowns with a `milestoneId` are managed from "You Two". On the
  Countdowns screen, editing or deleting one points the user to the
  milestone instead of changing the countdown directly. The builder picks
  how: hide the actions, or show a note.
- `met` does not create a countdown (only the three the user named).
- **An existing hand-made anniversary countdown** *(Claude's call,
  builder-check follow-up)*:
  - When a dating, engaged or married milestone is saved, look for a
    countdown without a `milestoneId` that falls on the same month and
    day.
  - If one exists, ask once: "You already have '{title}' on this date.
    Replace it with the automatic one?"
    - Yes: delete it, then create the linked one.
    - No: keep both.
  - This prevents the most likely duplicate without guessing silently.
- The upsert must be idempotent, so there is never more than one countdown
  per milestone.

### 2. Photo upload (reusable)

- Add a helper that resizes and uploads one picked image. Resize to at
  most 1600 px on the long edge, as JPEG at about 0.8 quality, using
  `expo-image-manipulator`. That is a new dependency; install it with
  `npx expo install`.
- Store photos under a room-scoped path:
  `rooms/{roomId}/milestones/{milestoneId}/{uuid}.jpg`. Return
  `{ url, path }`.
- The gallery piece will reuse this helper with its own folder, so the
  folder is a parameter.
- Replacing or removing a milestone's photo deletes the old file from
  storage. Deleting a milestone deletes its photo.
- Leave the existing `uploadToFirebaseStorage` and its callers (profile
  photo, wishlist) unchanged.

### 3. Tab and screen (`app/(tabs)/YouTwo/`)

- New folder `app/(tabs)/YouTwo/` with `_layout.tsx` (`<Slot/>`) and
  `index.tsx`.
- Register it in `app/(tabs)/_layout.tsx` between Calendar and Chat, with
  the same icon wrapper. Icon *(Claude's call)*: `HeartHandshake` from
  `lucide-react-native`.
- The screen scrolls, with bottom padding so content clears the floating
  tab bar (the Calendar screen uses `96`).
- **Header:**
  - The two profile photos overlap slightly. *(Claude's call: partner on
    the left, me on the right.)* Fall back to an initial on a colored
    circle when there's no photo.
  - Below them, "{partner} & {me}" using `displayName`s. *(Claude's
    call: partner first, matching how the user wrote "Diana & Gabriel".)*
  - The header background is a soft wash of the user's accent, like the
    mockup.
- **Counter:**
  - The big number is whole **calendar days** since the date, in local
    time, so it ticks over at midnight, not 24 hours after the start
    time. The line below is the years/months/days breakdown.
  - Underneath: "since {date}".
  - With no dating, engaged or married date set, show a gentle prompt in
    its place ("When did you start dating?") that opens the add form
    preset to `dating`.
- **Milestone list:**
  - All milestones in date order *(Claude's call: oldest first, so it
    reads as a story)*.
  - Each row shows the emoji, title, date, a thumbnail if it has a photo,
    and the start of the note.
  - Tapping a row opens it for viewing and editing.
  - A clear "Add milestone" button opens the form.
  - The empty state invites adding the first milestone.

### 4. Add/edit milestone

A modal or sheet, following existing modals like `AddCountdownModal`:

- **Type:** the special kinds not used yet, plus "Custom". Choosing a
  special kind fills in its default title and emoji.
- **Fields:** title (required), date (required), emoji (an emoji grid like
  countdowns), note (optional, multi-line), photo (optional: pick,
  replace, remove).
- **Saving** writes the milestone, runs the anniversary-countdown upsert,
  and shows an error toast if the upload or the write fails, keeping the
  form's contents.
- **Deleting** asks for confirmation, then removes the milestone, its
  photo and its countdown.
- Either partner can add, edit or delete anything.

## Non-goals (this piece)

- Gallery, Places/map, the merged Timeline, and On this day (later pieces).
- Any location tracking. The old Map screen stays unlinked.
- New notifications. Anniversaries reach users through the existing
  countdown surfaces only.
- Per-person or private milestones; everything is shared.
- Changing the existing profile-photo or wishlist upload paths.

## Anti-goals (Claude's call; the user had none in mind)

- **Lost memories.** A milestone or photo silently fails to save, or
  deleting one leaves an orphaned file. Failures must be visible and must
  keep the form's contents.
- **Duplicate anniversaries** on Countdowns, Home, the widget or the
  Calendar, for example from saving twice or from both phones saving.
- **A counter that's off by one** around midnight or when the date was
  picked in a different time zone. This is why `day` is a calendar date.
- **A cramped bottom bar.** Five tabs must still fit comfortably on a
  small phone.

## Verification

There is no test runner. Check with `npx tsc --noEmit`, which must not add
errors to the existing baseline, and then on a device:

1. The tab sits in the center, and the bar fits five icons on a small
   screen.
2. With no milestones, there's an empty state and a dating prompt. Adding
   "dating" shows the counter. Adding "engaged" switches the label.
3. A custom milestone with a note and a photo saves. The photo shows on
   the row and is stored under `rooms/{roomId}/milestones/...`, resized.
4. Saving "dating" creates exactly one yearly countdown, which shows on
   Home, the Countdowns screen, the Calendar and the widget. Changing the
   date updates it; deleting the milestone removes it.
5. The partner's phone sees the same milestones live.
6. The counter rolls over at local midnight.

## Left to the builder

- Exact component split and file names under `components/`.
- The emoji set for the picker, and the exact row and header styling,
  within the existing theme tokens.
- How Countdowns screens treat `milestoneId` countdowns (hidden actions or
  a note).
- How the years/months/days breakdown is computed, as long as it is
  calendar-correct (e.g. Jan 31 → Feb 28 handling).
