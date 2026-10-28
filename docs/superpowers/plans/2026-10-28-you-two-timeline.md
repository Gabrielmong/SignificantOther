# "You Two" Timeline + On this day Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three things to "You Two":
- one oldest-first story timeline built from milestones and photos;
- an "On this day" card;
- a 9:00 local "On this day" notification on days with a non-special memory.

"Our story" on the tab becomes a preview of the timeline.

**Architecture:**
- **Pure logic** lives in `utils/story.ts` and is checked with `tsx`: building the story, finding memories on a date, choosing the highlight, and the notification schedule.
- **Notifications:** `services/onThisDay.ts` owns scheduling, its setting, the permission check and a reschedule trigger. `useOnThisDayNotifications` is mounted once in the tabs layout (inside the auth tree). It keeps the schedule current and opens the story when a notification is tapped.
- **UI:** a new `Story` screen, an `OnThisDayCard`, and a preview replacing the full milestone list.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, `expo-notifications` ~0.32 (local DATE triggers), AsyncStorage, and Firebase RTDB through the existing hooks. There's no test runner. Pure helpers are checked with `npx tsx` scripts in the git-ignored `.superpowers/checks/`; everything else with `npx tsc --noEmit` and the device checklist in Task 6.

**Spec:** `docs/superpowers/specs/2026-10-28-you-two-timeline-design.md`

## Global Constraints

- **No new data in Firebase.** The story is derived from `useMilestones().milestones` and `useGallery().photos`. Places only provide labels, via `usePlaces().byId`.
- **Mirror photos** (`photo.milestoneId` set, id `ms-…`) belong to their milestone. They're never listed as a separate photo.
- **Ordering:**
  - Story: years ascending, then days ascending. Within a day, milestones by `createdAt`, and photos by `createdAt`.
  - Memories: most recent year first.
- **Memory rule:**
  - Same month and day as the date, in an earlier year. The current year never counts.
  - A `…-02-29` memory counts on Feb 28 in non-leap years.
- **Highlight:**
  - Pick the most recent year that has a milestone, and use its first milestone.
  - Otherwise, pick the most recent year with photos, choosing the day with the most photos.
  - Title: the milestone title, or `"{n} photo(s)"`.
  - Years text: `"1 year ago"` / `"{n} years ago"`.
- **Special kinds:**
  - `met | dating | engaged | married` are **excluded from notifications only**: from both choosing and scheduling.
  - The card includes them.
