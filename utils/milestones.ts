/**
 * Milestone date helpers
 * Pure functions (no React Native, no Firebase) so they can be checked
 * outside the app. Milestone days are calendar dates ("YYYY-MM-DD") and are
 * turned into local dates on each phone.
 */

import type { Countdown, CountdownObject } from '../types/Countdown';
import type { Milestone, SpecialKind } from '../types/Milestone';

const DAY_MS = 24 * 60 * 60 * 1000;

export const SPECIAL_DEFAULTS: Record<SpecialKind, { title: string; emoji: string }> = {
  met: { title: 'We met', emoji: '👋' },
  dating: { title: 'Started dating', emoji: '💕' },
  engaged: { title: 'Got engaged', emoji: '💍' },
  married: { title: 'Got married', emoji: '💒' },
};

// Milestones that also show up as yearly countdowns
export const ANNIVERSARY_KINDS: readonly SpecialKind[] = ['dating', 'engaged', 'married'];

type AnniversaryKind = 'dating' | 'engaged' | 'married';

export const COUNTER_LABEL: Record<AnniversaryKind, string> = {
  dating: 'as a couple',
  engaged: 'engaged',
  married: 'married',
};

const ANNIVERSARY_TITLE: Record<AnniversaryKind, string> = {
  dating: 'Dating anniversary',
  engaged: 'Engagement anniversary',
  married: 'Wedding anniversary',
};

// Title while the milestone's day is still ahead
const UPCOMING_TITLE: Record<AnniversaryKind, string> = {
  dating: 'We start dating',
  engaged: 'Our engagement',
  married: 'Our wedding',
};

// Counter priority, highest first
const COUNTER_PRIORITY: AnniversaryKind[] = ['married', 'engaged', 'dating'];

/**
 * Local midnight of a "YYYY-MM-DD" day
 */
export const parseDay = (day: string): Date => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * "YYYY-MM-DD" of a date in local time
 */
export const toDay = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

// Last millisecond of the day, so a countdown reads "Today" all day long
const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

// Rounded, so DST days (23h/25h) still count as one day
const daysBetween = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

// `months` after `start`, clamped to the month's end (Jan 31 + 1 = Feb 28)
const addMonthsClamped = (start: Date, months: number): Date => {
  const year = start.getFullYear();
  const month = start.getMonth() + months;
  const target = new Date(year, month, 1);
  const lastDay = daysInMonth(target.getFullYear(), target.getMonth());
  return new Date(target.getFullYear(), target.getMonth(), Math.min(start.getDate(), lastDay));
};

/**
 * Whole calendar days from `day` to `today` (0 on the day, negative before)
 */
export const daysSince = (day: string, today: Date): number => daysBetween(parseDay(day), today);

/**
 * Years, months and days from `day` to `today`, calendar-correct
 */
export const ymdSince = (
  day: string,
  today: Date,
): { years: number; months: number; days: number } => {
  const start = parseDay(day);
  const end = startOfDay(today);
  if (start > end) return { years: 0, months: 0, days: 0 };

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  while (months > 0 && addMonthsClamped(start, months) > end) months--;

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: daysBetween(addMonthsClamped(start, months), end),
  };
};

/**
 * The milestone that drives the counter: married › engaged › dating, only
 * counting days that have already happened
 */
export const pickCounterMilestone = (milestones: Milestone[], today: Date): Milestone | null => {
  const todayDay = toDay(today);
  for (const kind of COUNTER_PRIORITY) {
    const match = milestones.find((m) => m.kind === kind && m.day <= todayDay);
    if (match) return match;
  }
  return null;
};

/**
 * Next time the day's month/day comes around, today included. Feb 29 falls
 * on Feb 28 in non-leap years.
 */
export const nextOccurrence = (day: string, today: Date): Date => {
  const [, m, d] = day.split('-').map(Number);
  const start = startOfDay(today);

  const onYear = (year: number) => new Date(year, m - 1, Math.min(d, daysInMonth(year, m - 1)));
  const thisYear = onYear(start.getFullYear());
  return thisYear >= start ? thisYear : onYear(start.getFullYear() + 1);
};

/**
 * The yearly countdown for a dating/engaged/married milestone. Its id is
 * derived from the milestone, so writing it twice never duplicates it.
 */
export const buildAnniversaryCountdown = (
  m: Milestone,
  today: Date,
  uid: string,
): Countdown & { id: string } => {
  const kind = m.kind as AnniversaryKind;
  const base = {
    id: `ms-${m.id}`,
    icon: m.emoji,
    recurrence: 'yearly' as const,
    milestoneId: m.id,
    anniversaryDay: m.day,
    createdAt: Date.now(),
    createdBy: uid,
  };

  if (m.day > toDay(today)) {
    return {
      ...base,
      title: UPCOMING_TITLE[kind],
      anniversaryTitle: ANNIVERSARY_TITLE[kind],
      date: endOfDay(parseDay(m.day)).getTime(),
    };
  }

  return {
    ...base,
    title: ANNIVERSARY_TITLE[kind],
    date: endOfDay(nextOccurrence(m.day, today)).getTime(),
  };
};

/**
 * Fields to update when an anniversary countdown has passed: next year's
 * date recomputed from the milestone day (so Feb 29 never drifts), and the
 * anniversary title once a future event has happened.
 */
export const rollAnniversary = (
  c: Countdown,
  now: Date,
): { date: number; title?: string; anniversaryTitle?: null } => ({
  date: endOfDay(nextOccurrence(c.anniversaryDay ?? toDay(new Date(c.date)), now)).getTime(),
  ...(c.anniversaryTitle ? { title: c.anniversaryTitle, anniversaryTitle: null } : {}),
});

/**
 * An anniversary's occurrence in a calendar month, or null. Never before
 * the milestone's own year.
 */
export const anniversaryInMonth = (
  day: string,
  year: number,
  monthIndex: number,
): number | null => {
  const [y, m, d] = day.split('-').map(Number);
  if (m - 1 !== monthIndex || year < y) return null;
  return endOfDay(new Date(year, monthIndex, Math.min(d, daysInMonth(year, monthIndex)))).getTime();
};

/**
 * Where a milestone is stored. Special kinds live at their kind ("dating"),
 * so two saves, even from both phones, land on the same record.
 */
export const resolveMilestoneId = (
  kind: Milestone['kind'],
  current: { id: string; kind: Milestone['kind'] } | undefined,
  makeId: () => string,
): string => {
  if (kind !== 'custom') return kind;
  return current && current.kind === 'custom' ? current.id : makeId();
};

/**
 * A hand-made countdown on the same month/day as `day`, if any
 */
export const findManualAnniversary = (
  countdowns: CountdownObject,
  day: string,
): Countdown | undefined => {
  const target = parseDay(day);
  return Object.values(countdowns).find((c) => {
    if (c.milestoneId) return false;
    const date = new Date(c.date);
    return date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
  });
};

/**
 * Counter text: "1,216 days" / "as a couple · 3y 3m 28d" / "since Jun 30, 2023"
 */
export const formatCounter = (
  m: Milestone,
  today: Date,
): { big: string; detail: string; since: string } => {
  const days = daysSince(m.day, today);
  const { years, months, days: rest } = ymdSince(m.day, today);
  const label = COUNTER_LABEL[m.kind as AnniversaryKind] ?? 'together';
  const since = parseDay(m.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    big: `${days.toLocaleString('en-US')} ${days === 1 ? 'day' : 'days'}`,
    detail: `${label} · ${years}y ${months}m ${rest}d`,
    since: `since ${since}`,
  };
};
