import { DAILY_QUESTIONS } from '../constants/dailyQuestions';

export const MAX_ANSWER_LENGTH = 500;

// The couple's day follows America/Costa_Rica, which is UTC−6 all year (no
// daylight saving). Working in UTC with a fixed offset keeps both phones on
// the same date and question whatever timezone they are set to.
const COUPLE_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;
const QUESTION_EPOCH = '2026-01-01';
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

const dateKeyToUtc = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

/**
 * Today's date in the couple's timezone.
 * @param now - Current time (timestamp), injectable for testing
 * @returns The date as YYYY-MM-DD
 */
export const todayKey = (now: number = Date.now()): string => {
  const date = new Date(now + COUPLE_UTC_OFFSET_MS);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/**
 * The built-in question for a date, cycling through the list.
 * @param dateKey - Date as YYYY-MM-DD
 */
export const questionForDate = (dateKey: string): string => {
  const days = Math.round((dateKeyToUtc(dateKey) - dateKeyToUtc(QUESTION_EPOCH)) / DAY_MS);
  const count = DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[((days % count) + count) % count];
};

/**
 * History heading for a date, e.g. "Tue, 27 Oct".
 */
export const formatDateKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
