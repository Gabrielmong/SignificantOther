# Calendar Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the mood calendar into its own "Calendar" bottom tab and show the room's countdown events on it (emoji in the day cell, a "This month" list, and an Events section in the day modal).

**Architecture:** A pure helper expands each countdown (one-off or recurring) into its occurrences inside a displayed month, stepping backwards and forwards with a shared `stepRecurrence` function. The existing `MoodCalendar` and `MoodDayModal` components gain event props. The screen moves from `Home/MoodHistory.tsx` to a new `Calendar` tab, subscribes to countdowns with the existing listener, and allows browsing up to 12 months ahead.

**Tech Stack:** Expo SDK 54, expo-router 6 (typed routes on), React Native 0.81, gluestack-ui, Firebase Realtime Database web SDK, lucide-react-native 0.561. No automated tests (user's choice): verification is type-checking plus the device checklist in Task 4.

**Spec:** `docs/superpowers/specs/2026-10-27-calendar-tab-design.md`

## Global Constraints

- Work directly on `main`. Do not create a branch.
- Do **not** commit anything under `docs/superpowers/`; the user commits docs themselves. Only `git add` the files each task lists.
- Tab order: Home · Calendar · Chat · Profile. Icon: `CalendarHeart` from `lucide-react-native`.
- Home link text: `Calendar →`; it pushes `/(tabs)/Calendar`.
- Screen title: `Calendar`; no back arrow.
- › arrow disabled when `month === shiftMonth(currentMonth, 12)`.
- `No feelings logged this month yet` shows only for the current month or earlier, when the month has no mood entries.
- "This month" section title: `This month`; rows `{icon} {title}` left, short date (e.g. `Thu 28`) right; ordered by day then title; hidden when the month has no events; tapping a row opens that day's modal.
- Day modal section order: `Events` (only if the day has events; rows `{icon} {title}`), `You`, then the partner.
- A day is tappable when it has a mood entry **or** an event. Only the first event's emoji shows in the cell.
- Missing `recurrence` means `'none'`. A custom countdown without a positive `recurrenceInterval` and a `recurrenceUnit` is treated as one-off.
- Scroll content bottom padding `96` so the floating tab bar doesn't cover the last item.
- `npx tsc --noEmit` reports **45** errors on `main` before this work. The total must stay 45, except for the temporary +1 between Tasks 2 and 3 (described in Task 2) and the typed-route case described in Task 3.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A daily custom countdown created years ago, viewed far in the future:** the walk from its stored date to the displayed month must reach it, not give up early. Handled in Task 1 (step cap of 5,000, enough for ~13 years of daily steps).
2. **A custom countdown with no interval** (`recurrence: 'custom'`, no `recurrenceInterval`): must not loop forever; shows once on its own date. Handled in Task 1 (`stepRecurrence` returns `null` → treated as one-off).
3. **A recurring countdown whose stored date is after the displayed month** (e.g. a birthday stored as next year, viewing last year): earlier occurrences must still show. Handled in Task 1 (walk backwards first).
4. **Deleting the last countdown while the Calendar tab is open:** event emojis and the list disappear. Handled by the existing listener reporting `{}` (no task change needed) and Task 3 storing whatever it reports.
5. **The tab bar covering content:** the last "This month" row must be scrollable clear of the floating tab bar. Handled in Task 3 (`paddingBottom: 96`).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `utils/countdown.ts` | Modify | Add `stepRecurrence` |
| `utils/feelingHistory.ts` | Modify | Add `CountdownOccurrence`, `countdownOccurrencesInMonth`, `formatShortDate` |
| `components/MoodCalendar/MoodCalendar.tsx` | Modify | `eventIconsByDay` prop; tappable on events |
| `components/MoodDayModal/MoodDayModal.tsx` | Modify | Optional `events` prop rendered as the first section |
| `app/(tabs)/_layout.tsx` | Modify | Register the Calendar tab |
| `app/(tabs)/Calendar/_layout.tsx` | Create | `<Slot />` |
| `app/(tabs)/Calendar/index.tsx` | Create | The Calendar screen |
| `app/(tabs)/Home/MoodHistory.tsx` | Delete | Replaced by the Calendar tab |
| `constants/index.ts` | Modify | Remove `/Home/MoodHistory` from `TAB_HIDDEN_ROUTES` |
| `app/(tabs)/Home/index.tsx` | Modify | Link becomes `Calendar →` |

---

### Task 1: Recurrence stepping and month occurrences

**Files:**
- Modify: `utils/countdown.ts`
- Modify: `utils/feelingHistory.ts`

**Interfaces:**
- Produces:
  - `stepRecurrence(date: number, recurrence: RecurrenceType, recurrenceInterval: number | undefined, recurrenceUnit: RecurrenceUnit | undefined, direction: 1 | -1): number | null` in `utils/countdown.ts` — `null` when the countdown doesn't recur.
  - In `utils/feelingHistory.ts`:
    - `type CountdownOccurrence = { id: string; title: string; icon: string; date: number }`
    - `countdownOccurrencesInMonth(countdowns: CountdownObject | null | undefined, month: string): { [day: number]: CountdownOccurrence[] }`
    - `formatShortDate(month: string, day: number): string` — e.g. `Thu 28`

- [ ] **Step 1: Add `stepRecurrence` to `utils/countdown.ts`**

Insert directly after the closing `};` of `calculateNextRecurrenceDate`:
```ts
/**
 * Moves a countdown date one recurrence forwards or backwards.
 * @param date - The countdown date (timestamp)
 * @param recurrence - The type of recurrence
 * @param recurrenceInterval - The interval for custom recurrence
 * @param recurrenceUnit - The unit for custom recurrence
 * @param direction - 1 for the next occurrence, -1 for the previous one
 * @returns The stepped date, or null if the countdown does not recur
 */
export const stepRecurrence = (
  date: number,
  recurrence: RecurrenceType,
  recurrenceInterval: number | undefined,
  recurrenceUnit: RecurrenceUnit | undefined,
  direction: 1 | -1,
): number | null => {
  const stepped = new Date(date);

  switch (recurrence) {
    case 'yearly':
      stepped.setFullYear(stepped.getFullYear() + direction);
      break;

    case 'monthly':
      stepped.setMonth(stepped.getMonth() + direction);
      break;

    case 'weekly':
      stepped.setDate(stepped.getDate() + 7 * direction);
      break;

    case 'custom': {
      if (!recurrenceInterval || recurrenceInterval <= 0 || !recurrenceUnit) return null;
      const amount = recurrenceInterval * direction;
      switch (recurrenceUnit) {
        case 'days':
          stepped.setDate(stepped.getDate() + amount);
          break;
        case 'weeks':
          stepped.setDate(stepped.getDate() + amount * 7);
          break;
        case 'months':
          stepped.setMonth(stepped.getMonth() + amount);
          break;
        case 'years':
          stepped.setFullYear(stepped.getFullYear() + amount);
          break;
        default:
          return null;
      }
      break;
    }

    default:
      return null;
  }

  return stepped.getTime();
};
```
Leave `calculateNextRecurrenceDate` unchanged.

- [ ] **Step 2: Add the occurrence helpers to `utils/feelingHistory.ts`**

Change the imports at the top from:
```ts
import { FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { FeelingHistoryEntry } from '../types';
```
to:
```ts
import { FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { CountdownObject, FeelingHistoryEntry } from '../types';
import { stepRecurrence } from './countdown';
```
Append at the end of the file:
```ts
export type CountdownOccurrence = {
  id: string;
  title: string;
  icon: string;
  date: number;
};

// Safety net for the recurrence walks: enough for ~13 years of a daily
// countdown, so a far-off month is still reached.
const MAX_RECURRENCE_STEPS = 5000;

/**
 * Every occurrence of every countdown inside `month`, grouped by local day.
 * Recurring countdowns are walked backwards from their stored date to
 * before the month, then forwards through it, so past and future months
 * both show them. Each day's list is ordered by title.
 */
export const countdownOccurrencesInMonth = (
  countdowns: CountdownObject | null | undefined,
  month: string,
): { [day: number]: CountdownOccurrence[] } => {
  const { year, monthIndex } = parseMonthKey(month);
  const monthStart = new Date(year, monthIndex, 1).getTime();
  const monthEnd = new Date(year, monthIndex + 1, 1).getTime();
  const byDay: { [day: number]: CountdownOccurrence[] } = {};

  for (const [id, countdown] of Object.entries(countdowns ?? {})) {
    if (!countdown || typeof countdown.date !== 'number' || !Number.isFinite(countdown.date)) {
      continue;
    }

    const recurrence = countdown.recurrence || 'none';
    const step = (date: number, direction: 1 | -1) =>
      recurrence === 'none'
        ? null
        : stepRecurrence(
            date,
            recurrence,
            countdown.recurrenceInterval,
            countdown.recurrenceUnit,
            direction,
          );

    const add = (date: number) => {
      const day = new Date(date).getDate();
      (byDay[day] ??= []).push({
        id,
        title: countdown.title || '',
        icon: countdown.icon || '📅',
        date,
      });
    };

    // One-off, or a custom recurrence with no usable interval.
    if (step(countdown.date, 1) === null) {
      if (countdown.date >= monthStart && countdown.date < monthEnd) add(countdown.date);
      continue;
    }

    let date = countdown.date;
    let steps = 0;
    while (date >= monthStart && steps < MAX_RECURRENCE_STEPS) {
      const previous = step(date, -1);
      if (previous === null || previous >= date) break;
      date = previous;
      steps++;
    }

    steps = 0;
    while (date < monthEnd && steps < MAX_RECURRENCE_STEPS) {
      if (date >= monthStart) add(date);
      const next = step(date, 1);
      if (next === null || next <= date) break;
      date = next;
      steps++;
    }
  }

  for (const occurrences of Object.values(byDay)) {
    occurrences.sort((a, b) => a.title.localeCompare(b.title));
  }

  return byDay;
};

/**
 * Short weekday plus day number, e.g. "Thu 28".
 */
export const formatShortDate = (month: string, day: number): string => {
  const { year, monthIndex } = parseMonthKey(month);
  const weekday = new Date(year, monthIndex, day).toLocaleDateString(undefined, {
    weekday: 'short',
  });
  return `${weekday} ${day}`;
};
```
`parseMonthKey` is already defined (unexported) near the top of this file; reuse it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^utils/"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add utils/countdown.ts utils/feelingHistory.ts
git commit -m "feat: expand countdown occurrences per calendar month

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Events in the calendar cell and day modal

**Files:**
- Modify: `components/MoodCalendar/MoodCalendar.tsx`
- Modify: `components/MoodDayModal/MoodDayModal.tsx`

**Interfaces:**
- Consumes: `CountdownOccurrence` from `utils/feelingHistory` (Task 1).
- Produces:
  - `MoodCalendar` gains required prop `eventIconsByDay: { [day: number]: string }`.
  - `MoodDayModal` gains optional prop `events?: CountdownOccurrence[]`.

- [ ] **Step 1: `MoodCalendar` — add the prop**

In `components/MoodCalendar/MoodCalendar.tsx`, add to `interface MoodCalendarProps` after `partnerByDay`:
```ts
  eventIconsByDay: { [day: number]: string };
```
Add `eventIconsByDay,` to the destructured props after `partnerByDay,`. Update the comment above the component to:
```ts
// Monday-first month grid. Each day shows the user's last feeling on the
// left and the partner's on the right, with the day's first countdown
// event emoji next to the day number.
```

- [ ] **Step 2: `MoodCalendar` — tappable on events, emoji next to the day number**

Inside the `cells.map` callback, replace:
```tsx
          const mine = mineByDay[day];
          const partner = partnerByDay[day];
          const hasEntries = !!mine || !!partner;
          const isToday = day === todayDay;
```
with:
```tsx
          const mine = mineByDay[day];
          const partner = partnerByDay[day];
          const eventIcon = eventIconsByDay[day];
          const hasEntries = !!mine || !!partner || !!eventIcon;
          const isToday = day === todayDay;
```
Then replace the day number `Text`:
```tsx
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: isToday ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isToday ? theme.fontWeight.bold : theme.fontWeight.normal,
                  }}>
                  {day}
                </Text>
```
with:
```tsx
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: isToday ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: isToday ? theme.fontWeight.bold : theme.fontWeight.normal,
                    }}>
                    {day}
                  </Text>
                  {!!eventIcon && <Text style={{ fontSize: theme.fontSize.xs }}>{eventIcon}</Text>}
                </View>
```

- [ ] **Step 3: `MoodDayModal` — Events section first**

In `components/MoodDayModal/MoodDayModal.tsx`, change the utils import to:
```ts
import { CountdownOccurrence, feelingDisplay, formatTime } from '../../utils/feelingHistory';
```
Add `events,` to the destructured props after `sections,`, and `events?: CountdownOccurrence[];` to the props type after `sections: MoodDaySection[];`. Update the comment above the component to:
```ts
// Lists one day's countdown events (if any), then every feeling change,
// one section per partner.
```
Inside `<ModalBody>`, directly before `{sections.map((section) => (`, add:
```tsx
          {!!events?.length && (
            <Box style={{ marginBottom: theme.spacing[4] }}>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[2],
                }}>
                Events
              </Text>
              {events.map((event) => (
                <Text
                  key={event.id}
                  style={{
                    fontSize: theme.fontSize.md,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[1],
                  }}>
                  {`${event.icon} ${event.title}`}
                </Text>
              ))}
            </Box>
          )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `46` — the one extra error is `app/(tabs)/Home/MoodHistory.tsx` not passing the new required `eventIconsByDay` prop. That file is deleted in Task 3. Confirm with:
Run: `npx tsc --noEmit 2>&1 | grep -E "^(components/Mood|app/\(tabs\)/Home/MoodHistory)"`
Expected: exactly one line, for `app/(tabs)/Home/MoodHistory.tsx`, about `eventIconsByDay`.

- [ ] **Step 5: Commit**

```bash
git add components/MoodCalendar/MoodCalendar.tsx components/MoodDayModal/MoodDayModal.tsx
git commit -m "feat: show countdown events in calendar cells and day modal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Calendar tab

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/Calendar/_layout.tsx`
- Create: `app/(tabs)/Calendar/index.tsx`
- Delete: `app/(tabs)/Home/MoodHistory.tsx`
- Modify: `constants/index.ts`
- Modify: `app/(tabs)/Home/index.tsx` (handler around line 413; link around line 607)

**Interfaces:**
- Consumes: `countdownOccurrencesInMonth`, `formatShortDate`, `CountdownOccurrence` (Task 1); `MoodCalendar` `eventIconsByDay` prop and `MoodDayModal` `events` prop (Task 2); `listenToCountdownChanges(callback: ({ countdowns }: { countdowns: CountdownObject }) => void, roomId: string)` and `getFeelingHistoryMonth` from `useFirebase()` (existing).
- Produces: route `/(tabs)/Calendar`.

- [ ] **Step 1: Register the tab**

In `app/(tabs)/_layout.tsx`, change
```tsx
import { CircleUserRound, Home, MessageCircle } from 'lucide-react-native';
```
to
```tsx
import { CalendarHeart, CircleUserRound, Home, MessageCircle } from 'lucide-react-native';
```
Directly after the closing `/>` of the `Tabs.Screen name="Home"` element (and before `<Tabs.Screen name="Chat"`), add:
```tsx
        <Tabs.Screen
          name="Calendar"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={CalendarHeart} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
          }}
        />
