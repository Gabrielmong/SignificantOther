# Mood History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every feeling change per partner and show both partners' feelings on a month calendar the couple can look back through.

**Architecture:** When a user saves a new feeling, the app appends `{ feeling, at }` under `rooms/{roomId}/feelingHistory/{uid}/{YYYY-MM}` in Firebase Realtime Database. A new `MoodHistory` screen fetches one month per partner, groups entries by local day, and renders a Monday-first calendar (each day shows both partners' last feeling) plus a modal listing every change of a tapped day. Pure date/grouping helpers live in `utils/feelingHistory.ts`.

**Tech Stack:** Expo SDK 54, expo-router 6 (typed routes on), React Native 0.81, gluestack-ui, Firebase Realtime Database web SDK, Redux Toolkit, lucide-react-native. No automated tests (user's choice): verification is type-checking plus the device checklist in Task 5.

**Spec:** `docs/superpowers/specs/2026-10-27-mood-history-design.md`

## Global Constraints

- Work directly on `main`. Do not create a branch.
- Do **not** commit `docs/superpowers/specs/2026-10-27-mood-history-design.md` or this plan file; the user commits docs themselves. Only `git add` the files each task lists.
- Data path: `rooms/{roomId}/feelingHistory/{uid}/{YYYY-MM}/{pushId}: { feeling: string, at: number }`. `YYYY-MM` is the **writer's local** month. Keys come from Firebase `push()`.
- No Cloud Function changes (`SignificantOtherCF` untouched). No database index or rules changes.
- Re-saving the same feeling adds no entry. A failed history write never blocks the feeling update and never shows a toast (console error only).
- Calendar weeks start on **Monday**. The › arrow is disabled on the current month.
- Each day cell: user's last feeling on the left, partner's on the right; a side with no entry is empty; today is highlighted.
- Day modal rows: `HH:mm  {emoji} {label}`, in time order, "You" section first, then the partner.
- Unknown feeling key: emoji `❔`, label = the raw key.
- Empty month copy: `No feelings logged this month yet`. Fetch-failure toast title: `Couldn't load mood history`.
- No partner (`partnerId` empty): only the user's side; legend omits the partner.
- `npx tsc --noEmit` reports **45** errors on `main` before this work. The total must stay 45, except for the one typed-route case described in Task 4.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Viewer and writer in different timezones:** an entry stored in the writer's October bucket can fall on the viewer's 1 November. Expected: it is not drawn on the wrong day of October; it is dropped from that month's grid (the spec accepts the near-midnight edge). Handled in Task 1 (`groupByDay` filters by the displayed month).
2. **A month fails to load** (offline, permissions): expected toast plus an empty grid with a retry hint, not an endless spinner. Handled in Task 4 (`failed` state).
3. **Re-saving the current feeling** from the modal: expected no history entry. Handled in Task 2 (`selectedFeeling !== oldFeeling`).
4. **Malformed history rows** (missing `at` or `feeling`): expected to be skipped, not to crash grouping or show `NaN`. Handled in Task 1 (`getFeelingHistoryMonth` filter).
5. **Rapid month switching:** a slow response for one month must not overwrite another month's data. Handled in Task 4 (results are stored per month key, never as "the current data").

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/FeelingHistory.ts` | Create | `FeelingHistoryEntry`, `FeelingHistoryMonth` types |
| `types/index.ts` | Modify | Re-export the new types |
| `utils/feelingHistory.ts` | Create | Month keys, calendar cells, grouping, formatting, feeling display |
| `hooks/useFirebase.tsx` | Modify | `logFeelingHistory`, `getFeelingHistoryMonth` |
| `hooks/useFeelings.tsx` | Modify | Log history after a changed feeling is saved |
| `components/MoodCalendar/` | Create | Month grid component |
| `components/MoodDayModal/` | Create | Day details modal |
| `components/index.ts` | Modify | Export the two components |
| `app/(tabs)/Home/MoodHistory.tsx` | Create | Screen: header, month nav, data loading, calendar, modal |
| `app/(tabs)/Home/index.tsx` | Modify | Pass `logFeelingHistory` to `useFeelings`; "Mood history" link |

---

### Task 1: History data layer

**Files:**
- Create: `types/FeelingHistory.ts`
- Modify: `types/index.ts`
- Create: `utils/feelingHistory.ts`
- Modify: `hooks/useFirebase.tsx` (imports near the top; new functions next to `updateFeeling` around line 325; return object around line 865)

**Interfaces:**
- Produces:
  - `type FeelingHistoryEntry = { feeling: string; at: number }`, `type FeelingHistoryMonth = { [pushId: string]: FeelingHistoryEntry }` (exported from `types`).
  - From `utils/feelingHistory.ts`:
    - `monthKey(timestamp: number): string` — local `YYYY-MM`
    - `shiftMonth(month: string, delta: number): string`
    - `buildCalendarCells(month: string): (number | null)[]` — Monday-first, length a multiple of 7
    - `groupByDay(entries: FeelingHistoryEntry[], month: string): { [day: number]: FeelingHistoryEntry[] }`
    - `lastFeelingPerDay(byDay: { [day: number]: FeelingHistoryEntry[] }): { [day: number]: string }`
    - `formatTime(at: number): string` — `HH:mm`
    - `formatMonthTitle(month: string): string` — e.g. "October 2026"
    - `formatDayTitle(month: string, day: number): string` — e.g. "Tuesday, 27 October"
    - `feelingDisplay(feeling: string): { emoji: string; label: string }`
  - From `useFirebase()`:
    - `logFeelingHistory(roomId: string, uid: string, feeling: string): Promise<void>`
    - `getFeelingHistoryMonth(roomId: string, uid: string, month: string): Promise<FeelingHistoryEntry[]>` — sorted by `at`, malformed rows dropped, `[]` when missing

- [ ] **Step 1: Add the types**

Create `types/FeelingHistory.ts`:
```ts
// One feeling change, stored under
// rooms/{roomId}/feelingHistory/{uid}/{YYYY-MM}/{pushId}
export type FeelingHistoryEntry = {
  feeling: string;
  at: number;
};

export type FeelingHistoryMonth = {
  [pushId: string]: FeelingHistoryEntry;
};
```
Append to `types/index.ts`:
```ts
export * from './FeelingHistory';
```

- [ ] **Step 2: Add the helpers**

Create `utils/feelingHistory.ts`:
```ts
import { FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { FeelingHistoryEntry } from '../types';

const pad = (value: number) => String(value).padStart(2, '0');

const parseMonthKey = (month: string): { year: number; monthIndex: number } => {
  const [year, monthNumber] = month.split('-').map(Number);
  return { year, monthIndex: monthNumber - 1 };
};

/**
 * Local-time month key used to bucket feeling history.
 * @param timestamp - Any time in the month
 * @returns The month as YYYY-MM
 */
export const monthKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

/**
 * Moves a month key forwards or backwards.
 * @param month - Month as YYYY-MM
 * @param delta - Number of months to move (negative for earlier)
 */
export const shiftMonth = (month: string, delta: number): string => {
  const { year, monthIndex } = parseMonthKey(month);
  return monthKey(new Date(year, monthIndex + delta, 1).getTime());
};

/**
 * Builds the cells of a Monday-first month grid: leading/trailing nulls
 * for blank cells and day numbers in between.
 */
export const buildCalendarCells = (month: string): (number | null)[] => {
  const { year, monthIndex } = parseMonthKey(month);
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
};

/**
 * Groups entries by local day of the month, each day in time order.
 * Entries that fall outside `month` in the viewer's local time (a partner
 * in another timezone) are left out rather than drawn on the wrong day.
 */
export const groupByDay = (
  entries: FeelingHistoryEntry[],
  month: string,
): { [day: number]: FeelingHistoryEntry[] } => {
  const byDay: { [day: number]: FeelingHistoryEntry[] } = {};

  for (const entry of [...entries].sort((a, b) => a.at - b.at)) {
    if (monthKey(entry.at) !== month) continue;
    const day = new Date(entry.at).getDate();
    (byDay[day] ??= []).push(entry);
  }

  return byDay;
};

/**
 * The last feeling of each day, for the calendar cells.
 */
export const lastFeelingPerDay = (byDay: {
  [day: number]: FeelingHistoryEntry[];
}): { [day: number]: string } => {
  const last: { [day: number]: string } = {};
  for (const [day, entries] of Object.entries(byDay)) {
    last[Number(day)] = entries[entries.length - 1].feeling;
  }
  return last;
};

/**
 * Formats a timestamp as local HH:mm.
 */
export const formatTime = (at: number): string => {
  const date = new Date(at);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Month header text, e.g. "October 2026".
 */
export const formatMonthTitle = (month: string): string => {
  const { year, monthIndex } = parseMonthKey(month);
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Day modal title, e.g. "Tuesday, 27 October".
 */
export const formatDayTitle = (month: string, day: number): string => {
  const { year, monthIndex } = parseMonthKey(month);
  return new Date(year, monthIndex, day).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

/**
 * Emoji and label for a feeling key, with a fallback for unknown keys.
 */
export const feelingDisplay = (feeling: string): { emoji: string; label: string } => ({
  emoji: FEELING_EMOJIS[feeling] || '❔',
  label: FEELINGS_LABELS[feeling] || feeling,
});
```
Do **not** add this file to `utils/index.ts`: it imports `constants` (image assets), and `utils/index.ts` is imported by the headless widget task. Import it by path.

- [ ] **Step 3: Add the Firebase functions**

In `hooks/useFirebase.tsx`:

Change the types import line
```ts
import { Activity, ActivityObject, Wishlist, Countdown, CountdownObject } from '../types';
```
to
```ts
import {
  Activity,
  ActivityObject,
  Wishlist,
  Countdown,
  CountdownObject,
  FeelingHistoryEntry,
  FeelingHistoryMonth,
} from '../types';
import { monthKey } from '../utils/feelingHistory';
```

Directly after the `updateFeeling` function, add:
```ts
  const logFeelingHistory = async (roomId: string, uid: string, feeling: string) => {
    const at = Date.now();
    const monthRef = databaseRef(db, `rooms/${roomId}/feelingHistory/${uid}/${monthKey(at)}`);

    await push(monthRef, { feeling, at });
  };

  const getFeelingHistoryMonth = async (
    roomId: string,
    uid: string,
    month: string,
  ): Promise<FeelingHistoryEntry[]> => {
    const monthRef = databaseRef(db, `rooms/${roomId}/feelingHistory/${uid}/${month}`);
    const snapshot = await get(monthRef);
    const data = (snapshot.val() || {}) as FeelingHistoryMonth;

    // Skip malformed rows rather than letting them break grouping.
    return Object.values(data)
      .filter(
        (entry) =>
          !!entry && typeof entry.feeling === 'string' && typeof entry.at === 'number',
      )
      .sort((a, b) => a.at - b.at);
  };
```

In the returned object, directly after `listenToFeelingChanges,`, add:
```ts
    logFeelingHistory,
    getFeelingHistoryMonth,
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^(types/|utils/feelingHistory)"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add types/FeelingHistory.ts types/index.ts utils/feelingHistory.ts hooks/useFirebase.tsx
git commit -m "feat: add feeling history storage and helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Log a changed feeling on save

**Files:**
- Modify: `hooks/useFeelings.tsx` (props interface, destructuring, `handleFeelingSend`)
- Modify: `app/(tabs)/Home/index.tsx` (`useFirebase()` destructuring around line 93; `useFeelings({...})` call around line 164)

**Interfaces:**
- Consumes: `logFeelingHistory(roomId: string, uid: string, feeling: string): Promise<void>` from `useFirebase()` (Task 1).
- Produces: `useFeelings` requires a new prop `logFeelingHistory` with that signature.

- [ ] **Step 1: Add the prop to `useFeelings`**

In `hooks/useFeelings.tsx`, in `interface UseFeelingsProps`, after the `updateFeeling` line add:
```ts
  logFeelingHistory: (roomId: string, userId: string, feeling: string) => Promise<void>;
```
In the destructured parameters of `useFeelings`, after `updateFeeling,` add:
```ts
  logFeelingHistory,
```

- [ ] **Step 2: Log after a successful update**

Replace the whole `handleFeelingSend` `useCallback` with:
```ts
  const handleFeelingSend = useCallback(
    async (selectedFeeling: string) => {
      if (!roomId || !userId) return;

      try {
        setOwnFeeling(selectedFeeling);
        await updateFeeling(roomId, userId, selectedFeeling);

        // Only log actual changes. A failed history write must not affect
        // the feeling update, so it is caught separately and only logged.
        if (selectedFeeling !== oldFeeling) {
          try {
            await logFeelingHistory(roomId, userId, selectedFeeling);
          } catch (error) {
            console.error('Error logging feeling history:', error);
          }
        }

        setShowFeelingModal(false);

        showToast({
          title: 'Feeling updated',
          description: 'Your feeling has been updated',
          status: 'success',
        });
      } catch (error) {
        console.error('Error updating feeling:', error);
      }
    },
    [roomId, userId, oldFeeling, updateFeeling, logFeelingHistory, showToast],
  );
```

- [ ] **Step 3: Pass it in from Home**

In `app/(tabs)/Home/index.tsx`, in the `useFirebase()` destructuring, after `updateFeeling,` (around line 94) add:
```ts
    logFeelingHistory,
```
In the `useFeelings({ ... })` call, after `updateFeeling,` (around line 169) add:
```ts
    logFeelingHistory,
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45` (the four pre-existing `hooks/useFeelings.tsx` listener errors may move by a line or two; they are not new).

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeelings.tsx "app/(tabs)/Home/index.tsx"
git commit -m "feat: log feeling changes to history

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Calendar and day modal components

**Files:**
- Create: `components/MoodCalendar/MoodCalendar.tsx`, `components/MoodCalendar/index.ts`
- Create: `components/MoodDayModal/MoodDayModal.tsx`, `components/MoodDayModal/index.ts`
- Modify: `components/index.ts`

**Interfaces:**
- Consumes: `buildCalendarCells`, `feelingDisplay`, `formatTime` (Task 1); `FeelingHistoryEntry` from `types`.
- Produces:
  - `MoodCalendar` props: `{ month: string; mineByDay: { [day: number]: string }; partnerByDay: { [day: number]: string }; todayDay: number | null; onDayPress: (day: number) => void }`
  - `MoodDaySection = { label: string; entries: FeelingHistoryEntry[] }`
  - `MoodDayModal` props: `{ isOpen: boolean; title: string; sections: MoodDaySection[]; onClose: () => void }`

- [ ] **Step 1: Create `components/MoodCalendar/MoodCalendar.tsx`**

```tsx
import React from 'react';
import { Text } from '@gluestack-ui/themed';
import { TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks';
import { buildCalendarCells, feelingDisplay } from '../../utils/feelingHistory';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL_WIDTH = '14.2857%' as const;

interface MoodCalendarProps {
  month: string;
  mineByDay: { [day: number]: string };
  partnerByDay: { [day: number]: string };
  todayDay: number | null;
  onDayPress: (day: number) => void;
}

// Monday-first month grid. Each day shows the user's last feeling on the
// left and the partner's on the right.
export const MoodCalendar = ({
  month,
  mineByDay,
  partnerByDay,
  todayDay,
  onDayPress,
}: MoodCalendarProps) => {
  const { theme } = useAppTheme();
  const cells = buildCalendarCells(month);

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((label, index) => (
          <View
            key={index}
            style={{ width: CELL_WIDTH, alignItems: 'center', paddingVertical: theme.spacing[1] }}>
            <Text
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.textTertiary,
                fontWeight: theme.fontWeight.semibold,
              }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={{ width: CELL_WIDTH, aspectRatio: 0.8 }} />;
          }

          const mine = mineByDay[day];
          const partner = partnerByDay[day];
          const hasEntries = !!mine || !!partner;
          const isToday = day === todayDay;

          return (
            <TouchableOpacity
              key={day}
              disabled={!hasEntries}
              onPress={() => onDayPress(day)}
              style={{ width: CELL_WIDTH, aspectRatio: 0.8, padding: 2 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: theme.radii.sm,
                  backgroundColor: hasEntries ? theme.colors.surface : 'transparent',
                  borderWidth: isToday ? 2 : 0,
                  borderColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: theme.spacing[1],
                }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: isToday ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isToday ? theme.fontWeight.bold : theme.fontWeight.normal,
                  }}>
                  {day}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  <Text style={{ fontSize: theme.fontSize.sm }}>
                    {mine ? feelingDisplay(mine).emoji : ' '}
                  </Text>
                  <Text style={{ fontSize: theme.fontSize.sm }}>
                    {partner ? feelingDisplay(partner).emoji : ' '}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
```

Create `components/MoodCalendar/index.ts`:
```ts
export * from './MoodCalendar';
```

- [ ] **Step 2: Create `components/MoodDayModal/MoodDayModal.tsx`**

```tsx
import React from 'react';
import {
  Box,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
} from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import { FeelingHistoryEntry } from '../../types';
import { feelingDisplay, formatTime } from '../../utils/feelingHistory';

export type MoodDaySection = {
  label: string;
  entries: FeelingHistoryEntry[];
};

// Lists every feeling change of one day, one section per partner.
export const MoodDayModal = ({
  isOpen,
  title,
  sections,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  sections: MoodDaySection[];
  onClose: () => void;
}) => {
  const { theme } = useAppTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {title}
          </Text>
        </ModalHeader>
        <ModalBody>
          {sections.map((section) => (
            <Box key={section.label} style={{ marginBottom: theme.spacing[4] }}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[2],
                }}>
                {section.label}
              </Text>
              {section.entries.length === 0 ? (
                <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
                  Nothing logged
                </Text>
              ) : (
                section.entries.map((entry, index) => {
                  const { emoji, label } = feelingDisplay(entry.feeling);
                  return (
                    <Text
                      key={`${entry.at}-${index}`}
                      style={{
                        fontSize: theme.fontSize.md,
                        color: theme.colors.text,
                        marginBottom: theme.spacing[1],
                      }}>
                      {`${formatTime(entry.at)}  ${emoji} ${label}`}
                    </Text>
                  );
                })
              )}
            </Box>
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
```

Create `components/MoodDayModal/index.ts`:
```ts
export * from './MoodDayModal';
```

- [ ] **Step 3: Export from `components/index.ts`**

Append:
```ts
export * from './MoodCalendar';
export * from './MoodDayModal';
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^components/Mood"`
Expected: no output. If gluestack's `Text` rejects a `fontWeight` token type here, it will also be failing in `components/FeelingModal/FeelingModal.tsx`, which uses the same pattern; it does not today, so a failure means a typo.

- [ ] **Step 5: Commit**

```bash
git add components/MoodCalendar components/MoodDayModal components/index.ts
git commit -m "feat: add mood calendar and day modal components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Mood history screen and Home link

**Files:**
- Create: `app/(tabs)/Home/MoodHistory.tsx`
- Modify: `app/(tabs)/Home/index.tsx` (new handler next to `handleViewAllCountdowns` around line 407; link under the `FeelingPressable` block around line 595)

**Interfaces:**
- Consumes: `getFeelingHistoryMonth` from `useFirebase()` (Task 1); `monthKey`, `shiftMonth`, `groupByDay`, `lastFeelingPerDay`, `formatMonthTitle`, `formatDayTitle` (Task 1); `MoodCalendar`, `MoodDayModal`, `MoodDaySection` (Task 3); `FeelingHistoryEntry` from `types`; `useAppSelector` from `state` (`state.room.partnerId`, `state.room.partnerName`).
- Produces: route `/(tabs)/Home/MoodHistory`.

- [ ] **Step 1: Create the screen**

Create `app/(tabs)/Home/MoodHistory.tsx`:
```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import {
  AnimatedHeartLoader,
  MoodCalendar,
  MoodDayModal,
  MoodDaySection,
} from '../../../components';
import { useAppSelector } from '../../../state';
import { FeelingHistoryEntry } from '../../../types';
import {
  formatDayTitle,
  formatMonthTitle,
  groupByDay,
  lastFeelingPerDay,
  monthKey,
  shiftMonth,
} from '../../../utils/feelingHistory';

type MonthData = {
  mine: FeelingHistoryEntry[];
  partner: FeelingHistoryEntry[];
};

export default function MoodHistory() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getFeelingHistoryMonth } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const currentMonth = monthKey(Date.now());
  const partnerLabel = partnerName || 'Partner';

  const [month, setMonth] = useState(currentMonth);
  // Results are stored per month key, so a slow response for one month
  // can never overwrite another month's data.
  const [months, setMonths] = useState<{ [month: string]: MonthData }>({});
  const [failed, setFailed] = useState<{ [month: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadMonth = async (target: string) => {
    if (!roomId || !userId) return;

    try {
      const [mine, partner] = await Promise.all([
        getFeelingHistoryMonth(roomId, userId, target),
        partnerId
          ? getFeelingHistoryMonth(roomId, partnerId, target)
          : Promise.resolve([] as FeelingHistoryEntry[]),
      ]);
      setMonths((prev) => ({ ...prev, [target]: { mine, partner } }));
      setFailed((prev) => ({ ...prev, [target]: false }));
    } catch (error) {
      console.error('Error loading mood history:', error);
      setFailed((prev) => ({ ...prev, [target]: true }));
      showToast({
        title: "Couldn't load mood history",
        description: 'Pull down to try again',
        status: 'error',
      });
    }
  };

  // Fetch each month once per visit; pull-to-refresh refetches.
  useEffect(() => {
    if (months[month]) return;
    loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, roomId, userId, partnerId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMonth(month);
    setRefreshing(false);
  };

  const handleChangeMonth = (delta: number) => {
    setSelectedDay(null);
    setMonth((prev) => shiftMonth(prev, delta));
  };

  const data = months[month];
  const mineByDay = useMemo(() => groupByDay(data?.mine ?? [], month), [data, month]);
  const partnerByDay = useMemo(() => groupByDay(data?.partner ?? [], month), [data, month]);
  const isLoading = !!roomId && !data && !failed[month];
  const isEmpty =
    !!data && Object.keys(mineByDay).length === 0 && Object.keys(partnerByDay).length === 0;
  const isCurrentMonth = month === currentMonth;
  const todayDay = isCurrentMonth ? new Date().getDate() : null;

  const sections: MoodDaySection[] =
    selectedDay === null
      ? []
      : [
          { label: 'You', entries: mineByDay[selectedDay] ?? [] },
          ...(partnerId ? [{ label: partnerLabel, entries: partnerByDay[selectedDay] ?? [] }] : []),
        ];

  return (
    <Box style={{ flex: 1, backgroundColor: theme?.colors?.background }}>
      <StatusBar
        backgroundColor={theme?.colors?.background}
        style={theme?.colorMode === 'dark' ? 'light' : 'dark'}
      />

      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Mood history
          </Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        {/* Month navigation */}
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => handleChangeMonth(-1)} style={{ padding: 8 }}>
            <ChevronLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: theme?.fontSize?.lg,
              fontWeight: theme?.fontWeight?.semibold,
              color: theme?.colors?.text,
            }}>
            {formatMonthTitle(month)}
          </Text>
          <TouchableOpacity
            onPress={() => handleChangeMonth(1)}
            disabled={isCurrentMonth}
            style={{ padding: 8, opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
        </HStack>

        {/* Legend */}
        <Text
          style={{
            fontSize: theme?.fontSize?.xs,
            color: theme?.colors?.textTertiary,
            textAlign: 'center',
          }}>
          {partnerId
            ? `Each day shows you on the left and ${partnerLabel} on the right`
            : 'Each day shows your last feeling'}
        </Text>

        {isLoading ? (
          <Box style={{ paddingVertical: 60, alignItems: 'center' }}>
            <AnimatedHeartLoader />
          </Box>
        ) : (
          <>
            <MoodCalendar
              month={month}
              mineByDay={lastFeelingPerDay(mineByDay)}
              partnerByDay={lastFeelingPerDay(partnerByDay)}
              todayDay={todayDay}
              onDayPress={setSelectedDay}
            />
            {isEmpty && (
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm,
                  color: theme?.colors?.textSecondary,
                  textAlign: 'center',
                  marginTop: 8,
                }}>
                No feelings logged this month yet
              </Text>
            )}
            {failed[month] && !data && (
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm,
                  color: theme?.colors?.textSecondary,
                  textAlign: 'center',
                  marginTop: 8,
                }}>
                Couldn't load this month. Pull down to try again.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <MoodDayModal
        isOpen={selectedDay !== null}
        title={selectedDay === null ? '' : formatDayTitle(month, selectedDay)}
        sections={sections}
        onClose={() => setSelectedDay(null)}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Add the Home link**

In `app/(tabs)/Home/index.tsx`, directly after the `handleViewAllCountdowns` `useCallback`, add:
```tsx
  const handleMoodHistoryPress = useCallback(() => {
    router.push('/(tabs)/Home/MoodHistory');
  }, []);
```
Replace the feeling card block:
```tsx
                {/* Feeling Card - Full Width */}
                <Box style={{ width: '100%' }}>
                  <FeelingPressable
                    partnerName={partnerName}
                    feeling={feeling}
                    onPress={handleFeelingPress}
                    loading={loading}
                  />
                </Box>
```
with:
```tsx
                {/* Feeling Card - Full Width */}
                <Box style={{ width: '100%' }}>
                  <FeelingPressable
                    partnerName={partnerName}
                    feeling={feeling}
                    onPress={handleFeelingPress}
                    loading={loading}
                  />
                  <TouchableOpacity
                    onPress={handleMoodHistoryPress}
                    style={{ alignSelf: 'flex-end', marginTop: theme?.spacing?.[2] || 8 }}>
                    <Text
                      style={{
                        fontSize: theme?.fontSize?.sm,
                        fontWeight: theme?.fontWeight?.semibold,
                        color: theme?.colors?.primary,
                      }}>
                      Mood history →
                    </Text>
                  </TouchableOpacity>
                </Box>
```
`TouchableOpacity` (from `react-native`) and `Text` (from `@gluestack-ui/themed`) are already imported in this file.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45`.

Typed routes are on (`app.config.ts` → `experiments.typedRoutes`), and `.expo/types/router.d.ts` only learns about `MoodHistory` when Expo regenerates it. If the count is `46` and the extra error is the `router.push('/(tabs)/Home/MoodHistory')` line, regenerate the route types and re-check:
```bash
timeout 90 npx expo start --offline >/dev/null 2>&1; npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected after regeneration: `45`. If it is still 46 only because of that line, record it in the report and continue; it disappears on the next `expo start`.

Run: `npx tsc --noEmit 2>&1 | grep -E "MoodHistory"`
Expected: no output (or only the typed-route line described above).

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/Home/MoodHistory.tsx" "app/(tabs)/Home/index.tsx"
git commit -m "feat: add mood history screen and home link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Device verification (user)

**Files:** none.

Run the app (`npm run android`) on two phones signed in as the two partners.

- [ ] **Step 1:** Change feeling a few times on both phones. Open Home → "Mood history →". Today's cell (outlined) shows your latest feeling on the left and your partner's on the right. Tap it: the modal lists every change for each of you with `HH:mm` times, "You" first.
- [ ] **Step 2:** Open the feeling modal and save the same feeling again. The day's list does not grow.
- [ ] **Step 3:** Tap ‹. The previous month shows "No feelings logged this month yet". Tap › back. On the current month, › is greyed out and does nothing.
- [ ] **Step 4:** Tap an empty day: nothing opens.
- [ ] **Step 5:** Pull down on the screen: today's data refreshes (change feeling on the other phone first to see it appear).
- [ ] **Step 6:** In airplane mode, open a month you haven't viewed yet: after a few seconds the "Couldn't load mood history" toast appears and the grid shows the retry line, not an endless spinner.
