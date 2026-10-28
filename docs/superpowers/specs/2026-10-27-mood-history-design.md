# Mood History

## Goal

Keep a history of both partners' feelings and show it as a month calendar
the couple can look back through together ("what was going on that
week?").

## Why

Today a feeling is a single `selectedFeeling` field on
`rooms/{roomId}/users/{uid}`, overwritten on every change
(`updateFeeling` in `hooks/useFirebase.tsx`). Once someone picks a new
feeling the old one is gone. The purpose here is reminiscing, not analytics
or alerts.

## Decisions made during brainstorming

- **Purpose:** looking back together. No stats, charts or "check in on
  your partner" alerts.
- **Granularity:** every change is kept, in order. A calendar day shows
  each person's **last** feeling that day; tapping the day lists every
  change with its time.
- **Who writes the log:** the app, not a Cloud Function. No changes to
  `SignificantOtherCF`.

## Data model

New Realtime Database subtree, grouped by month so the calendar only
downloads the month it shows:

```
rooms/{roomId}/feelingHistory/{uid}/{YYYY-MM}/{pushId}: {
  feeling: string,   // a key of FEELINGS_MAP, e.g. "happy"
  at: number         // Date.now() when it was saved
}
```

- `YYYY-MM` is the **writer's local** month at the time of saving.
- `pushId` comes from Firebase `push()`, so keys are already in time order.
- No index or database-rules change is needed: reads are a plain `get` of
  one month node per user.

New type in `types/FeelingHistory.ts`:

```ts
export type FeelingHistoryEntry = { feeling: string; at: number };
export type FeelingHistoryMonth = { [pushId: string]: FeelingHistoryEntry };
```

## Components

### 1. Firebase functions (`hooks/useFirebase.tsx`)

- `logFeelingHistory(roomId, uid, feeling)`: `push`es `{ feeling, at: Date.now() }`
  under `feelingHistory/{uid}/{YYYY-MM}` for the current local month.
- `getFeelingHistoryMonth(roomId, uid, month: string)`: one-shot `get` of
  `feelingHistory/{uid}/{month}`, returns `FeelingHistoryEntry[]` sorted by
  `at` (empty array when the node doesn't exist).

Both are exported from the hook's return object like the other functions.

### 2. Logging on save (`hooks/useFeelings.tsx`)

In `handleFeelingSend`, after `updateFeeling` succeeds:

- If `selectedFeeling !== oldFeeling` (the feeling held when the modal
  opened), call `logFeelingHistory`. Re-saving the same feeling adds no
  entry.
- The history write is in its own `try/catch` that only logs the error,
  so a failed history write never blocks or rolls back the feeling
  update, and never shows an error toast.

`useFeelings` receives `logFeelingHistory` as a new prop, the same way it
receives `updateFeeling` today; the Home screen passes it in.

### 3. Pure helpers (`utils/feelingHistory.ts`)

- `monthKey(timestamp: number): string`: local `YYYY-MM`.
- `shiftMonth(month: string, delta: number): string`: previous/next month
  for the arrows.
- `groupByDay(entries: FeelingHistoryEntry[]): { [day: number]: FeelingHistoryEntry[] }`:
  groups by local day of month, each list in time order.
- `lastFeelingPerDay(entries)`: `{ [day: number]: string }`, the last
  feeling of each day, for the calendar cells.

### 4. Screen (`app/(tabs)/Home/MoodHistory.tsx`, new)

- **Header:** month name and year, with ‹ › buttons. The › button is
  disabled on the current month (no future months).
- **Calendar grid:** 7 columns, weeks starting Monday, leading blanks for
  the first week. Each day cell shows the day number and two small emojis
  (`FEELING_EMOJIS`): the user's last feeling of the day and the
  partner's. A side with no entry that day is left empty. Today's cell is
  highlighted.
- **Legend:** a single line above the grid showing which side is "You" and
  which is the partner's name (from Redux `room.partnerName`).
- **Day sheet:** tapping a day with any entries opens a modal titled with
  the date, with two sections (You, then partner) listing each change as
  `HH:mm  {emoji} {label}` in time order. Days with no entries don't open
  anything.
- **Data loading:** on mount and on month change, fetch the user's and the
  partner's month in parallel with `getFeelingHistoryMonth`. Show the
  existing `AnimatedHeartLoader` while loading. Months already fetched in
  this visit are kept in component state, so going back and forth doesn't
  refetch. The current month is refetched on pull-to-refresh.
- Styling follows the existing Home sub-screens (`ScreenContainer`,
  `useAppTheme` tokens).

### 5. Entry point (`app/(tabs)/Home/index.tsx`)

A small "History" text button beside the feelings area that runs
`router.push('/(tabs)/Home/MoodHistory')`, the same pattern as the other
Home sub-screens.

## Error handling & edge cases

- **History starts empty** when the feature ships. Past feelings can't be
  recovered. Empty months show the grid with no emojis and a short line:
  "No feelings logged this month yet".
- **Timezones:** months and days come from the device's local time. If the
  couple are in different timezones, a change near midnight can appear on
  the neighbouring day for the other partner. Accepted.
- **Unknown feeling key** (e.g. an old or removed feeling): shown as ❔
  with the raw key as its label.
- **Fetch fails:** show a toast ("Couldn't load mood history") and keep
  whatever is already shown. The arrows keep working.
- **No partner yet** (`partnerId` empty): show only the user's side; the
  legend omits the partner.
- **Retention:** history is kept indefinitely.

## Testing

No automated tests (the project has no test runner and the user chose not
to add one for the previous feature either). Check by type-checking with no
new errors (`npx tsc --noEmit` currently reports 45 pre-existing errors),
then on a device:

- Change feeling a few times on both phones. Today's cell shows each
  person's latest feeling; tapping it lists every change with times.
- Re-save the same feeling. No new entry appears.
- Move to the previous month: empty-month message. The › arrow is disabled
  on the current month.
- Turn on airplane mode and change feeling: the feeling update and history
  both queue offline and sync later (Realtime Database offline writes); no
  error toast.

## Out of scope

- Stats, charts, trends, or alerts.
- Showing history on the home-screen widget.
- Backfilling past feelings.
- Editing or deleting history entries.
- A Cloud Function writer.
