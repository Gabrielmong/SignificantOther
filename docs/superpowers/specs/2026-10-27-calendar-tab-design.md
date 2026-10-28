# Calendar Tab (Mood History + Countdowns)

## Goal

Turn the Mood history screen into its own bottom tab, "Calendar", and show
the room's countdown events on it alongside both partners' feelings.

## Why

Mood history (spec `2026-10-27-mood-history-design.md`) is currently a Home
sub-screen. The user wants the calendar to be a first-class place in the
app, and wants it to double as the couple's shared calendar of countdown
events (birthdays, anniversaries, trips).

## Decisions made during brainstorming

- **Its own tab.** Tab order: Home · Calendar · Chat · Profile. Icon:
  `CalendarHeart` from `lucide-react-native`.
- **Keep a Home link.** The link under the feeling card stays, renamed
  `Calendar →`, and switches to the Calendar tab.
- **How events show:** the event's emoji in the corner of its day cell,
  plus a "This month" list of the month's events under the grid.
- **Future months:** browsable up to 12 months ahead of the current month.

## Components

### 1. Tab and route (`app/(tabs)/`)

- New folder `app/(tabs)/Calendar/` with `_layout.tsx` (a plain `<Slot />`,
  like `Chat/_layout.tsx`) and `index.tsx` (the screen).
- `app/(tabs)/_layout.tsx`: add a `Tabs.Screen name="Calendar"` between
  Home and Chat, using the same icon wrapper (`View` + `AnimatedTabIcon`)
  as the other tabs, `headerShown: false`.
- Delete `app/(tabs)/Home/MoodHistory.tsx`. Its content moves to
  `Calendar/index.tsx`.
- `constants/index.ts`: remove `'/Home/MoodHistory'` from
  `TAB_HIDDEN_ROUTES`. The Calendar tab keeps the tab bar visible.

### 2. Home link (`app/(tabs)/Home/index.tsx`)

- The existing link under the feeling card changes its text from
  `Mood history →` to `Calendar →` and its handler pushes
  `/(tabs)/Calendar`. Rename `handleMoodHistoryPress` to
  `handleCalendarPress`.

### 3. Screen (`app/(tabs)/Calendar/index.tsx`)

Starts as the current Mood history screen, with these changes:

- **Header:** title `Calendar`; no back arrow. Keep the header bar style
  (surface background, small shadow) and centre the title.
- **Bottom spacing:** the floating tab bar overlaps the bottom of the
  screen, so the scroll content gets enough bottom padding (`96`) for the
  last item to scroll clear of it.
- **Countdowns:** subscribe with the existing
  `listenToCountdownChanges(callback, roomId)` from `useFirebase()` in a
  `useEffect` keyed on `roomId`, unsubscribing on cleanup, storing the
  `CountdownObject` in state. Do not use `useCountdowns` (it carries modal
  state and auto-advance side effects this screen doesn't need).
- **› arrow:** disabled when `month === shiftMonth(currentMonth, 12)`
  (instead of `month === currentMonth`).
- **Empty-mood message:** `No feelings logged this month yet` shows only
  when the displayed month is the current month or earlier, and the month
  has no mood entries.
- **Legend:** unchanged.
- **This month list:** under the grid (and under the empty-mood message),
  a section titled `This month` listing every event occurrence in the
  displayed month, ordered by day then title, each row
  `{icon} {title}` on the left and the short date (e.g. `Thu 28`) on the
  right. Tapping a row opens that day's modal. The section is hidden when
  the month has no events.
- **Day modal:** sections in this order: `Events` (only when the day has
  events; rows `{icon} {title}`), `You`, then the partner (as today).

### 4. Calendar cell (`components/MoodCalendar/MoodCalendar.tsx`)

- New prop `eventIconsByDay: { [day: number]: string }` (the first event's
  emoji for each day).
- The day number row becomes: day number, and the event emoji to its
  right when present (small, `fontSize.xs`).
- A day is tappable when it has a mood entry **or** an event.

### 5. Occurrence helper (`utils/feelingHistory.ts`)

`countdownOccurrencesInMonth(countdowns: CountdownObject | null | undefined, month: string): { [day: number]: CountdownOccurrence[] }`
with `CountdownOccurrence = { id: string; title: string; icon: string; date: number }`.

- Skip countdowns with a missing or non-numeric `date`. Missing
  `recurrence` means `'none'`.
- **One-off (`'none'`):** included on its local day when its date falls in
  `month`.
- **Recurring:** starting from the stored `date`, step **backwards** until
  before the month starts, then step **forwards**, collecting every
  occurrence inside the month. Steps use the countdown's own rule: yearly
  ±1 year, monthly ±1 month, weekly ±7 days, custom ±`recurrenceInterval`
  of `recurrenceUnit`. A custom countdown without a valid positive
  interval and unit is treated as one-off. Each loop is capped (e.g. 1,000
  steps) as a safety net.
- Each day's list is ordered by title. `id` is the countdown's key in the
  object (used for React keys).
- The stepping helper lives next to `calculateNextRecurrenceDate` in
  `utils/countdown.ts` as `stepRecurrence(date, recurrence, interval, unit, direction: 1 | -1)`
  so both directions share one implementation; `calculateNextRecurrenceDate`
  is left as is.

## Error handling & edge cases

- **No countdowns / listener not yet fired:** no event emojis and no
  "This month" list. Moods still load and show as before.
- **Countdown deleted while viewing:** the listener reports the new list
  (it reports `{}` when empty) and the calendar updates.
- **Monthly recurrence on the 29th–31st:** uses JavaScript's date rollover,
  the same as the existing `calculateNextRecurrenceDate`. Accepted.
- **Recurring events before they were created** (e.g. last year's
  birthday): shown. Intended: it's a shared calendar of dates that matter.
- **Future months:** mood fetches still run and return empty; no error.

## Testing

No automated tests (no test runner; user's choice). Type-check with no new
errors (`npx tsc --noEmit`: 45 pre-existing), then on a device:

- The Calendar tab appears between Home and Chat, with the tab bar visible
  and the last list item not hidden behind it.
- Home's `Calendar →` link switches to the Calendar tab.
- A yearly countdown shows in its month this year, next year (browse
  ahead) and last year (browse back). A weekly one shows on every matching
  day of the month.
- Tap a day with only an event: the modal shows the Events section and
  "Nothing logged" for the moods.
- › stops 12 months ahead.

## Out of scope

- Creating or editing countdowns from the calendar.
- Showing more than one event emoji per cell.
- Non-countdown events (journal entries, wishlist dates).
