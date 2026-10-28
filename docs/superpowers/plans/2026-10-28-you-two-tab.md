# "You Two" Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a center "You Two" tab with both partners' photos, a "together" counter, and a shared milestone list. The dating, engaged and married milestones feed yearly countdowns, so they reach Home, the widget and the Calendar.

**Architecture:** Pure date logic (calendar days, counter, next anniversary, countdown building) lives in `utils/milestones.ts`, with no React Native imports, so it can be checked with `tsx`. Milestones are stored at `rooms/{roomId}/milestones/{id}`. A `useMilestones` hook owns listening, saving, deleting, photo upload and the anniversary-countdown sync. The countdown's id is derived from the milestone (`ms-{milestoneId}`), so saving twice, or from both phones, can't create duplicates. The tab screen and an add/edit modal sit on top.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, Firebase RTDB and Storage (web SDK), `expo-image-picker`, `expo-image-manipulator` (new), `@react-native-community/datetimepicker`, `lucide-react-native`. There is no test runner. Pure helpers are checked with `npx tsx` assertion scripts; everything else with `npx tsc --noEmit` plus the device checklist in Task 6.

**Spec:** `docs/superpowers/specs/2026-10-28-you-two-tab-design.md`

## Global Constraints

- **Tab order:** Home · Calendar · **You Two** · Chat · Profile. Route folder `app/(tabs)/YouTwo/`. Icon `HeartHandshake` from `lucide-react-native`.
- **Milestone node:** `rooms/{roomId}/milestones/{id}`. Ids come from `uuid.v4().toString().substring(0, 12)`, matching the existing convention.
- **Milestone dates:** `day` is a `"YYYY-MM-DD"` string. Never store milestone dates as timestamps.
- **Special kinds:** `met | dating | engaged | married` are unique per room; `custom` can repeat.
- **Default title and emoji for each special kind:**
  - met: "We met" 👋
  - dating: "Started dating" 💕
  - engaged: "Got engaged" 💍
  - married: "Got married" 💒
- **Counter:**
  - Priority married › engaged › dating, counting only days that are today or earlier.
  - Labels: "as a couple" / "engaged" / "married".
  - Format: big `"{N} days"` (N with thousands separators), then `"{label} · {y}y {m}m {d}d"`, then `"since {Mon D, YYYY}"`.
- **Anniversary countdowns:**
  - Only `dating`, `engaged` and `married` get one; `met` never does.
  - Id `ms-{milestoneId}`, `recurrence: 'yearly'`, `icon` is the milestone emoji, and `milestoneId` is set.
  - Anniversary titles: "Dating anniversary" / "Engagement anniversary" / "Wedding anniversary".
  - Titles while the day is still in the future: "We start dating" / "Our engagement" / "Our wedding".
- **Photos:**
  - Resize to ≤ 1600 px on the long edge, JPEG compress 0.8.
  - Storage path `rooms/{roomId}/milestones/{milestoneId}/{uuid}.jpg`.
  - Firebase rules are the defaults; no rules changes.
- **Firebase RTDB rejects `undefined` values.** Objects passed to `set` or `update` must omit optional keys rather than set them to `undefined`. Use `null` in an `update` to delete a field.
- Leave `uploadToFirebaseStorage` and its callers (profile photo, wishlist) unchanged.
- **Type errors:** `npx tsc --noEmit` reports **45 errors** on `main`. Don't add any.
- **Commits:** messages end with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never stage `constants/index.ts` hunks or `assets/flowers/peony.png` that you didn't write; the user has uncommitted work there.

## Review Focus

