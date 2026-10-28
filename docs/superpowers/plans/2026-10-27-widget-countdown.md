# Widget Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the room's nearest upcoming countdown as a footer pill on the existing `PartnerStatus` and `PartnerStatusCompact` Android widgets.

**Architecture:** Pure date helpers in `utils/countdown.ts` pick the nearest countdown and format its label at render time. The widget's AsyncStorage cache gains a `nextCountdown` field, and every writer (FCM push, 30-minute fallback task, in-app countdown listener) merges into the cache instead of overwriting it. A shared `renderAllWidgets` helper redraws both widget sizes.

**Tech Stack:** Expo SDK 54, React Native 0.81, `react-native-android-widget` 0.22, Firebase Realtime Database (web SDK), AsyncStorage. No automated tests (dropped at the user's request); checks are type-checking plus the device checklist in Task 6.

**Spec:** `docs/superpowers/specs/2026-10-27-widget-countdown-design.md`

## Global Constraints

- Android only. Anything that calls `requestWidgetUpdate` from app code is guarded by `Platform.OS === 'android'`.
- No Cloud Function changes (`SignificantOtherCF` is untouched).
- Day counts are **calendar days** in the device's local time, not 24-hour blocks.
- Labels: big widget `"{icon} {title} · {long}"`; compact widget `"{icon} {short}"`. `long` is `"Today 🎉"` / `"Tomorrow"` / `"N days"`; `short` is `"Today"` / `"1d"` / `"Nd"`.
- Pill style matches the existing feeling pill: `backgroundColor: 'rgba(255, 255, 255, 0.2)'`, `borderRadius: 999`, white `fontWeight: '600'` text.
- The "Waiting for an update…" placeholder card is unchanged and shows no countdown.
- Missing `recurrence` on a countdown means `'none'`.
- `npx tsc --noEmit` already reports 45 errors on `main`. Two of them are in a file this plan touches: `hooks/useCountdowns.tsx(40,11)` and `(41,9)`. Do not add new errors; do not fix unrelated ones.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Recurring countdown with a broken custom interval** (`recurrence: 'custom'` but no `recurrenceInterval`/`recurrenceUnit`): `calculateNextRecurrenceDate` returns the same date, so a naive roll-forward loop never ends and hangs the widget task. Expected: the loop stops and the countdown is treated as passed. Handled in Task 1.
2. **Deleting the last countdown in the room:** `listenToCountdownChanges` in `hooks/useFirebase.tsx` only calls back when the snapshot is non-null, so the app never learns the list is empty and the widget keeps showing a deleted countdown. Expected: the pill disappears. Fixed and checked in Task 4.
3. **A flower/feeling push arriving after the countdown was cached:** today the FCM handler overwrites the whole cache. Expected: the partner fields update and the countdown pill stays. Handled in Task 2 (merge), checked on a device in Task 6.
4. **Late-evening `now` with an early-morning countdown tomorrow** (e.g. 23:30 today, 00:30 tomorrow, only 1 hour apart): expected "Tomorrow", not "Today". Handled in Task 1.
5. **Countdown data with a missing or non-numeric `date`** (older or hand-edited rows): expected to be skipped, not to produce `"NaN days"`. Handled in Task 1.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/Countdown.ts` | Modify | Add `WidgetCountdown` type |
| `utils/countdown.ts` | Modify | Add `getNextCountdown`, `formatCountdownLabel`, `isSameWidgetCountdown` |
| `services/widgetTask.ts` | Modify | `nextCountdown` field on `WidgetDisplayData`; `mergeWidgetLastData` |
| `widgets/renderWidgets.tsx` | Create | `renderAllWidgets`, `syncNextCountdownToWidget` |
| `app/_layout.tsx` | Modify | FCM handler merges and uses `renderAllWidgets` |
| `widgets/widgetTaskHandler.tsx` | Modify | Fallback also reads countdowns |
| `hooks/useFirebase.tsx` | Modify | Countdown listener reports empty lists |
| `hooks/useCountdowns.tsx` | Modify | Sync nearest countdown to the widget |
| `widgets/PartnerStatusWidget.tsx` | Modify | `CountdownPill` in both widget sizes |

---

### Task 1: Countdown helpers

**Files:**
- Modify: `types/Countdown.ts`
- Modify: `utils/countdown.ts`

**Interfaces:**
- Consumes: `calculateNextRecurrenceDate(currentDate: number, recurrence: RecurrenceType, recurrenceInterval?: number, recurrenceUnit?: RecurrenceUnit): number` (already in `utils/countdown.ts`).
- Produces:
  - `type WidgetCountdown = { title: string; icon: string; date: number }` exported from `types/Countdown.ts` (and so from `types`).
  - `getNextCountdown(countdowns: CountdownObject | null | undefined, now?: number): WidgetCountdown | null`
  - `formatCountdownLabel(date: number, now?: number): { days: number; long: string; short: string } | null`
  - `isSameWidgetCountdown(a: WidgetCountdown | null | undefined, b: WidgetCountdown | null | undefined): boolean`

- [ ] **Step 1: Add the `WidgetCountdown` type**

Append to `types/Countdown.ts`:
```ts
// The single countdown shown on the home-screen widgets. `date` is the next
// occurrence (recurring countdowns already rolled forward).
export interface WidgetCountdown {
  title: string;
  icon: string;
  date: number;
}
```

- [ ] **Step 2: Implement the helpers**

In `utils/countdown.ts`, change the import line to:
```ts
import { CountdownObject, RecurrenceType, RecurrenceUnit, WidgetCountdown } from '../types';
```
and append:
```ts
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Picks the soonest countdown that is today or later, rolling recurring
 * countdowns forward to their next occurrence.
 * @param countdowns - The room's countdowns
 * @param now - Current time (timestamp), injectable for tests
 * @returns The nearest countdown, or null if there is none
 */
export const getNextCountdown = (
  countdowns: CountdownObject | null | undefined,
  now: number = Date.now(),
): WidgetCountdown | null => {
  const todayStart = startOfLocalDay(now);
  let nearest: WidgetCountdown | null = null;

  for (const countdown of Object.values(countdowns ?? {})) {
    if (!countdown || typeof countdown.date !== 'number' || !Number.isFinite(countdown.date)) {
      continue;
    }

    const recurrence = countdown.recurrence || 'none';
    let date = countdown.date;

    if (recurrence !== 'none') {
      while (date < todayStart) {
        const next = calculateNextRecurrenceDate(
          date,
          recurrence,
          countdown.recurrenceInterval,
          countdown.recurrenceUnit,
        );
        // A custom recurrence with no interval returns the same date; stop
        // rather than loop forever.
        if (next <= date) break;
        date = next;
      }
    }

    if (date < todayStart) continue;

    if (!nearest || date < nearest.date) {
      nearest = { title: countdown.title || '', icon: countdown.icon || '📅', date };
    }
  }

  return nearest;
};

/**
 * Formats how far away a countdown is, in calendar days.
 * @param date - The countdown date (timestamp)
 * @param now - Current time (timestamp), injectable for tests
 * @returns Day count plus long/short labels, or null if the date is on a previous day
 */
export const formatCountdownLabel = (
  date: number,
  now: number = Date.now(),
): { days: number; long: string; short: string } | null => {
  // Math.round absorbs the ±1 hour of a daylight-saving change.
  const days = Math.round((startOfLocalDay(date) - startOfLocalDay(now)) / DAY_MS);

  if (days < 0) return null;
  if (days === 0) return { days, long: 'Today 🎉', short: 'Today' };
  if (days === 1) return { days, long: 'Tomorrow', short: '1d' };
  return { days, long: `${days} days`, short: `${days}d` };
};

/**
 * Checks whether two widget countdowns are the same, treating null and
 * undefined as equal.
 */
export const isSameWidgetCountdown = (
  a: WidgetCountdown | null | undefined,
  b: WidgetCountdown | null | undefined,
): boolean => {
  if (!a || !b) return !a && !b;
  return a.title === b.title && a.icon === b.icon && a.date === b.date;
};
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "^(utils/countdown|types/)"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add types/Countdown.ts utils/countdown.ts
git commit -m "feat: add nearest-countdown and label helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Mergeable widget cache

**Files:**
- Modify: `services/widgetTask.ts`

**Interfaces:**
- Consumes: `WidgetCountdown` from `types` (Task 1).
- Produces:
  - `WidgetDisplayData` gains `nextCountdown?: WidgetCountdown | null`.
  - `mergeWidgetLastData(partial: Partial<WidgetDisplayData>): Promise<WidgetDisplayData>` — merges over the cached value (or over empty defaults when there is none), sets `updatedAt: Date.now()`, saves, and returns the result.

- [ ] **Step 1: Implement**

In `services/widgetTask.ts`, add below the `AsyncStorage` import:
```ts
import { WidgetCountdown } from '../types';
```
Replace the `WidgetDisplayData` type with:
```ts
export type WidgetDisplayData = {
  flower: string;
  message: string;
  feeling: string;
  partnerName: string;
  updatedAt: number;
  nextCountdown?: WidgetCountdown | null;
};
```
Append at the end of the file:
```ts
// Function to merge a partial update into the last-known widget display data.
// Every writer uses this, so a flower/feeling push doesn't wipe the cached
// countdown and a countdown change doesn't wipe the partner fields.
export const mergeWidgetLastData = async (
  partial: Partial<WidgetDisplayData>,
): Promise<WidgetDisplayData> => {
  const cached = await getWidgetLastData();
  const merged: WidgetDisplayData = {
    flower: '',
    message: '',
    feeling: '',
    partnerName: '',
    ...cached,
    ...partial,
    updatedAt: Date.now(),
  };
  await setWidgetLastData(merged);
  return merged;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "^services/widgetTask"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add services/widgetTask.ts
git commit -m "feat: add nextCountdown to widget cache with merge helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared widget render helper and merging FCM handler

**Files:**
- Create: `widgets/renderWidgets.tsx`
- Modify: `app/_layout.tsx:14-16` (imports) and `app/_layout.tsx:60-94` (`handleWidgetRefreshMessage`)

**Interfaces:**
- Consumes: `mergeWidgetLastData`, `WidgetDisplayData` (Task 2); `PartnerStatusWidget`, `PartnerStatusCompactWidget` from `widgets/PartnerStatusWidget.tsx`.
- Produces: `renderAllWidgets(data: WidgetDisplayData): Promise<void>` in `widgets/renderWidgets.tsx`.

`requestWidgetUpdate` is a native call, so this task is checked by type-checking here and on a device in Task 6.

- [ ] **Step 1: Create `widgets/renderWidgets.tsx`**

```tsx
import { requestWidgetUpdate } from 'react-native-android-widget';
import { PartnerStatusWidget, PartnerStatusCompactWidget } from './PartnerStatusWidget';
import { WidgetDisplayData } from '../services/widgetTask';

// Redraws every widget size placed on the home screen with the same data.
export async function renderAllWidgets(data: WidgetDisplayData) {
  await requestWidgetUpdate({
    widgetName: 'PartnerStatus',
    renderWidget: () => <PartnerStatusWidget data={data} />,
    widgetNotFound: () => {
      console.log('PartnerStatus widget not found on home screen, skipping render');
    },
  });

  await requestWidgetUpdate({
    widgetName: 'PartnerStatusCompact',
    renderWidget: () => <PartnerStatusCompactWidget data={data} />,
    widgetNotFound: () => {
      console.log('PartnerStatusCompact widget not found on home screen, skipping render');
    },
  });
}
```

- [ ] **Step 2: Update `app/_layout.tsx` imports**

Replace these three lines:
```tsx
import { requestWidgetUpdate } from 'react-native-android-widget';
import { PartnerStatusWidget, PartnerStatusCompactWidget } from '../widgets/PartnerStatusWidget';
import { setWidgetLastData, WidgetDisplayData } from '../services/widgetTask';
```
with:
```tsx
import { renderAllWidgets } from '../widgets/renderWidgets';
import { mergeWidgetLastData } from '../services/widgetTask';
```

- [ ] **Step 3: Replace the body of `handleWidgetRefreshMessage`**

Replace everything from `const data: WidgetDisplayData = {` through the second `requestWidgetUpdate({ ... });` block with:
```tsx
  // Merge rather than overwrite, so the cached countdown survives a
  // flower/feeling push.
  const data = await mergeWidgetLastData({
    flower: String(remoteMessage.data.flower || ''),
    message: String(remoteMessage.data.message || ''),
    feeling: String(remoteMessage.data.feeling || ''),
    partnerName: String(remoteMessage.data.partnerName || ''),
  });

  await renderAllWidgets(data);
```
The `if (remoteMessage.data?.type !== 'widget-refresh')` guard above and the `return true;` below stay as they are.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "^(widgets/|services/widgetTask|app/_layout)"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add widgets/renderWidgets.tsx app/_layout.tsx
git commit -m "refactor: share widget rendering and merge FCM widget data into cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Countdown sources — fallback task, listener fix, and in-app sync

**Files:**
- Modify: `widgets/widgetTaskHandler.tsx` (`refreshFromFirebase`)
- Modify: `widgets/renderWidgets.tsx` (add `syncNextCountdownToWidget`)
- Modify: `hooks/useFirebase.tsx:745-760` (`listenToCountdownChanges`)
- Modify: `hooks/useCountdowns.tsx:30-44` (listener effect)

**Interfaces:**
- Consumes: `getNextCountdown`, `isSameWidgetCountdown` (Task 1); `getWidgetLastData`, `mergeWidgetLastData`, `WidgetDisplayData` (Task 2); `renderAllWidgets` (Task 3).
- Produces: `syncNextCountdownToWidget(countdowns: CountdownObject): Promise<void>` in `widgets/renderWidgets.tsx`.

- [ ] **Step 1: Fallback task reads countdowns too**

In `widgets/widgetTaskHandler.tsx`, add to the imports:
```tsx
import { getNextCountdown } from '../utils/countdown';
```
and change the `../services/widgetTask` import to also bring in `mergeWidgetLastData` (keep `getWidgetTaskUserInfo`, `getWidgetLastData`, `WidgetDisplayData`; drop `setWidgetLastData`, which is no longer used here).

Replace the `try { ... } catch` block inside `refreshFromFirebase` with:
```tsx
  try {
    const db = getDatabase();
    const [partnerResult, countdownsResult] = await Promise.allSettled([
      get(databaseRef(db, `rooms/${roomId}/users/${partnerId}`)),
      get(databaseRef(db, `rooms/${roomId}/countdowns`)),
    ]);

    if (partnerResult.status === 'rejected') {
      throw partnerResult.reason;
    }

    const snapshot = partnerResult.value;
    if (!snapshot.exists()) {
      return null;
    }

    const partnerData = snapshot.val();
    const update: Partial<WidgetDisplayData> = {
      flower: partnerData.selectedFlower || '',
      message: partnerData.message || '',
      feeling: partnerData.selectedFeeling || '',
      partnerName: partnerName || '',
    };

    // If the countdowns read failed, leave the cached countdown as it is.
    if (countdownsResult.status === 'fulfilled') {
      update.nextCountdown = getNextCountdown(countdownsResult.value.val());
    } else {
      console.error('Widget task: error reading countdowns:', countdownsResult.reason);
    }

    return await mergeWidgetLastData(update);
  } catch (error) {
    console.error('Widget task: error refreshing from Firebase:', error);
    return null;
  }
```
Import `getNextCountdown` from `'../utils/countdown'` directly, not from `'../utils'`, so the headless widget task doesn't pull in the location/geofencing utils.

- [ ] **Step 2: Report empty countdown lists from the listener**

In `hooks/useFirebase.tsx`, inside `listenToCountdownChanges`, replace:
```ts
      const data = snapshot.val();
      if (data) {
        countdownCallback({ countdowns: data });
      }
```
with:
```ts
      // Report an empty list too, so deleting the last countdown clears it.
      countdownCallback({ countdowns: snapshot.val() || {} });
```

- [ ] **Step 3: Add `syncNextCountdownToWidget`**

In `widgets/renderWidgets.tsx`, add to the imports:
```tsx
import { Platform } from 'react-native';
import { CountdownObject } from '../types';
import { getNextCountdown, isSameWidgetCountdown } from '../utils/countdown';
```
change the widgetTask import to:
```tsx
import { getWidgetLastData, mergeWidgetLastData, WidgetDisplayData } from '../services/widgetTask';
```
and append:
```tsx
// Pushes the room's nearest countdown to the widgets when it has changed.
// Several screens listen to countdowns, so compare with the cache to avoid
// redrawing for every listener.
export async function syncNextCountdownToWidget(countdowns: CountdownObject) {
  if (Platform.OS !== 'android') return;

  try {
    const next = getNextCountdown(countdowns);
    const cached = await getWidgetLastData();
    if (cached && isSameWidgetCountdown(cached.nextCountdown, next)) return;

    const data = await mergeWidgetLastData({ nextCountdown: next });
    await renderAllWidgets(data);
  } catch (error) {
    console.error('Error syncing countdown to widget:', error);
  }
}
```

- [ ] **Step 4: Call it from `useCountdowns`**

In `hooks/useCountdowns.tsx`, add the import:
```ts
import { syncNextCountdownToWidget } from '../widgets/renderWidgets';
```
and change the listener callback from:
```ts
    const unsubscribe = listenToCountdownChanges((data) => {
      setCountdowns(data.countdowns);
    }, roomId);
```
to:
```ts
    const unsubscribe = listenToCountdownChanges((data) => {
      setCountdowns(data.countdowns);
      syncNextCountdownToWidget(data.countdowns);
    }, roomId);
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "^(widgets/|services/widgetTask|hooks/useFirebase|hooks/useCountdowns)"`
Expected: only the two pre-existing lines, `hooks/useCountdowns.tsx(40,11)` and `hooks/useCountdowns.tsx(41,9)` (line numbers may shift by the one added line, to 41/42). Nothing else.

- [ ] **Step 6: Commit**

```bash
git add widgets/widgetTaskHandler.tsx widgets/renderWidgets.tsx hooks/useFirebase.tsx hooks/useCountdowns.tsx
git commit -m "feat: feed nearest countdown to widgets from fallback task and app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Countdown pill in both widget sizes

**Files:**
- Modify: `widgets/PartnerStatusWidget.tsx`

**Interfaces:**
- Consumes: `formatCountdownLabel` (Task 1); `WidgetDisplayData.nextCountdown` (Task 2).
- Produces: `CountdownPill` (file-local component).

`react-native-android-widget` components only render inside the widget host, so this task is verified by type-checking and on a device in Task 6.

- [ ] **Step 1: Add the pill component**

In `widgets/PartnerStatusWidget.tsx`, add the import:
```tsx
import { formatCountdownLabel } from '../utils/countdown';
```
and add below `resolvePartnerDisplay`:
```tsx
// Footer pill for the room's nearest countdown. The label is worked out at
// render time so the day count stays right without new data.
function CountdownPill({ data, compact }: { data: WidgetDisplayData; compact: boolean }) {
  const countdown = data.nextCountdown;
  if (!countdown) return null;

  const label = formatCountdownLabel(countdown.date);
  if (!label) return null;

  const text = compact
    ? `${countdown.icon} ${label.short}`
    : `${countdown.icon} ${countdown.title} · ${label.long}`;

  return (
    <FlexWidget
      style={{
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 2 : 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        width: 'wrap_content',
        marginLeft: compact ? 8 : 0,
        marginTop: compact ? 0 : 8,
      }}>
      <TextWidget
        text={text}
        style={{ fontSize: compact ? 11 : 12, color: '#ffffff', fontWeight: '600' }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );
}
```

- [ ] **Step 2: Big widget — pin the pill to the bottom**

In `PartnerStatusWidget`, after the `{!!data.message && ( <TextWidget ... /> )}` block and before the closing `</FlexWidget>` of the outer card, add:
```tsx
      {/* Spacer pushes the countdown pill to the bottom of the card. */}
      <FlexWidget style={{ flex: 1 }} />
      <CountdownPill data={data} compact={false} />
```

- [ ] **Step 3: Compact widget — pill on the right edge**

In `PartnerStatusCompactWidget`, after the closing `</FlexWidget>` of the `flexDirection: 'column', flex: 1` column and before the closing `</FlexWidget>` of the outer row, add:
```tsx
      <CountdownPill data={data} compact />
```
The column keeps `flex: 1`, so it shrinks and the pill keeps its width.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "^widgets/"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add widgets/PartnerStatusWidget.tsx
git commit -m "feat: show nearest countdown pill on partner status widgets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Device verification

**Files:** none (fix-ups only if a check fails).

Widgets need a native build: `npm run android` (or `npm run build:development` for an EAS dev build) on two Android devices or emulators signed in as the two partners. Add both widget sizes to device B's home screen.

- [ ] **Step 1: Own device updates immediately.** On device A (with widgets added there too), create a countdown 12 days out. A's widgets show `🎂 <title> · 12 days` (big) and `🎂 12d` (compact) within a few seconds.
- [ ] **Step 2: Partner device catches up.** On device B, open the app. B's widgets show the same countdown.
- [ ] **Step 3: Merge works.** On device A, change flower or feeling. B's widgets update the partner fields and **still** show the countdown pill.
- [ ] **Step 4: Today / Tomorrow.** Create one-off countdowns for today and tomorrow. The big widget shows `Today 🎉` for the one due today (the nearest).
- [ ] **Step 5: Delete the last countdown.** Delete every countdown in the room. The pill disappears from A's widgets right away.
- [ ] **Step 6: Compact at its narrowest.** Resize the compact widget to its minimum width. The pill stays readable; the message truncates.
- [ ] **Step 7: Report.** Write down which checks passed. If any failed, fix it, re-run the type-check, and commit the fix with a message describing it.
