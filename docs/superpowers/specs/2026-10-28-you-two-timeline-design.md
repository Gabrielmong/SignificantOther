# "You Two" Timeline + On this day

## Goal

The last piece of "You Two" turns the couple's milestones, photos and
places into one story they can scroll back through. It adds three things:

- an **"On this day"** card that surfaces a memory from today's date in a
  past year;
- a gentle **morning notification** on days that have one;
- a **full story timeline** screen.

"Our story" on the You Two tab becomes a short preview that leads into the
timeline.

## Why

The first three pieces store the memories: milestones
(`2026-10-28-you-two-tab-design.md`), the gallery
(`2026-10-28-you-two-gallery-design.md`), and places
(`2026-10-28-you-two-places-design.md`). All three are merged. This piece
brings them back to the couple. The timeline is for looking back together;
On this day is a small, unprompted moment of remembering. The user asked
for suggestions, then approved the proposal below (mockups) and the
morning notification.

## Decisions made during brainstorming

These were proposed by Claude and approved by the user.

- **On this day card:**
  - Sits near the top of You Two, right under the header/counter, above
    Photos.
  - It **only appears when something happened on today's month and day
    in an earlier year.**
  - It shows the most meaningful match: "On this day · N years ago",
    title, "📍 place" if any, and a photo count / thumbnail.
  - Tapping it opens the full story scrolled to that day.
- **Full story timeline:**
  - One screen, **oldest first** (it reads as a story), with **year
    headers** and **day markers**.
  - Each day groups what happened then:
    - a **milestone** shows as a card (emoji, title, note, "📍 place"),
      with that day's photos underneath;
    - a day with **only photos** shows a small row of thumbnails,
      labeled with their place if they have one.
  - **Places never appear on their own** (they have no reliable date).
    They appear through the milestones and photos linked to them.
- **"Our story" on You Two** becomes a preview:
  - the latest 2 milestones;
  - "+ Add milestone";
  - "See full story ›".
- **Morning notification:**
  - On days with a memory, a local notification in the morning:
    "On this day, 2 years ago: {title}".
  - Tapping it opens the full story at that day.
  - Only days with a memory get one.

## Current state (what the builder starts from)

- **You Two tab** (`app/(tabs)/YouTwo/index.tsx`) renders, in order:
  - `YouTwoHeader` (with the counter, driven by `useToday()`, a local hook
    that refreshes at midnight and on app foreground);
  - `PhotoStrip`;
  - `PlacesPreview`;
  - "Our story" (the full milestone list via `MilestoneRow`, plus
    "+ Add milestone").

  `MilestoneModal` handles add/edit. The screen reads the route param
  `milestone` to open a milestone. Sub-screens `Photos.tsx` and
  `Places.tsx` exist, hidden from the tab bar through `TAB_HIDDEN_ROUTES`
  in `constants/index.ts`.
- **Data hooks:**
  - `useMilestones()` → `milestones` (sorted oldest first);
  - `useGallery()` → `photos` (newest first; `Photo` has `day`,
    `placeId`, `milestoneId` on milestone mirrors `ms-{id}`, `thumbUrl`);
  - `usePlaces()` → `places`, `byId`.

  Milestone photos are mirrored into the gallery as `ms-{milestoneId}`
  entries with the milestone's day.
- **Dates:**
  - Every milestone and photo has `day: "YYYY-MM-DD"`.
  - `utils/milestones.ts` has `parseDay`, `toDay`, `daysSince` and
    `ymdSince`, and handles Feb 29 → Feb 28 in `nextOccurrence`.
- **Notifications:**
  - `expo-notifications` ~0.32 is installed.
  - The only local schedule today is the daily check-in reminder in
    `components/NotificationsModal/NotificationsModal.tsx`. It uses
    `scheduleNotificationAsync` with a CALENDAR trigger.
  - Turning notifications *off* there calls
    `cancelAllScheduledNotificationsAsync()`.
  - Push (FCM) is used for widget refresh and partner updates, not for
    this.