1. **Both phones save the same anniversary at once,** or one phone saves twice. Expected: exactly one countdown, because its id is deterministic (`ms-{id}`) and it's written with `set`. Pinned in Task 3's check script.
2. **February 29 milestones.** Expected: in non-leap years the anniversary falls on Feb 28, and the y/m/d breakdown never shows negative parts. Pinned in Task 1.
3. **A save that fails after the photo was uploaded** (for example, offline mid-save). Expected: the uploaded file is deleted, an error toast shows, and the form keeps its contents. Handled in Task 3 (`saveMilestone`), checked on device in Task 6.
4. **The app is left open across midnight.** Expected: the counter and the "since" line update without reopening the app. Handled in Task 4 (`useToday`).
5. **The partner deletes a milestone you're editing.** Expected: on save you get an error toast or a clean re-create, not a crash. `saveMilestone` treats the write as a plain `set` by id, so a re-create is acceptable; the form must not crash when its milestone disappears from the list. Task 5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/Milestone.ts` | Create | `Milestone`, `MilestoneKind`, `MilestonePhoto` |
| `types/Countdown.ts` | Modify | `milestoneId?`, `anniversaryTitle?` |
| `types/index.ts` | Modify | Export `Milestone` types |
| `utils/milestones.ts` | Create | Day math, counter, defaults, anniversary countdown builder, manual-match finder |
| `services/photoUpload.ts` | Create | `uploadResizedPhoto`, `deletePhoto` |
| `hooks/useFirebase.tsx` | Modify | Milestone listen/set/delete, `setCountdown` |
| `hooks/useMilestones.tsx` | Create | State, save/delete flows, countdown sync |
| `hooks/useCountdowns.tsx` | Modify | Title swap on roll-forward; guard editing milestone countdowns |
| `app/(tabs)/YouTwo/_layout.tsx`, `index.tsx` | Create | The tab screen |
| `app/(tabs)/_layout.tsx` | Modify | Register the center tab |
| `components/YouTwoHeader/`, `components/MilestoneRow/`, `components/MilestoneModal/` | Create | UI pieces |
| `components/index.ts`, `hooks/index.ts` | Modify | Exports |

---

### Task 1: Types and date helpers

**Files:**
- Create: `types/Milestone.ts`, `utils/milestones.ts`
- Modify: `types/Countdown.ts`, `types/index.ts`

**Interfaces:**
- Produces (`types/Milestone.ts`):
  - `type MilestoneKind = 'met' | 'dating' | 'engaged' | 'married' | 'custom'`
  - `type SpecialKind = Exclude<MilestoneKind, 'custom'>`
  - `type MilestonePhoto = { url: string; path: string }`
  - `interface Milestone { id: string; kind: MilestoneKind; title: string; day: string; emoji: string; note?: string; photo?: MilestonePhoto; placeId?: string; createdAt: number; createdBy: string; updatedAt?: number }`
  - `interface MilestoneObject { [id: string]: Milestone }`
- Produces (`types/Countdown.ts`): `Countdown` gains `milestoneId?: string` and `anniversaryTitle?: string | null`. The second is the title to switch to once a future event's day has passed; `null` is only used to delete it through `update`.
- Produces (`utils/milestones.ts`). These are pure functions: no React Native and no Firebase imports, and `today` is always a parameter.
  - `SPECIAL_DEFAULTS: Record<SpecialKind, { title: string; emoji: string }>`, from Global Constraints.
  - `ANNIVERSARY_KINDS: readonly SpecialKind[] = ['dating', 'engaged', 'married']`
  - `parseDay(day: string): Date`: local midnight.
  - `toDay(date: Date): string`: `"YYYY-MM-DD"` in local time.
  - `daysSince(day: string, today: Date): number`: whole calendar days. 0 on the day itself, negative in the future.
  - `ymdSince(day: string, today: Date): { years: number; months: number; days: number }`: count whole months by stepping forward from the start date, clamping to the month's end (Jan 31 + 1 month = Feb 28; Feb 29 + 12 months = Feb 28), as long as the stepped date is ≤ `today`. Then split the months into years/months, and the remaining calendar days are `days`. All parts are ≥ 0 when `day <= today`.
  - `pickCounterMilestone(milestones: Milestone[], today: Date): Milestone | null`: married › engaged › dating, skipping days after `today`.
  - `COUNTER_LABEL: Record<'dating' | 'engaged' | 'married', string>`: "as a couple" / "engaged" / "married".
  - `nextOccurrence(day: string, today: Date): Date`: the next month/day on or after `today` (today counts). A Feb 29 day maps to Feb 28 in non-leap years.
  - `buildAnniversaryCountdown(m: Milestone, today: Date, uid: string): Countdown & { id: string }`:
    - id `ms-${m.id}`, `recurrence: 'yearly'`, `icon: m.emoji`, `milestoneId: m.id`, `createdAt: Date.now()`, `createdBy: uid`.
    - If `m.day > toDay(today)`: `date = parseDay(m.day).getTime()`, `title` is the future title, `anniversaryTitle` is the anniversary title.
    - Otherwise: `date = nextOccurrence(...).getTime()`, `title` is the anniversary title, and there is no `anniversaryTitle` key at all.
  - `findManualAnniversary(countdowns: CountdownObject, day: string): Countdown | undefined`: a countdown without `milestoneId` whose local month/day equals `day`'s.
  - `formatCounter(m: Milestone, today: Date): { big: string; detail: string; since: string }`, using the formats in Global Constraints.

