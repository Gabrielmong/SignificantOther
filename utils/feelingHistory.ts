import { FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { CountdownObject, FeelingHistoryEntry } from '../types';
import { nthOccurrence, recurrenceStep } from './countdown';
import { anniversaryInMonth } from './milestones';

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

export type CountdownOccurrence = {
  id: string;
  title: string;
  icon: string;
  date: number;
};

// Safety net for the per-month loop. A month holds at most ~31 occurrences
// (a daily countdown), plus the one-step lead-in.
const MAX_OCCURRENCES_PER_MONTH = 64;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every occurrence of every countdown inside `month`, grouped by local day.
 * Each recurring occurrence is computed directly from the stored date
 * (month steps clamped to the target month's last day), so past and future
 * months both show it without chaining steps. Each day's list is ordered
 * by title.
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

    const add = (date: number) => {
      const day = new Date(date).getDate();
      (byDay[day] ??= []).push({
        id,
        title: countdown.title || '',
        icon: countdown.icon || '📅',
        date,
      });
    };

    // Milestone anniversaries: once a year, never before the milestone itself
    if (countdown.anniversaryDay) {
      const date = anniversaryInMonth(countdown.anniversaryDay, year, monthIndex);
      if (date !== null) add(date);
      continue;
    }

    const recurrence = countdown.recurrence || 'none';
    const step =
      recurrence === 'none'
        ? null
        : recurrenceStep(recurrence, countdown.recurrenceInterval, countdown.recurrenceUnit);

    // One-off, or a custom recurrence with no usable interval.
    if (!step) {
      if (countdown.date >= monthStart && countdown.date < monthEnd) add(countdown.date);
      continue;
    }

    // Estimate the first occurrence index near the month, start one step
    // early, then walk forward through the month.
    const anchor = new Date(countdown.date);
    let n =
      'months' in step
        ? Math.floor(
            ((year - anchor.getFullYear()) * 12 + (monthIndex - anchor.getMonth())) / step.months,
          ) - 1
        : Math.floor((monthStart - countdown.date) / (step.days * DAY_MS)) - 1;

    for (let i = 0; i < MAX_OCCURRENCES_PER_MONTH; i++, n++) {
      const date = nthOccurrence(countdown.date, step, n);
      if (date >= monthEnd) break;
      if (date >= monthStart) add(date);
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