- **Notifications:**
  - Title `"On this day 💞"`; body `"{yearsText}: {title}"`; at 09:00 local.
  - A DATE trigger, one per day, for the next 30 days (today counts only if it's still before 09:00).
  - Identifier `onthisday-{YYYY-MM-DD}`; `data: { kind: 'onThisDay', day: 'YYYY-MM-DD' }`, where `day` is the **memory's** day, used to scroll the story.
  - **Never** call `cancelAllScheduledNotificationsAsync`. Cancel only ids starting with `onthisday-`.
- **Permission:**
  - Check it only with `Notifications.getPermissionsAsync()`. **Never** call the existing `getPermission()`/`requestPermission()`.
  - Without permission, cancel our notifications and schedule nothing.
- **Setting:**
  - AsyncStorage key `@SignificantOther:onThisDayEnabled`, with values `'1'` or `'0'`; missing means on.
  - Turning the main switch off in NotificationsModal also stores `'0'`.
- **Routes:**
  - `app/(tabs)/YouTwo/Story.tsx`; add `'/YouTwo/Story'` to `TAB_HIDDEN_ROUTES`.
  - Param `day=YYYY-MM-DD`.
  - Push with the `as unknown as Href` cast; open milestones with `router.navigate('/(tabs)/YouTwo', { milestone })`.
- **Type errors:** `npx tsc --noEmit` reports **45 errors** on `main`. Don't add any.
- **Commits:** messages end with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The check-in reminder still fires** after On this day schedules and reschedules. Expected: untouched, because only `onthisday-*` ids are ever cancelled. Owned by Task 4; device check in Task 6.
2. **A day whose only memory is a special milestone** (with its mirror photo). Expected: the card shows it, no notification is scheduled, and the mirror isn't counted as a photo. Pinned in Task 1.
3. **The app is opened after 09:00 on a memory day.** Expected: no past-dated notification is scheduled (no instant "late" delivery). Pinned in Task 1 (`notificationSchedule` with `now` after 09:00).
4. **A notification tapped from a cold start.** Expected: once the tabs mount, the story opens at that day. Owned by Task 4 (`getLastNotificationResponseAsync`), with a device check.
5. **A story with hundreds of photos.** Expected: the Story screen stays smooth, because thumbnails come from `thumbUrl` in a virtualized `SectionList`. Owned by Task 2.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `utils/story.ts`, `utils/index.ts` | Create, modify | Story building, memories, highlight, schedule |
| `app/(tabs)/YouTwo/Story.tsx`, `constants/index.ts` | Create, modify | Full story screen and route |
| `components/OnThisDayCard/` | Create | The card |
| `app/(tabs)/YouTwo/index.tsx` | Modify | Card, and the "Our story" preview |
| `services/onThisDay.ts` | Create | Setting, permission, scheduling, reschedule trigger |
| `hooks/useOnThisDayNotifications.tsx`, `hooks/index.ts` | Create, modify | Keeps the schedule current; handles taps |
| `app/(tabs)/_layout.tsx` | Modify | Mounts the hook |
| `components/NotificationsModal/NotificationsModal.tsx` | Modify | "On this day" switch, off means off, reschedule after save |

---

### Task 1: Pure story logic

**Files:**
- Create: `utils/story.ts`; modify `utils/index.ts`
- Check: `.superpowers/checks/story.check.ts`

**Interfaces:**
- Consumes: `Milestone`, `Photo`, `SpecialKind` types; `parseDay` and `toDay` from `utils/milestones`.
- Produces (pure; `now` is always a parameter):
  - `type StoryDay = { day: string; milestones: Milestone[]; photos: Photo[]; placeId?: string }`. `photos` excludes mirrors. `placeId` is the first milestone's place, otherwise the most common photo place (ties go to the earliest `createdAt`).
  - `type StoryYear = { year: string; days: StoryDay[] }`
  - `buildStory(milestones: Milestone[], photos: Photo[]): StoryYear[]`
  - `type Memory = { day: StoryDay; yearsAgo: number }`
  - `memoriesOn(story: StoryYear[], date: Date): Memory[]`, most recent year first.
  - `yearsText(n: number): string`
  - `type Highlight = { day: string; yearsAgo: number; title: string; milestone?: Milestone; photos: Photo[]; placeId?: string; more: number }`, where `more` is the number of other memories beyond the highlight's day.
  - `pickHighlight(memories: Memory[], opts?: { excludeSpecial?: boolean }): Highlight | null`. With `excludeSpecial`, special milestones are dropped first, and days left with nothing are skipped.
  - `type ScheduledMemory = { date: string; day: string; title: string; body: string }`. `date` is the notification date; `day` is the memory's day.
  - `notificationSchedule(story: StoryYear[], now: Date, horizonDays = 30): ScheduledMemory[]`. It covers the next `horizonDays` dates starting today, and includes today only if `now` is before 09:00. It uses `pickHighlight(memoriesOn(…), { excludeSpecial: true })`, skipping nulls. Title `'On this day 💞'`, body `` `${yearsText(h.yearsAgo)}: ${h.title}` ``.

- [ ] **Step 1: Write the check script** `.superpowers/checks/story.check.ts`:
  - **`buildStory`** with milestones met `2023-10-07` and a custom concert `2024-07-08` (with `placeId: 'estadio'`), and photos: two on `2024-07-08`, a mirror `ms-m1` on `2023-10-07` (`milestoneId: 'm1'`), and three on `2024-08-15` (two with `placeId 'conchal'`).
    - Years are `['2023', '2024']`.
    - 2024 has days `['2024-07-08', '2024-08-15']`.
    - The `2023-10-07` day has `photos.length === 0` (the mirror is folded in).
    - `2024-07-08` has `placeId 'estadio'`.
    - `2024-08-15` has `placeId 'conchal'` and `milestones.length === 0`.
  - **`memoriesOn`** on `new Date(2026, 6, 8)` gives one memory, with `yearsAgo` 2 and day `2024-07-08`. On `new Date(2024, 6, 8)` it gives `[]` (the current year never counts). A `2024-02-29` memory is found on `new Date(2025, 1, 28)` and not on `new Date(2028, 1, 28)` (2028 is a leap year).
  - **`yearsText`:** `yearsText(1)` → `'1 year ago'`; `yearsText(3)` → `'3 years ago'`.
  - **`pickHighlight`:**
    - A milestone wins over a day with more photos.
    - The most recent year wins among milestones.
    - Photos only → title `'3 photos'`; exactly one photo → `'1 photo'`.
    - `more` counts the other memories.
  - **Special-only day:** with only `{ kind: 'dating' }` on `2024-02-29` plus its mirror:
    - `pickHighlight(memories)` → title is the milestone's title;
    - `pickHighlight(memories, { excludeSpecial: true })` → `null`.
  - **`notificationSchedule`:**
    - At `new Date(2026, 6, 8, 8, 0)` it includes `{ date: '2026-07-08', day: '2024-07-08', body: '2 years ago: <concert title>' }`.
    - At `new Date(2026, 6, 8, 9, 30)` it does **not** include `2026-07-08`.
    - Every entry's `date` is within 30 days.
    - A special-only day is never present.
- [ ] **Step 2: Run it and watch it fail.** Run `npx tsx .superpowers/checks/story.check.ts`. Expected: module not found.
- [ ] **Step 3: Implement `utils/story.ts`,** and export it from `utils/index.ts`.
- [ ] **Step 4: Run it and watch it pass.** Expected: `story: all checks passed`. The other three checks still pass.
- [ ] **Step 5: Type-check.** Expected: `45`.
- [ ] **Step 6: Commit** `feat(story): pure story, memory and schedule logic`.

---

### Task 2: Full story screen

**Files:**
- Create: `app/(tabs)/YouTwo/Story.tsx`
- Modify: `constants/index.ts` (`'/YouTwo/Story'`)

**Interfaces:**
- Consumes: `buildStory` (Task 1); `useMilestones`, `useGallery`, `usePlaces` (for `byId`, `places` and `savePlace`); `PhotoViewer`; `parseDay`.
- Produces: the route `/(tabs)/YouTwo/Story` with an optional `day` param.

**Screen:**
- A header with back and the title "Our story".
- A `SectionList`:
  - one section per `StoryYear` (header: the year in `primary`, bold, large);
  - one item per `StoryDay`.
- **Each item:**
  - A day marker ("Jul 8") in `textSecondary`.
  - The content, indented, with a 2 px left border in `theme.colors.border`.
  - **Milestone cards:** emoji and title (bold), note, "📍 {place name}" (taps → `Places?focus=`). Tapping the card → `router.navigate({ pathname: '/(tabs)/YouTwo', params: { milestone: m.id } } as unknown as Href)`.
  - **The day's photos:** a row of 46 px thumbnails (`thumbUrl ?? url`). The milestone's own photo, if any, comes first. Tapping one opens `PhotoViewer` over that day's photos, in order.
  - **Photos-only days:** `"{n} photo(s) · {place}"` above the thumbnails.
- **`day` param:** once the data has loaded, find the section and item index and `scrollToLocation({ sectionIndex, itemIndex, viewOffset: 80, animated: true })`. If it fails, catch `onScrollToIndexFailed` and retry after a short delay, without retrying more than twice. An unknown day means it stays at the top.
- **Empty story:** "Your story starts with your first milestone or photo", plus a button → `router.back()`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(story): full story timeline screen`.

---

### Task 3: On this day card and "Our story" preview

**Files:**
- Create: `components/OnThisDayCard/` (+ `index.ts`); modify `components/index.ts`
- Modify: `app/(tabs)/YouTwo/index.tsx`

**Interfaces:**
- Consumes: `buildStory`, `memoriesOn`, `pickHighlight`, `yearsText` (Task 1); `usePlaces().byId`; the screen's existing `useToday()`.
- Produces: `OnThisDayCard({ highlight, placeName, onPress }: { highlight: Highlight; placeName?: string; onPress: () => void })`
  - A rounded card with an accent gradient wash.
  - A 64 px thumbnail: the milestone's `photo.thumbUrl ?? photo.url`, otherwise the first photo's, otherwise the milestone emoji on `primary`.
  - Text lines:
    1. `"ON THIS DAY · " + yearsText(...).toUpperCase()`, small, in `primary`;
    2. the title, bold;
    3. `"📍 {place} · {n} photos"` (each part only when present), plus `" · +{more} more"` when `more > 0`.

**Screen:**
- `const story = useMemo(() => buildStory(milestones, gallery.photos), …)`
- `const highlight = useMemo(() => pickHighlight(memoriesOn(story, today)), [story, today])`. Special milestones are included here.
- Render the card under `YouTwoHeader`, above `PhotoStrip`, only when `highlight` is set. On press, `router.push({ pathname: '/(tabs)/YouTwo/Story', params: { day: highlight.day } } as unknown as Href)`.
- **"Our story":** replace the full list with the **2 most recent** milestones by `day` (descending), shown with `MilestoneRow` (tap → the edit modal, as before), keep "+ Add milestone", and add a "See full story ›" link (in `primary`) → `/(tabs)/YouTwo/Story`.
  - Keep the empty state ("Add your first milestone").

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(story): on this day card and story preview on You Two`.

---

### Task 4: Morning notifications

**Files:**
- Create: `services/onThisDay.ts`, `hooks/useOnThisDayNotifications.tsx`; modify `hooks/index.ts`
- Modify: `app/(tabs)/_layout.tsx` (mount the hook once)

**Interfaces:**
- Consumes: `buildStory` and `notificationSchedule` (Task 1); `useMilestones` and `useGallery`.
- Produces (`services/onThisDay.ts`):
  - `ON_THIS_DAY_KEY = '@SignificantOther:onThisDayEnabled'`
  - `isOnThisDayEnabled(): Promise<boolean>`: missing means `true`.
  - `setOnThisDayEnabled(on: boolean): Promise<void>`: stores the value, then calls `requestOnThisDayReschedule()`.
  - `cancelOnThisDay(): Promise<void>`: `getAllScheduledNotificationsAsync()` → cancel each id that starts with `'onthisday-'`.
  - `scheduleOnThisDay(items: ScheduledMemory[]): Promise<void>`:
    - `cancelOnThisDay()` first.
    - Then, if enabled **and** `(await Notifications.getPermissionsAsync()).granted`, schedule each item with:
      - `identifier: 'onthisday-' + item.date`;
      - `content: { title, body, data: { kind: 'onThisDay', day: item.day } }`;
      - `trigger: { type: SchedulableTriggerInputTypes.DATE, date: <item.date at 09:00 local> }`.
    - Errors are caught and logged.
  - `registerOnThisDayRescheduler(fn: () => void): () => void` and `requestOnThisDayReschedule(): void`. A module-level single subscriber, so the modal can ask the mounted hook to reschedule.
- Produces: `useOnThisDayNotifications(): void`.
  - **Rescheduling:**
    - Recompute `notificationSchedule(buildStory(milestones, photos), new Date())` and call `scheduleOnThisDay`.
    - Run once both data sets have loaded, and whenever they change (debounced 1 s).
    - Also run on `AppState` → `'active'`, and when `requestOnThisDayReschedule()` is called.
  - **Taps:** `Notifications.addNotificationResponseReceivedListener` plus a single `getLastNotificationResponseAsync()` on mount. When `data.kind === 'onThisDay'`, push `{ pathname: '/(tabs)/YouTwo/Story', params: { day } }`. Handle each response identifier only once (keep a ref of handled ids).

- [ ] **Step 1: Implement.** Mount `useOnThisDayNotifications()` in `HomeLayout` in `app/(tabs)/_layout.tsx`.
- [ ] **Step 2: Scan and type-check.** Run `grep -rn "cancelAllScheduledNotificationsAsync\|getPermission()\|requestPermission" services/onThisDay.ts hooks/useOnThisDayNotifications.tsx`. Expected: no output. Type-check: `45`.
- [ ] **Step 3: Commit** `feat(story): on this day morning notifications`.

---

### Task 5: Notification Settings switch

**Files:**
- Modify: `components/NotificationsModal/NotificationsModal.tsx`

**Interfaces:**
- Consumes: `isOnThisDayEnabled`, `setOnThisDayEnabled`, `requestOnThisDayReschedule` (Task 4).

**Changes:**
- A second row under the main switch: the label `"On this day"`, the subtitle `"A morning note on days with a memory"` (`textSecondary`, xs), and a `Switch` bound to the stored value (loaded on open). It's disabled while the main switch is off.
- **Off means off:** in `onSwitchChange`, when turning the main switch **off**, also `setOnThisDayEnabled(false)` and update local state. Turning it on doesn't change the On this day setting.
- **After save:** at the end of `handleSave`, call `requestOnThisDayReschedule()`. The existing `cancelAllNotifications()` there wipes ours too, so this puts them back. Don't otherwise change the existing check-in code.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(story): on this day switch in notification settings`.

---

### Task 6: Final checks and device checklist

- [ ] **Step 1: Run the checks.** All four `tsx` checks pass; tsc gives `45`.
- [ ] **Step 2: Hand the device checklist to the user** (spec, Verification):
  1. With a milestone or photos dated today's month and day in a past year, the card shows; on other days it doesn't. A special milestone shows on the card.
  2. The story reads oldest first with year headers. Milestone photos aren't duplicated. Photos open the viewer, milestones open their editor, and "📍" opens the map.
  3. "See full story ›" and the card both open the story, and the card scrolls to its day.
  4. Set the phone's date to the day before a non-special memory: a 9:00 "On this day 💞" arrives, and tapping it (including from a closed app) opens the story at that day. The check-in reminder still fires. The switch off removes it, and the main switch off keeps it off after reopening the app. A special-only day never notifies.
