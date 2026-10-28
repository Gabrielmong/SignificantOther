export type RecurrenceType = 'none' | 'yearly' | 'monthly' | 'weekly' | 'custom';
export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';

export interface Countdown {
  id?: string;
  title: string;
  date: number; // Timestamp
  icon: string; // Emoji icon
  color?: string; // Optional custom color
  createdAt: number;
  createdBy: string; // User ID who created it
  recurrence?: RecurrenceType; // Type of recurrence (optional for backward compatibility)
  recurrenceInterval?: number; // For custom intervals (e.g., 3 for "every 3 months")
  recurrenceUnit?: RecurrenceUnit; // Unit for custom intervals
}

export interface CountdownObject {
  [key: string]: Countdown;
}

// The single countdown shown on the home-screen widgets. `date` is the next
// occurrence (recurring countdowns already rolled forward).
export interface WidgetCountdown {
  title: string;
  icon: string;
  date: number;
}
