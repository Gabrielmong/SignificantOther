import { CountdownObject, RecurrenceType, RecurrenceUnit, WidgetCountdown } from '../types';

/**
 * Calculates the next recurrence date based on the recurrence type and current date
 * @param currentDate - The current countdown date (timestamp)
 * @param recurrence - The type of recurrence
 * @param recurrenceInterval - The interval for custom recurrence
 * @param recurrenceUnit - The unit for custom recurrence
 * @returns The next recurrence date (timestamp)
 */
export const calculateNextRecurrenceDate = (
  currentDate: number,
  recurrence: RecurrenceType,
  recurrenceInterval?: number,
  recurrenceUnit?: RecurrenceUnit,
): number => {
  const date = new Date(currentDate);

  switch (recurrence) {
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;

    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;

    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;

    case 'custom':
      if (recurrenceInterval && recurrenceUnit) {
        switch (recurrenceUnit) {
          case 'days':
            date.setDate(date.getDate() + recurrenceInterval);
            break;
          case 'weeks':
            date.setDate(date.getDate() + recurrenceInterval * 7);
            break;
          case 'months':
            date.setMonth(date.getMonth() + recurrenceInterval);
            break;
          case 'years':
            date.setFullYear(date.getFullYear() + recurrenceInterval);
            break;
        }
      }
      break;

    case 'none':
    default:
      // No recurrence, return the same date
      return currentDate;
  }

  return date.getTime();
};

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

export type RecurrenceStep = { months: number } | { days: number };

/**
 * The size of one recurrence step, in months or days.
 * @returns null if the countdown does not recur (including a custom
 * recurrence without a positive interval and a unit)
 */
export const recurrenceStep = (
  recurrence: RecurrenceType,
  recurrenceInterval: number | undefined,
  recurrenceUnit: RecurrenceUnit | undefined,
): RecurrenceStep | null => {
  switch (recurrence) {
    case 'yearly':
      return { months: 12 };
    case 'monthly':
      return { months: 1 };
    case 'weekly':
      return { days: 7 };
    case 'custom':
      if (!recurrenceInterval || recurrenceInterval <= 0 || !recurrenceUnit) return null;
      switch (recurrenceUnit) {
        case 'days':
          return { days: recurrenceInterval };
        case 'weeks':
          return { days: recurrenceInterval * 7 };
        case 'months':
          return { months: recurrenceInterval };
        case 'years':
          return { months: recurrenceInterval * 12 };
        default:
          return null;
      }
    default:
      return null;
  }
};

/**
 * The n-th occurrence of a recurring date (n may be negative), computed
 * from the anchor rather than by chaining steps, so month-end dates don't
 * drift. Month steps clamp to the target month's last day (Jan 31 + 1
 * month = Feb 28/29).
 */
export const nthOccurrence = (anchor: number, step: RecurrenceStep, n: number): number => {
  const date = new Date(anchor);

  if ('months' in step) {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + step.months * n);
    date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
    return date.getTime();
  }

  date.setDate(date.getDate() + step.days * n);
  return date.getTime();
};

/**
 * Checks if a countdown date has passed
 * @param countdownDate - The countdown date (timestamp)
 * @returns True if the countdown date has passed
 */
export const hasCountdownPassed = (countdownDate: number): boolean => {
  return Date.now() > countdownDate;
};

/**
 * Checks if a countdown should be updated (date has passed and it's recurring)
 * @param countdown - The countdown object
 * @returns True if the countdown should be updated
 */
export const shouldUpdateCountdown = (countdown: {
  date: number;
  recurrence: RecurrenceType;
}): boolean => {
  return hasCountdownPassed(countdown.date) && countdown.recurrence !== 'none';
};

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
