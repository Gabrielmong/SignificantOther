import { RecurrenceType, RecurrenceUnit } from '../types';

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