- **Conventions:**
  - Pure logic goes in `utils/`, checked with `npx tsx` scripts in the
    git-ignored `.superpowers/checks/`.
  - There is no test runner. The tsc baseline is 45 errors and must not
    grow.
  - Push routes with the `as Href` / `as unknown as Href` casts, and use
    `router.navigate` to go back to an existing screen.

## Components

### 1. Story model (pure logic)

- **Building the story** *(builder names it, e.g.
  `buildStory(milestones, photos, places)`)*:
  - Returns years (ascending) → days (ascending) → for each day, its
    milestones and its photos.
  - A milestone's own mirror photo (`ms-{id}`) is shown as part of that
    milestone, not as a separate photo.
  - Other photos dated the same day appear under that day's milestones;
    if there's no milestone, they make a "photos only" day.
  - Each day carries a place label: the milestone's place, otherwise the
    most common place among that day's photos.
- **Finding memories for a date** *(e.g. `memoriesOn(story, date)`)*:
  - Everything whose month/day equals the date's, in an **earlier year**.
    Today's own entries never count.
  - A Feb 29 memory counts on **Feb 28 in non-leap years** *(Claude's
    call, same rule as anniversaries)*.
- **Picking the highlight** for the card and the notification:
  1. a milestone (the most recent year first);
  2. otherwise the day with the most photos (the most recent year
     first).

  The text is "{N} year(s) ago", with the title being the milestone
  title, or "{n} photos" plus the place if known.

### 2. On this day card

- Placed under `YouTwoHeader`, above `PhotoStrip`.
- Shows: the highlight's thumbnail (the milestone's photo, else the
  day's first photo, else the milestone emoji on an accent background),
  "ON THIS DAY · N YEARS AGO", the title, and "📍 place · n photos" when
  present.
  - If there are several memories, it adds "+{k} more" *(Claude's call)*.
- Hidden entirely when there are no memories for today.
- Uses the existing `useToday()`, so it changes at midnight.
- Tapping it opens the full story at that day (§3).

### 3. Full story screen

- **Route:** `app/(tabs)/YouTwo/Story.tsx`, with the tab bar hidden (add
  `'/YouTwo/Story'` to `TAB_HIDDEN_ROUTES`) and a back button, matching
  `Photos.tsx`.
- **Layout:**
  - Year headers in the accent color, then day markers ("Jul 8"), then
    the day's content indented along a thin vertical line (as in the
    mockup).
  - **Milestone card:** emoji and title (bold), note, "📍 place" (taps
    open `Places?focus=`), and a thumbnail row of that day's photos.
  - **Photos-only day:** "{n} photos · {place}" plus thumbnails.
  - Tapping a thumbnail opens the existing `PhotoViewer` over that day's
    photos.
  - Tapping a milestone card opens it with
    `router.navigate('/(tabs)/YouTwo', { milestone })`, the existing
    route param.
- **Long stories:** it must render a few years of data smoothly, so
  build it on a virtualized list (`SectionList` with year sections).
- **Opening at a day:** a `day=YYYY-MM-DD` route param scrolls to that
  day's marker. If the day doesn't exist, the screen just opens at the
  top.
- **Empty story:** "Your story starts with your first milestone or
  photo", plus a button that goes back to add one.

### 4. "Our story" preview on You Two

- Replace the full milestone list with:
  - the **2 most recent milestones by day** (`MilestoneRow`, tap → edit,
    as today);
  - "+ Add milestone" (unchanged);
  - "See full story ›", which goes to `/(tabs)/YouTwo/Story`.
- The header's dating prompt and the milestone-param handling are
  unchanged.

### 5. Morning notification

*(Claude's calls on mechanism, building on the existing local-notification
pattern.)*