- [ ] **Step 1: Write the check script** at `.superpowers/checks/milestones.check.ts` (git-ignored scratch). It uses `node:assert/strict` against `utils/milestones.ts`:
  - `daysSince('2023-06-30', new Date(2023, 5, 30, 23, 59))` → `0`; with `new Date(2023, 6, 1, 0, 1)` → `1`.
  - `ymdSince('2023-01-31', new Date(2023, 2, 1))` → `{ years: 0, months: 1, days: 1 }`.
  - `ymdSince('2020-02-29', new Date(2021, 1, 28))` → every part ≥ 0.
  - `toDay(nextOccurrence('2020-02-29', new Date(2021, 0, 10)))` → `'2021-02-28'`; with `new Date(2024, 0, 10)` → `'2024-02-29'`.
  - `toDay(nextOccurrence('2023-06-30', new Date(2026, 5, 30, 15)))` → `'2026-06-30'` (today counts).
  - `pickCounterMilestone` with dating `2023-06-30` and married `2030-01-01`, on `new Date(2026, 9, 28)` → the dating one.
  - `buildAnniversaryCountdown` for married `2030-01-01` on `new Date(2026, 9, 28)` → `title: 'Our wedding'`, `anniversaryTitle: 'Wedding anniversary'`, `id: 'ms-<id>'`. For dating `2023-06-30` → `title: 'Dating anniversary'` and `'anniversaryTitle' in result === false`.
  - `findManualAnniversary` matches a countdown dated `new Date(2026, 5, 30).getTime()` with no `milestoneId` for day `'2023-06-30'`, and ignores one that has `milestoneId`.
  - `formatCounter` for dating `'2023-06-30'` on `new Date(2026, 9, 28)` → `big: '1,216 days'`, `detail: 'as a couple · 3y 3m 28d'`, `since: 'since Jun 30, 2023'`.