```

- [ ] **Step 2: Create `app/(tabs)/Calendar/_layout.tsx`**

```tsx
import { Slot } from 'expo-router';

export default function CalendarLayout() {
  return <Slot />;
}
```

- [ ] **Step 3: Create `app/(tabs)/Calendar/index.tsx`**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import {
  AnimatedHeartLoader,
  MoodCalendar,
  MoodDayModal,
  MoodDaySection,
} from '../../../components';
import { useAppSelector } from '../../../state';
import { CountdownObject, FeelingHistoryEntry } from '../../../types';
import {
  countdownOccurrencesInMonth,
  formatDayTitle,
  formatMonthTitle,
  formatShortDate,
  groupByDay,
  lastFeelingPerDay,
  monthKey,
  shiftMonth,
} from '../../../utils/feelingHistory';

type MonthData = {
  mine: FeelingHistoryEntry[];
  partner: FeelingHistoryEntry[];
};

// How far ahead the calendar can be browsed, so upcoming events are visible.
const MONTHS_AHEAD = 12;

export default function Calendar() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getFeelingHistoryMonth, listenToCountdownChanges } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const currentMonth = monthKey(Date.now());
  const lastMonth = shiftMonth(currentMonth, MONTHS_AHEAD);
  const partnerLabel = partnerName || 'Partner';

  const [month, setMonth] = useState(currentMonth);
  // Results are stored per month key, so a slow response for one month
  // can never overwrite another month's data.
  const [months, setMonths] = useState<{ [month: string]: MonthData }>({});
  const [failed, setFailed] = useState<{ [month: string]: boolean }>({});
  const [countdowns, setCountdowns] = useState<CountdownObject>({});
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

  // Countdowns are live, so new or deleted events show without a refresh.
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenToCountdownChanges((data) => {
      setCountdowns(data.countdowns);
    }, roomId);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
  const eventsByDay = useMemo(
    () => countdownOccurrencesInMonth(countdowns, month),
    [countdowns, month],
  );
  const eventIconsByDay = useMemo(() => {
    const icons: { [day: number]: string } = {};
    for (const [day, occurrences] of Object.entries(eventsByDay)) {
      icons[Number(day)] = occurrences[0].icon;
    }
    return icons;
  }, [eventsByDay]);
  const monthEvents = useMemo(
    () =>
      Object.entries(eventsByDay)
        .map(([day, occurrences]) => ({ day: Number(day), occurrences }))
        .sort((a, b) => a.day - b.day)
        .flatMap(({ day, occurrences }) => occurrences.map((occurrence) => ({ day, occurrence }))),
    [eventsByDay],
  );

  const isLoading = !!roomId && !data && !failed[month];
  // YYYY-MM keys sort chronologically as strings.
  const isPastOrCurrent = month <= currentMonth;
  const isEmpty =
    isPastOrCurrent &&
    !!data &&
    Object.keys(mineByDay).length === 0 &&
    Object.keys(partnerByDay).length === 0;
  const isLastMonth = month === lastMonth;
  const todayDay = month === currentMonth ? new Date().getDate() : null;

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
          alignItems: 'center',
          ...theme?.shadows?.sm,
        }}>
        <Heading
          style={{
            fontSize: theme?.fontSize?.xl,
            fontWeight: theme?.fontWeight?.bold,
            color: theme?.colors?.text,
          }}>
          Calendar
        </Heading>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        // Extra bottom padding keeps content clear of the floating tab bar.
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}
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
            disabled={isLastMonth}
            style={{ padding: 8, opacity: isLastMonth ? 0.3 : 1 }}>
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
              eventIconsByDay={eventIconsByDay}
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

        {/* This month's events */}
        {monthEvents.length > 0 && (
          <Box style={{ marginTop: 8, gap: 8 }}>
            <Text
              style={{
                fontSize: theme?.fontSize?.md,
                fontWeight: theme?.fontWeight?.semibold,
                color: theme?.colors?.text,
              }}>
              This month
            </Text>
            {monthEvents.map(({ day, occurrence }) => (
              <TouchableOpacity
                key={`${occurrence.id}-${occurrence.date}`}
                onPress={() => setSelectedDay(day)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: theme?.radii?.md,
                  backgroundColor: theme?.colors?.surface,
                }}>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    marginRight: 8,
                    fontSize: theme?.fontSize?.sm,
                    color: theme?.colors?.text,
                  }}>
                  {`${occurrence.icon} ${occurrence.title}`}
                </Text>
                <Text style={{ fontSize: theme?.fontSize?.sm, color: theme?.colors?.textSecondary }}>
                  {formatShortDate(month, day)}
                </Text>
              </TouchableOpacity>
            ))}
          </Box>
        )}
      </ScrollView>

      <MoodDayModal
        isOpen={selectedDay !== null}
        title={selectedDay === null ? '' : formatDayTitle(month, selectedDay)}
        events={selectedDay === null ? [] : (eventsByDay[selectedDay] ?? [])}
        sections={sections}
        onClose={() => setSelectedDay(null)}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Delete the old screen and its hidden-tab entry**

Run: `git rm "app/(tabs)/Home/MoodHistory.tsx"`

In `constants/index.ts`, remove the line `  '/Home/MoodHistory',` from `TAB_HIDDEN_ROUTES`.

- [ ] **Step 5: Point the Home link at the tab**

In `app/(tabs)/Home/index.tsx`, replace:
```tsx
  const handleMoodHistoryPress = useCallback(() => {
    router.push('/(tabs)/Home/MoodHistory');
  }, []);
