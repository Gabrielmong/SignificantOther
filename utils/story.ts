/**
 * Story helpers
 * Pure functions (no React Native, no Firebase) that turn milestones and
 * photos into the couple's story, and find what happened "on this day".
 */

import type { Milestone, SpecialKind } from '../types/Milestone';
import type { Photo } from '../types/Photo';
import { toDay } from './milestones';

const SPECIAL_KINDS: readonly string[] = ['met', 'dating', 'engaged', 'married'] satisfies SpecialKind[];
const NOTIFY_HOUR = 9;

export type StoryDay = {
  day: string;
  milestones: Milestone[];
  photos: Photo[]; // A milestone's own (mirror) photo is not listed here
  placeId?: string;
};

export type StoryYear = { year: string; days: StoryDay[] };

export type Memory = { day: StoryDay; yearsAgo: number };

export type Highlight = {
  day: string;
  yearsAgo: number;
  title: string;
  milestone?: Milestone;
  photos: Photo[];
  placeId?: string;
  more: number; // Other memories for the same date
};

export type ScheduledMemory = {
  date: string; // When the notification goes out
  day: string; // The memory's day, to open the story there
  title: string;
  body: string;
};

// The milestone's place, otherwise the place most of the day's photos share
const dayPlace = (milestones: Milestone[], photos: Photo[]): string | undefined => {
  const fromMilestone = milestones.find((m) => m.placeId)?.placeId;
  if (fromMilestone) return fromMilestone;

  const counts = new Map<string, number>();
  for (const p of photos) {
    if (p.placeId) counts.set(p.placeId, (counts.get(p.placeId) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [placeId, count] of counts) {
    if (count > bestCount) {
      best = placeId;
      bestCount = count;
    }
  }
  return best;
};

/**
 * The whole story, oldest first: years, then days, each with its milestones
 * and the photos taken that day
 */
export const buildStory = (milestones: Milestone[], photos: Photo[]): StoryYear[] => {
  const byDay = new Map<string, { milestones: Milestone[]; photos: Photo[] }>();
  const entry = (day: string) => {
    let e = byDay.get(day);
    if (!e) {
      e = { milestones: [], photos: [] };
      byDay.set(day, e);
    }
    return e;
  };

  for (const m of milestones) entry(m.day).milestones.push(m);
  for (const p of photos) {
    if (!p.milestoneId) entry(p.day).photos.push(p);
  }

  const years = new Map<string, StoryDay[]>();
  for (const day of [...byDay.keys()].sort()) {
    const e = byDay.get(day)!;
    const ms = [...e.milestones].sort((a, b) => a.createdAt - b.createdAt);
    const ps = [...e.photos].sort((a, b) => a.createdAt - b.createdAt);
    const placeId = dayPlace(ms, ps);
    const storyDay: StoryDay = { day, milestones: ms, photos: ps, ...(placeId ? { placeId } : {}) };

    const year = day.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year)!.push(storyDay);
  }

  return [...years.entries()].map(([year, days]) => ({ year, days }));
};

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Memories from today's month/day in earlier years, most recent first. A
 * Feb 29 memory shows on Feb 28 in years without one.
 */
export const memoriesOn = (story: StoryYear[], date: Date): Memory[] => {
  const year = date.getFullYear();
  const monthDay = toDay(date).slice(5);
  const leapStandIn = monthDay === '02-28' && !isLeapYear(year);

  const memories: Memory[] = [];
  for (const y of story) {
    const memoryYear = Number(y.year);
    if (memoryYear >= year) continue;
    for (const d of y.days) {
      const md = d.day.slice(5);
      if (md === monthDay || (leapStandIn && md === '02-29')) {
        memories.push({ day: d, yearsAgo: year - memoryYear });
      }
    }
  }
  return memories.sort((a, b) => a.yearsAgo - b.yearsAgo);
};

export const yearsText = (n: number): string => `${n} ${n === 1 ? 'year' : 'years'} ago`;

/**
 * The memory to show: a milestone (most recent year first), otherwise the
 * most recent day of photos. `excludeSpecial` leaves out met/dating/engaged/
 * married, which already have their own anniversaries.
 */
export const pickHighlight = (
  memories: Memory[],
  opts?: { excludeSpecial?: boolean },
): Highlight | null => {
  const usable = memories
    .map((m) =>
      opts?.excludeSpecial
        ? {
            ...m,
            day: { ...m.day, milestones: m.day.milestones.filter((x) => !SPECIAL_KINDS.includes(x.kind)) },
          }
        : m,
    )
    .filter((m) => m.day.milestones.length > 0 || m.day.photos.length > 0);
  if (usable.length === 0) return null;

  const pick = usable.find((m) => m.day.milestones.length > 0) ?? usable[0];
  const milestone = pick.day.milestones[0];
  const count = pick.day.photos.length;

  return {
    day: pick.day.day,
    yearsAgo: pick.yearsAgo,
    title: milestone ? milestone.title : `${count} ${count === 1 ? 'photo' : 'photos'}`,
    ...(milestone ? { milestone } : {}),
    photos: pick.day.photos,
    ...(pick.day.placeId ? { placeId: pick.day.placeId } : {}),
    more: usable.length - 1,
  };
};

/**
 * Morning notifications for the next `horizonDays` days that have a memory
 * other than a special milestone. Today is included only before 09:00, so
 * nothing is ever scheduled in the past.
 */
export const notificationSchedule = (
  story: StoryYear[],
  now: Date,
  horizonDays = 30,
): ScheduledMemory[] => {
  const schedule: ScheduledMemory[] = [];
  for (let i = 0; i < horizonDays; i++) {
    if (i === 0 && now.getHours() >= NOTIFY_HOUR) continue;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const highlight = pickHighlight(memoriesOn(story, date), { excludeSpecial: true });
    if (!highlight) continue;
    schedule.push({
      date: toDay(date),
      day: highlight.day,
      title: 'On this day 💞',
      body: `${yearsText(highlight.yearsAgo)}: ${highlight.title}`,
    });
  }
  return schedule;
};

/**
 * The first `max` thumbnails, and how many more there are (shown as "+N")
 */
export const capThumbs = <T,>(items: T[], max = 12): { shown: T[]; extra: number } => ({
  shown: items.slice(0, max),
  extra: Math.max(items.length - max, 0),
});
