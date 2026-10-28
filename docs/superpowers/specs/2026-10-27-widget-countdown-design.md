# Next Countdown on the Partner Status Widgets (Android)

## Goal

Show the room's nearest upcoming countdown (e.g. "🎂 Anniversary · 12 days")
on the two existing home-screen widgets, `PartnerStatus` and
`PartnerStatusCompact`, instead of adding a separate countdown widget.

## Why

Countdowns are one of the things the couple checks most, and the widgets
already exist as the "glance without opening the app" surface. Folding the
countdown into them keeps the home screen to one widget.

## Decisions made during brainstorming

- **Which countdown:** the nearest upcoming one, chosen automatically. No
  pinning or "show on widget" toggle.
- **Placement:** a footer pill in both sizes. On the big widget it is a slim
  row at the bottom; on the compact widget it is a small pill on the right
  edge so the message line keeps its width.
- **Sync approach:** client-side only, plus the widget's existing 30-minute
  fallback refresh. No Cloud Function changes.

## Key constraint: the day count changes on its own

"12 days" becomes "11 days" at midnight without any data changing. So the
widget caches the countdown's **target date**, not a pre-formatted label,
and computes the label at render time. Android already re-runs the widget
task every 30 minutes (`updatePeriodMillis: 1800000` in `app.config.ts`),
which re-renders from cache first, so the label stays correct without
pushes.

## Components

### 1. Data shape (`services/widgetTask.ts`)

Extend `WidgetDisplayData`:

```ts
export type WidgetCountdown = {
  title: string;
  icon: string; // emoji
  date: number; // timestamp of the next occurrence
};

export type WidgetDisplayData = {
  flower: string;
  message: string;
  feeling: string;
  partnerName: string;
  updatedAt: number;
  nextCountdown?: WidgetCountdown | null;
};
```

Add a `mergeWidgetLastData(partial: Partial<WidgetDisplayData>)` helper that
reads the cached value, shallow-merges `partial` over it, writes it back and
returns the merged result. Every writer goes through this, so the
flower/feeling push no longer wipes the countdown and the countdown update
no longer wipes the partner data.

### 2. Pure helpers (`utils/countdown.ts`)

- `getNextCountdown(countdowns: CountdownObject, now = Date.now()): WidgetCountdown | null`
  - For each countdown, if it is recurring and its date has passed, roll it
    forward with the existing `calculateNextRecurrenceDate` until it is in
    the future (same loop `useCountdowns` already uses).
  - Drop non-recurring countdowns whose date is before the start of today.
    One whose date is today still counts ("Today").
  - Return the one with the smallest date, or `null` if none remain.
- `formatCountdownLabel(date: number, now = Date.now()): { days: number; long: string; short: string } | null`
  - `days` counts **calendar days** between local midnight of `now` and
    local midnight of `date`, not 24-hour blocks.
  - `days === 0` → long `"Today 🎉"`, short `"Today"`.
  - `days === 1` → long `"Tomorrow"`, short `"1d"`.
  - otherwise → long `"N days"`, short `"Nd"`.
  - `days < 0` (a cached countdown that has since passed) → `null`, so the
    pill is hidden until the next refresh replaces it.

### 3. Shared widget render helper (`widgets/renderWidgets.tsx`, new)

`renderAllWidgets(data: WidgetDisplayData)` calls `requestWidgetUpdate` for
both `PartnerStatus` and `PartnerStatusCompact`, with the same
`widgetNotFound` logging as today. This removes the duplicated pair of calls
in `app/_layout.tsx`. It is reused by the countdown sync below.

### 4. Writers

- **FCM `widget-refresh` handler (`app/_layout.tsx`):** builds the same
  partner fields as today but calls `mergeWidgetLastData` instead of
  `setWidgetLastData`, then `renderAllWidgets(merged)`.
- **Fallback task (`widgets/widgetTaskHandler.tsx`, `refreshFromFirebase`):**
  in addition to the existing `rooms/{roomId}/users/{partnerId}` read, does a
  one-shot `get` of `rooms/{roomId}/countdowns`, runs `getNextCountdown`, and
  includes `nextCountdown` in the data it caches and renders. The two reads
  run in parallel. If the countdowns read fails, the partner data still
  renders and `nextCountdown` keeps its cached value.
- **App, on countdown changes (`hooks/useCountdowns.tsx`):** in the existing
  `listenToCountdownChanges` callback, compute `getNextCountdown` and, only
  if it differs from the last value sent (compare title, icon and date),
  call `mergeWidgetLastData({ nextCountdown })` then `renderAllWidgets`.
  Guarded by `Platform.OS === 'android'`. This makes the widget on the
  device that made the change update immediately. The partner's widget
  catches up when they open the app or on the next 30-minute fallback.

### 5. Widget UI (`widgets/PartnerStatusWidget.tsx`)

- A `CountdownPill` component: rounded pill, `rgba(255, 255, 255, 0.2)`
  background, white 600-weight text, matching the existing feeling pill.
- **Big widget:** pill pinned to the bottom of the card, text
  `"{icon} {title} · {long}"`, single line, truncated at the end.
- **Compact widget:** pill on the right edge of the row, text
  `"{icon} {short}"`. The name/feeling/message column keeps `flex: 1`, so it
  shrinks and the pill keeps its width.
- Not shown when `nextCountdown` is missing or `formatCountdownLabel`
  returns `null`.
- The placeholder card ("Waiting for an update…") is unchanged and does not
  show a countdown.

## Error handling & edge cases

- **No countdowns in the room:** `nextCountdown` is `null`, no pill.
- **Cached countdown passes while the widget sits idle:** the label helper
  returns `null` and the pill hides. In the same update cycle the fallback
  read replaces it with the next one.
- **Countdowns written before `recurrence` existed:** treat missing
  `recurrence` as `'none'`, the same as `useCountdowns`.
- **Sign-out:** `clearWidgetTaskUserInfo` already removes the whole cached
  data key, countdown included.
- **iOS:** no widget exists, and the `useCountdowns` sync is skipped.

## Testing

No automated tests: the project has no test runner and the user chose not
to add one for this feature. Changes are checked by type-checking and on a
device:

- Add a countdown on device A. A's widget shows it right away.
- Device B's widget shows it after opening the app or within 30 minutes.
- Change flower/feeling on A. B's widget updates the partner fields and
  **keeps** the countdown pill (shows the merge works).
- Compact widget at its smallest width: the pill stays readable and the
  message truncates instead.

## Out of scope

- Choosing or pinning which countdown is shown.
- Showing more than one countdown.
- Instant updates on the partner's widget (would need a new
  `onCountdownWritten` Cloud Function in `SignificantOtherCF`).
- iOS widgets.
