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