- [ ] **Step 2: Run it and watch it fail.** Run `npx tsx .superpowers/checks/milestones.check.ts`. Expected: a module-not-found error for `utils/milestones`.
- [ ] **Step 3: Write the types and `utils/milestones.ts`.** Export the types from `types/index.ts`, following the existing pattern. Format numbers with `toLocaleString('en-US')` and month names with `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`.
- [ ] **Step 4: Run it and watch it pass.** Run `npx tsx .superpowers/checks/milestones.check.ts`. Expected: exits 0 and prints `milestones: all checks passed`.
- [ ] **Step 5: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -E "^(types/|utils/milestones)"`. Expected: no output.
- [ ] **Step 6: Commit** `feat(you-two): milestone types and date helpers`.

---

### Task 2: Storage for milestones and photos

**Files:**
- Create: `services/photoUpload.ts`
- Modify: `hooks/useFirebase.tsx` (next to the Countdown Management block, about `:810-854`, and in the return object)
- Modify: `package.json` / lockfile, through `npx expo install expo-image-manipulator`

**Interfaces:**
- Consumes: `Milestone`, `MilestoneObject`, `MilestonePhoto` (Task 1).
- Produces (`hooks/useFirebase.tsx`, returned from `useFirebase()`):
  - `listenToMilestoneChanges(cb: (milestones: MilestoneObject) => void, roomId: string): () => void`. Calls `cb(snapshot.val() || {})`, so empty lists are reported too.
  - `setMilestone(roomId: string, milestone: Milestone): Promise<void>`: a `set` at `rooms/{roomId}/milestones/{milestone.id}`.
  - `deleteMilestone(roomId: string, id: string): Promise<void>`
  - `setCountdown(roomId: string, countdown: Countdown & { id: string }): Promise<void>`: a `set` at `rooms/{roomId}/countdowns/{countdown.id}`.
  - `newId(): string`, i.e. `uuid.v4().toString().substring(0, 12)`.
- Produces (`services/photoUpload.ts`):
  - `type PickedPhoto = { uri: string; width: number; height: number }`
  - `uploadResizedPhoto(photo: PickedPhoto, folder: string): Promise<MilestonePhoto>`. Resize the long edge to `min(1600, current)`, keep the aspect ratio, compress JPEG 0.8, then upload to `${folder}/${uuid}.jpg` with `getStorage()` / `uploadBytes` / `getDownloadURL` from `firebase/storage`. It returns `{ url, path }`. It throws on failure and shows no toast; callers decide.
  - `deletePhoto(path: string): Promise<void>`. Uses `deleteObject`, and swallows `storage/object-not-found`.

- [ ] **Step 1: Install the dependency.** Run `npx expo install expo-image-manipulator`. Expected: it's added to `package.json` at the SDK 54–compatible version.
- [ ] **Step 2: Write `services/photoUpload.ts` and the `useFirebase` additions.** Use the `ImageManipulator` API that the installed version documents (`manipulateAsync` or the context API).
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45. Also run `npx tsc --noEmit 2>&1 | grep -E "^(services/photoUpload|hooks/useFirebase)"` and expect no new lines compared with `main`. (`useFirebase` has no errors today.)
- [ ] **Step 4: Commit** `feat(you-two): milestone storage and resized photo upload`, including `package.json` and the lockfile.

---

### Task 3: Milestone hook, anniversary sync, countdown guards

**Files:**
- Create: `hooks/useMilestones.tsx`
- Modify: `hooks/index.ts` (export it)
- Modify: `hooks/useCountdowns.tsx` (roll-forward block, about `:49-95`; `handleEditCountdown`, about `:112`)

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 Firebase functions and `uploadResizedPhoto` / `deletePhoto`, `listenToCountdownChanges` and `deleteCountdown` (existing), `useAppToast`, and Redux `state.user.uid` / `state.user.roomId`.
- Produces: `useMilestones(): { milestones: Milestone[]; loading: boolean; countdowns: CountdownObject; saveMilestone(input: MilestoneInput, photo: PhotoChange, options?: { replaceCountdownId?: string }): Promise<boolean>; removeMilestone(m: Milestone): Promise<boolean> }`
  - `milestones` is sorted by `day` ascending, ties broken by `createdAt`.
  - `type MilestoneInput = { id?: string; kind: MilestoneKind; title: string; day: string; emoji: string; note?: string }`. No `id` means a new milestone.
  - `type PhotoChange = { type: 'keep' } | { type: 'remove' } | { type: 'new'; photo: PickedPhoto }`
  - Both types are exported from `hooks/useMilestones.tsx`.

**`saveMilestone` order** (this is the part the spec's "lost memories" anti-goal depends on):
1. `id = input.id ?? newId()`; `previous = current milestone with that id`.
2. If `photo.type === 'new'`, upload with `uploadResizedPhoto(photo.photo, \`rooms/${roomId}/milestones/${id}\`)`.
3. Build the `Milestone`:
   - keep `createdAt` / `createdBy` from `previous`, or set them now;
   - `updatedAt: Date.now()` when editing;
   - `photo` is the new upload, or `previous.photo` on `keep`, or absent on `remove`;
   - omit empty `note` and all `undefined` keys;
   - keep `previous.placeId` if present.
4. `setMilestone`. If it throws, delete the just-uploaded photo, show an error toast, and return `false`.
5. After a successful write, if the old photo was replaced or removed, `deletePhoto(previous.photo.path)`. Log errors; don't fail the save.
6. **Anniversary sync:**
   - If `kind` is in `ANNIVERSARY_KINDS`: `setCountdown(roomId, buildAnniversaryCountdown(m, new Date(), uid))`, and if `options.replaceCountdownId` is set, `deleteCountdown(roomId, it)`.
   - If an edit changed `kind` from an anniversary kind to one that isn't, delete `ms-{id}`.
   - A sync failure shows an error toast but still returns `true`, because the milestone itself is saved.
7. Return `true`.

**`removeMilestone`:** delete the milestone, then its photo (if any), then `ms-{id}` (if it's an anniversary kind). Toast on failure; return `false` if the milestone delete failed.

**`useCountdowns` changes:**
- In the roll-forward update, when `countdown.anniversaryTitle` is set, write `title: countdown.anniversaryTitle` and `anniversaryTitle: null`. This uses `update` semantics, so `null` deletes the key.
- In `handleEditCountdown`, when `countdown.milestoneId` is set, show the info toast `{ title: 'Managed in You Two', description: 'Edit this anniversary from the You Two tab.' }`, then `router.push('/(tabs)/YouTwo')`, and don't open the modal. Delete is only reachable through that modal, so this blocks both.

- [ ] **Step 1: Extend the check script** with a `buildAnniversaryCountdown` idempotency check: two builds for the same milestone produce the same `id`. The real write-twice check needs Firebase, so it happens on device in Task 6.
- [ ] **Step 2: Write `useMilestones.tsx` and the `useCountdowns` edits.**
- [ ] **Step 3: Run the checks and type-check.** Run `npx tsx .superpowers/checks/milestones.check.ts` and expect it to pass. Run `npx tsc --noEmit 2>&1 | grep -c "error TS"` and expect ≤ 45; `hooks/useCountdowns.tsx` keeps exactly its 2 existing errors.
- [ ] **Step 4: Commit** `feat(you-two): milestone save/delete with anniversary countdown sync`.

---

### Task 4: The tab, header and counter

**Files:**
- Create: `app/(tabs)/YouTwo/_layout.tsx` (`<Slot/>`, like `Chat/_layout.tsx`), `app/(tabs)/YouTwo/index.tsx`
- Create: `components/YouTwoHeader/YouTwoHeader.tsx` + `index.ts`; export it from `components/index.ts`
- Modify: `app/(tabs)/_layout.tsx` (a new `Tabs.Screen name="YouTwo"` between Calendar and Chat)

**Interfaces:**
- Consumes: `useMilestones` (Task 3), `pickCounterMilestone` / `formatCounter` / `COUNTER_LABEL` (Task 1), `getUserProfile` from `useFirebase`, Redux `state.user` and `state.room`, and `useAppTheme`.
- Produces:
  - `YouTwoHeader({ me, partner, counter, onAddDatingPress }: { me: Person; partner: Person; counter: { big: string; detail: string; since: string } | null; onAddDatingPress: () => void })`, where `type Person = { name: string; photoURL?: string | null }`.
  - `useToday(): Date`, a local hook in `YouTwo/index.tsx`. It refreshes at the next local midnight (`setTimeout`, re-armed each time) and when `AppState` becomes `active`.

Header layout (spec, and mockup style C):
- Two 76 px avatars that overlap by 14 px, partner on the left, each with a 3 px `theme.colors.background` border. A missing photo falls back to the initial on `theme.gradients.primary` (me) or `theme.gradients.partner` (partner).
- Then `"{partner} & {me}"` in bold, with the `&` in `theme.colors.primary`.
- Then the counter: `big` in `primary` (about 34 px, weight 800), `detail` in `textSecondary`, `since` in `textTertiary`.
- With `counter === null`, show a pressable prompt "When did you start dating?" that calls `onAddDatingPress`.
- The background is a soft accent wash: a `LinearGradient` from `applyOpacity(theme.colors.primary, 0.35)` to transparent.

Screen:
- A `ScrollView` on `theme.colors.background`, `paddingBottom: 96`.
- Names: me from `state.user.displayName`. The partner name comes from `getUserProfile(room.partnerId)` → `displayName`, falling back to `room.partnerName`, then `'Partner'`. Load it once per `partnerId`.
- Below the header is the milestone list, added in Task 5. For this task, render a placeholder section title "Our story".

- [ ] **Step 1: Build the tab, screen, header and `useToday`.**
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -E "^(app/\(tabs\)/YouTwo|app/\(tabs\)/_layout|components/YouTwoHeader)"`. Expected: no output.
- [ ] **Step 3: Look at it on the emulator, read-only.** The center tab shows with the `HeartHandshake` icon; five icons fit; the header shows both photos and names, plus the dating prompt (there are no milestones yet). Don't add data on the user's real account.
- [ ] **Step 4: Commit** `feat(you-two): center tab with couple header and counter`.

---

### Task 5: Milestone list and add/edit modal

**Files:**
- Create: `components/MilestoneRow/MilestoneRow.tsx` + `index.ts`
- Create: `components/MilestoneModal/MilestoneModal.tsx` + `index.ts`
- Modify: `components/index.ts`, `app/(tabs)/YouTwo/index.tsx`

**Interfaces:**
- Consumes: `useMilestones()` → `milestones`, `countdowns`, `saveMilestone`, `removeMilestone` (Task 3); `SPECIAL_DEFAULTS`, `ANNIVERSARY_KINDS`, `findManualAnniversary`, `parseDay`, `toDay` (Task 1); `PickedPhoto` (Task 2).
- Produces:
  - `MilestoneRow({ milestone, onPress }: { milestone: Milestone; onPress: () => void })`
  - `MilestoneModal({ isOpen, onClose, milestone, presetKind, usedKinds, countdowns, onSave, onDelete }: { isOpen: boolean; onClose: () => void; milestone: Milestone | null; presetKind?: MilestoneKind; usedKinds: SpecialKind[]; countdowns: CountdownObject; onSave: (input: MilestoneInput, photo: PhotoChange, options?: { replaceCountdownId?: string }) => Promise<boolean>; onDelete: (m: Milestone) => Promise<boolean> })`

**Row:** emoji · title (bold) · date (`Mon D, YYYY`) · the first line of the note (`numberOfLines={1}`) · a 44 px rounded thumbnail on the right when there's a photo. Surface background, `radii.md`, `shadows.sm`.

**Screen list:** a section title "Our story" plus a "+ Add milestone" button in `primary` with `onPrimary` text. Rows come from `milestones` (oldest first). The empty state reads "Add your first milestone". Tapping a row opens the modal in edit mode. The header's dating prompt opens the modal with `presetKind: 'dating'`.

**Modal**, following `AddCountdownModal`'s structure and styling:
- **Type chips:** every special kind not in `usedKinds`, plus "Custom". When editing, the milestone's own kind is always shown. Picking a special kind fills in the default title and emoji, but only if the user hasn't typed a title yet.
- **Fields:**
  - Title: required; Save is disabled when it's empty after trimming.
  - Date: `DateTimePicker` in `mode="date"`, future dates allowed; stored with `toDay(date)`.
  - Emoji: reuse the emoji grid approach from `AddCountdownModal`, with these emojis (the same set for all kinds): 👋 💕 💍 💒 ✈️ 🏠 🎉 🍽️ 🌅 🎂 🐶 ⭐.
  - Note: multi-line, optional.
  - Photo: "Add photo" opens `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })`, and the asset becomes `{ uri, width, height }`. Once there's a photo, show "Replace" and "Remove" buttons.
- **On Save**, for an anniversary kind with no existing `ms-{id}` countdown: `findManualAnniversary(countdowns, day)`. If it finds one, show `Alert.alert('Replace your countdown?', \`You already have "${title}" on this date. Replace it with the automatic one?\`, [{text:'Keep both'}, {text:'Replace'}])` and pass `replaceCountdownId` only for Replace.
  - Show a spinner on the Save button while saving.
  - On `true`, close. On `false`, stay open with the inputs intact.
- **Delete** (edit mode only): `Alert.alert('Delete milestone?', …)` → `onDelete`, then close on `true`.
- If the milestone being edited disappears from `milestones` (the partner deleted it), keep the form open; Save re-creates it (Review Focus 5).

- [ ] **Step 1: Build the row, the modal and the screen wiring.**
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45. Run `npx tsc --noEmit 2>&1 | grep -E "^components/(MilestoneRow|MilestoneModal)|^app/\(tabs\)/YouTwo"` and expect no output.
- [ ] **Step 3: Commit** `feat(you-two): milestone list and add/edit modal`.

---

### Task 6: Device verification (handed to the user)

The emulator is logged into the user's real room, so adding or deleting milestones there is visible to their partner. The executor only does read-only checks. Hand this checklist to the user (spec, Verification):

1. The tab is in the center, and five icons fit on a small screen.
2. Empty state and dating prompt. Adding "dating" shows the counter (style C). Adding "engaged" with a past date switches the label to "engaged". A **future** married date doesn't change the counter.
3. A custom milestone with a note and a photo: the photo shows on the row. In the Firebase console it's under `rooms/{roomId}/milestones/{id}/…jpg`, resized (≤ 1600 px). Replacing or removing the photo deletes the old file.
4. Saving "dating" creates exactly one `ms-…` countdown, which shows on Home, the Countdowns screen, the Calendar and the widget. Saving again doesn't duplicate it. Changing the date moves it. Deleting the milestone removes it. Tapping it on the Countdowns screen shows "Managed in You Two".
5. A hand-made anniversary countdown on the same day triggers the "Replace your countdown?" prompt, and both choices work.
6. Turn on airplane mode and save a milestone with a new photo: an error toast appears, the form keeps its inputs, and no orphan file is left in Storage.
7. The partner's phone sees changes live.
8. The counter rolls over at local midnight with the app open.

- [ ] **Step 1: Final type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 2: Report the checklist to the user.**