- **Local, scheduled on each phone.** No server or Cloud Function changes.
- **Special milestones never trigger it** (decided by the user: "no need
  for additional notifications of special milestones"). Met, dating,
  engaged and married already get anniversary countdowns that show
  "Today 🎉" on Home and the widget.
  - A day is only scheduled when it has a memory **other than** those
    four kinds: a custom milestone, or photos that aren't those
    milestones' mirrors.
  - The notification text uses the highlight chosen from those
    remaining memories.
  - *(Claude's call)* The On this day **card** in the app still shows
    special milestones. It's not a notification, and seeing "Started
    dating, 3 years ago" while looking at You Two is welcome.
- **Schedule:**
  - Compute the next **30 days** that have memories, and schedule one
    notification per such day at **9:00 local time**, using a DATE
    trigger for that day.
  - Title: "On this day 💞".
  - Body: "{N} year(s) ago: {highlight title}".
  - `data: { kind: 'onThisDay', day }`.
- **Rescheduling:**
  - Reschedule whenever the story data changes and when the app
    foregrounds.
  - Use stable identifiers (`onthisday-YYYY-MM-DD`). Cancel the old
    `onthisday-*` ones before scheduling, and **never** touch the
    check-in reminder.
- **Opening it:** tapping the notification opens the full story at that
  day (`Story?day=…`), through
  `Notifications.addNotificationResponseReceivedListener`, plus
  `getLastNotificationResponseAsync` for cold starts.
- **On/off:**
  - On by default *(Claude's call)*, with a switch "On this day" in the
    existing Notification Settings modal, stored on the device
    (AsyncStorage).
  - **Off means off** *(Claude's call, builder-check follow-up)*:
    - Turning the modal's main notifications switch off also turns
      "On this day" off and saves that. Today the main switch's off state
      isn't saved (the modal reads it from the system permission), so
      without this, foreground rescheduling would bring the
      notifications back.
    - Turning the main switch back on doesn't turn "On this day" back on
      by itself; the user flips it.
  - **Permission:** check with `Notifications.getPermissionsAsync()`,
    never with the existing `getPermission()`, which calls
    `requestPermission()` and can prompt. If permission isn't granted,
    nothing is scheduled and nothing is asked.
  - **The check-in "Save" path also cancels every scheduled notification**
    (`cancelAllNotifications()`, which also unregisters FCM). *(Claude's
    call, builder-check follow-up:)* leave that existing code alone, and
    reschedule On this day right after the modal saves. The
    unregister-on-save behaviour looks like an existing bug, but it's out
    of scope here; it's noted for the user.
- **Each partner** gets their own notification on their own phone.

## Non-goals

- Server-side or push notifications for On this day.
- Editing content from the timeline, beyond opening the existing
  milestone and photo editors.
- Places without a date appearing in the timeline.
- Sharing or exporting the story.
- Including other app data (journal entries, countdowns, daily
  questions) in the timeline.

## Anti-goals

*(Claude's call)*

- **A noisy notification:** sent on days with nothing, sent twice, or
  sent at night.
- **Breaking the existing check-in reminder** while managing On this day
  notifications.
- **A sluggish timeline** once there are a few hundred photos.
- **The same memory twice:** a milestone's photo showing both as the
  milestone and as a separate photo.

## Verification

Run `npx tsc --noEmit` (no new errors) and `tsx` checks for the pure
logic:

- grouping by year and day, with mirrors folded into their milestone;
- photos-only days and their place label;
- memories on a date: earlier years only, Feb 29 on Feb 28 in non-leap
  years, today excluded;
- highlight choice and wording ("1 year ago" vs "2 years ago");
- the 30-day schedule list, with only days that have memories.

Then on a device:

1. With a milestone dated today's month and day in a past year, the card
   shows; on other days it's hidden.
2. The full story reads oldest first with year headers. Milestone photos
   aren't duplicated. Tapping a photo opens the viewer; tapping a
   milestone opens it.
3. "See full story ›" and the card both open the story; the card scrolls
   to its day.
4. Set the phone's date to the day before a memory: a 9:00 notification
   arrives, and tapping it opens the story at that day. The check-in
   reminder still fires. Turning the "On this day" switch off removes
   them.

## Left to the builder

- Function and component names and the file split.
- The exact visual treatment of the timeline line and markers, within
  the theme.
- How the list scrolls to a day: `scrollToLocation`, with a measured or
  estimated `getItemLayout`, or a fallback.
- Where the notification scheduling hook lives, e.g. mounted once in the
  You Two screen or app-wide inside the auth tree. It must run even if
  the user doesn't open You Two that day, so app-wide is preferred.