```
with:
```tsx
  const handleCalendarPress = useCallback(() => {
    router.push('/(tabs)/Calendar');
  }, []);
```
In the link under the feeling card, change `onPress={handleMoodHistoryPress}` to `onPress={handleCalendarPress}` and the text `Mood history →` to `Calendar →`.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `45`.

Typed routes are on, and `.expo/types/router.d.ts` only learns about `/(tabs)/Calendar` (and forgets `/(tabs)/Home/MoodHistory`) when Expo regenerates it. If the count is above 45 and the extra errors are only the `router.push('/(tabs)/Calendar')` line, regenerate the route types and re-check:
```bash
timeout 90 npx expo start --offline >/dev/null 2>&1; npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected after regeneration: `45`. If it is still above 45 only because of that line, record it in the report and continue; it disappears on the next `expo start`. Never `git add` anything under `.expo/`.

Run: `npx tsc --noEmit 2>&1 | grep -E "^(app/\(tabs\)/Calendar|app/\(tabs\)/_layout|constants/)"`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/Calendar/_layout.tsx" "app/(tabs)/Calendar/index.tsx" "app/(tabs)/Home/index.tsx" constants/index.ts
git commit -m "feat: move mood calendar into its own tab with countdown events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`git rm` in Step 4 already staged the deletion of `app/(tabs)/Home/MoodHistory.tsx`; it is part of this commit.)

---

### Task 4: Device verification (user)

**Files:** none.

Run the app (`npm run android`).

- [ ] **Step 1:** The tab bar shows Home · Calendar · Chat · Profile, with a calendar-heart icon. The Calendar tab keeps the tab bar visible, and the last "This month" row can be scrolled clear of it.
- [ ] **Step 2:** On Home, `Calendar →` under the feeling card switches to the Calendar tab.
- [ ] **Step 3:** A yearly countdown (e.g. a birthday) shows its emoji on its day this year, next year (› up to 12 months) and last year (‹). › is greyed out 12 months ahead.
- [ ] **Step 4:** A weekly countdown shows on every matching weekday of the month, and each appears in "This month".
- [ ] **Step 5:** Tap a day with only an event: the modal shows `Events` first, then "Nothing logged" for You and your partner. Tap a "This month" row: the same modal opens.
- [ ] **Step 6:** Future months show no "No feelings logged this month yet" message; past empty months still do.
- [ ] **Step 7:** Delete a countdown on the other phone: it disappears from the calendar without refreshing.
