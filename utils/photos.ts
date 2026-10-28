/**
 * Gallery helpers
 * Pure functions (no React Native, no Firebase) so they can be checked
 * outside the app.
 */

import type { Photo } from '../types/Photo';
import type { Milestone } from '../types/Milestone';
import { parseDay, toDay } from './milestones';

/**
 * A tag as stored: trimmed, lowercase, single spaces, and without the
 * characters Firebase doesn't allow in keys. '' means "not a tag".
 */
export const normalizeTag = (raw: string): string =>
  raw
    .replace(/[.#$/[\]]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * Tags as stored on a photo, or undefined when there are none
 */
export const tagsFromList = (list: string[]): Record<string, true> | undefined => {
  const tags: Record<string, true> = {};
  for (const raw of list) {
    const tag = normalizeTag(raw);
    if (tag) tags[tag] = true;
  }
  return Object.keys(tags).length ? tags : undefined;
};

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2})/;

/**
 * The day a photo was taken, from its EXIF data ("YYYY:MM:DD HH:MM:SS"),
 * or today when the photo doesn't say
 */
export const exifDay = (exif: Record<string, unknown> | null | undefined, today: Date): string => {
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized']) {
    const value = exif?.[key];
    const match = typeof value === 'string' ? EXIF_DATE.exec(value) : null;
    if (match) {
      const [, y, m, d] = match.map(Number);
      const date = new Date(y, m - 1, d);
      if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
  }
  return toDay(today);
};

/**
 * Newest first: by day, then by when it was added
 */
export const sortPhotos = (photos: Photo[]): Photo[] =>
  [...photos].sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt);

export type Section = { key: string; title: string; photos: Photo[] };

/**
 * Sections for an already-sorted list: "June 2025" by month, "2025" by year
 */
export const groupPhotos = (photos: Photo[], by: 'month' | 'year'): Section[] => {
  const sections: Section[] = [];
  for (const photo of photos) {
    const key = by === 'month' ? photo.day.slice(0, 7) : photo.day.slice(0, 4);
    let section = sections[sections.length - 1];
    if (!section || section.key !== key) {
      const title =
        by === 'month'
          ? parseDay(photo.day).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : key;
      section = { key, title, photos: [] };
      sections.push(section);
    }
    section.photos.push(photo);
  }
  return sections;
};

export const ZOOM_STEPS = [2, 3, 5] as const;
export type Columns = (typeof ZOOM_STEPS)[number];

/**
 * Pinch "out" makes tiles bigger (fewer columns); "in" fits more per row
 */
export const nextColumns = (current: Columns, pinch: 'in' | 'out'): Columns => {
  const index = ZOOM_STEPS.indexOf(current);
  const next = pinch === 'in' ? index + 1 : index - 1;
  return ZOOM_STEPS[Math.min(Math.max(next, 0), ZOOM_STEPS.length - 1)];
};

/**
 * Every tag in use, most used first
 */
export const tagCounts = (photos: Photo[]): { tag: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    for (const tag of Object.keys(photo.tags ?? {})) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
};

export const photosWithTag = (photos: Photo[], tag: string | null): Photo[] =>
  tag ? photos.filter((photo) => photo.tags?.[tag]) : photos;

/**
 * The gallery entry fields a milestone owns. Gallery-owned fields (tags,
 * description) and creation info are never included, so writing these
 * with `update` keeps them.
 */
export const milestoneMirrorFields = (
  m: Milestone,
  now: number,
): Partial<Photo> & { id: string } => {
  const photo = m.photo!;
  return {
    id: `ms-${m.id}`,
    url: photo.url,
    path: photo.path,
    ...(photo.thumbUrl ? { thumbUrl: photo.thumbUrl } : {}),
    ...(photo.thumbPath ? { thumbPath: photo.thumbPath } : {}),
    ...(photo.width ? { width: photo.width } : {}),
    ...(photo.height ? { height: photo.height } : {}),
    day: m.day,
    label: m.title,
    milestoneId: m.id,
    ...(m.placeId ? { placeId: m.placeId } : {}),
    updatedAt: now,
  };
};

/**
 * Where the photo on screen is now, after the list changed. Follows its id
 * (inserts, re-sorts); if it's gone, stays at the same place, clamped to the
 * end. -1 when the list is empty.
 */
export const followPhoto = (
  photos: { id: string }[],
  currentId: string | null,
  previousIndex: number,
): number => {
  if (photos.length === 0) return -1;
  const found = currentId ? photos.findIndex((p) => p.id === currentId) : -1;
  return found >= 0 ? found : Math.min(Math.max(previousIndex, 0), photos.length - 1);
};
