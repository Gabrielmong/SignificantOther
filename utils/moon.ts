import * as Astronomy from 'astronomy-engine';

import type { CountdownOccurrence } from './feelingHistory';

// Moon phases, favorite-phase countdowns and lunar events, all computed on the
// device. Angles are the moon's phase angle in degrees: 0 = new, 180 = full.

export const PHASE_COUNT = 28;
const SYNODIC_MONTH_DAYS = 29.530588;
const DAY_MS = 86_400_000;
// The favorite counts as "here tonight" this close to its exact moment (≈ ±half a day)
const NOW_WINDOW_DEG = 6;
// Principal phases (new, quarters, full) only get their name this close to the exact angle
const PRINCIPAL_WINDOW_DEG = 7.5;
const SUPERMOON_MAX_KM = 360_000;

export type MoonPhaseName =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

export const PHASE_LABELS: Record<MoonPhaseName, string> = {
  new: 'New Moon',
  waxingCrescent: 'Waxing Crescent',
  firstQuarter: 'First Quarter',
  waxingGibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waningGibbous: 'Waning Gibbous',
  lastQuarter: 'Last Quarter',
  waningCrescent: 'Waning Crescent',
};

export const PHASE_EMOJIS: Record<MoonPhaseName, string> = {
  new: '🌑',
  waxingCrescent: '🌒',
  firstQuarter: '🌓',
  waxingGibbous: '🌔',
  full: '🌕',
  waningGibbous: '🌖',
  lastQuarter: '🌗',
  waningCrescent: '🌘',
};

const normalize = (angle: number) => ((angle % 360) + 360) % 360;

export const indexToAngle = (index: number) => (index * 360) / PHASE_COUNT;

export const angleToIndex = (angle: number) =>
  Math.round(normalize(angle) / (360 / PHASE_COUNT)) % PHASE_COUNT;

/** Smallest absolute difference between two angles, 0..180 */
export const angleDiff = (a: number, b: number) => {
  const d = Math.abs(normalize(a) - normalize(b));
  return d > 180 ? 360 - d : d;
};

export const phaseName = (angle: number): MoonPhaseName => {
  const a = normalize(angle);
  if (angleDiff(a, 0) <= PRINCIPAL_WINDOW_DEG) return 'new';
  if (angleDiff(a, 90) <= PRINCIPAL_WINDOW_DEG) return 'firstQuarter';
  if (angleDiff(a, 180) <= PRINCIPAL_WINDOW_DEG) return 'full';
  if (angleDiff(a, 270) <= PRINCIPAL_WINDOW_DEG) return 'lastQuarter';
  if (a < 90) return 'waxingCrescent';
  if (a < 180) return 'waxingGibbous';
  if (a < 270) return 'waningGibbous';
  return 'waningCrescent';
};

/** Lit fraction for a phase angle, for previews of a phase that isn't tonight */
export const illuminationAtAngle = (angle: number) => (1 - Math.cos((angle * Math.PI) / 180)) / 2;

export type MoonInfo = {
  angle: number;
  illumination: number;
  ageDays: number;
  name: MoonPhaseName;
  imageIndex: number;
};

export const getMoonInfo = (date: Date): MoonInfo => {
  const angle = Astronomy.MoonPhase(date);
  return {
    angle,
    illumination: Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction,
    ageDays: (angle / 360) * SYNODIC_MONTH_DAYS,
    name: phaseName(angle),
    imageIndex: angleToIndex(angle),
  };
};

/** The next time the moon reaches `angle`. A whole cycle is < 30 days, so 40 always finds one. */
export const nextPhaseTime = (angle: number, from: Date): Date =>
  Astronomy.SearchMoonPhase(normalize(angle), from, 40)!.date;

export type FavoriteStatus = { isNow: boolean; next: Date; days: number };

export const favoriteStatus = (favoriteAngle: number, now: Date): FavoriteStatus => {
  const next = nextPhaseTime(favoriteAngle, now);
  return {
    isNow: angleDiff(Astronomy.MoonPhase(now), favoriteAngle) <= NOW_WINDOW_DEG,
    next,
    days: Math.max(1, Math.round((next.getTime() - now.getTime()) / DAY_MS)),
  };
};

export const countdownText = (partnerName: string, status: FavoriteStatus | null) => {
  if (!status) return `${partnerName} hasn't picked a favorite moon yet`;
  if (status.isNow) return `${partnerName}'s favorite is here tonight`;
  if (status.days === 1) return `${partnerName}'s favorite is tomorrow`;
  return `${partnerName}'s favorite in ${status.days} days`;
};

/** When an event happens relative to `now`, by local calendar day */
export const relativeDayLabel = (date: Date, now: Date) => {
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(date) - dayStart(now)) / DAY_MS);
  if (days === 0) return date < now ? 'Earlier today' : 'Tonight';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

export type LunarEvent = {
  date: Date;
  type: 'fullMoon' | 'eclipse';
  supermoon?: boolean;
  blueMoon?: boolean;
  eclipseKind?: 'penumbral' | 'partial' | 'total';
};

/** Full moons (tagged supermoon / blue moon) and lunar eclipses from `from` for `months` months */
export const upcomingLunarEvents = (from: Date, months = 12): LunarEvent[] => {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  const events: LunarEvent[] = [];

  const eclipses: Astronomy.LunarEclipseInfo[] = [];
  let eclipse = Astronomy.SearchLunarEclipse(from);
  while (eclipse.peak.date <= end) {
    eclipses.push(eclipse);
    eclipse = Astronomy.NextLunarEclipse(eclipse.peak);
  }

  // Start a cycle early so the first full moon in range knows whether it's the month's second
  let previous: Date | null = null;
  let t = new Date(from.getTime() - 32 * DAY_MS);
  for (;;) {
    const date = nextPhaseTime(180, t);
    if (date > end) break;
    if (date >= from) {
      const km = Astronomy.GeoMoon(date).Length() * Astronomy.KM_PER_AU;
      const blueMoon =
        !!previous &&
        previous.getFullYear() === date.getFullYear() &&
        previous.getMonth() === date.getMonth();
      const supermoon = km < SUPERMOON_MAX_KM;
      // Eclipses happen at full moon: list that night once, as the eclipse
      const sameNight = eclipses.find(
        (e) => Math.abs(e.peak.date.getTime() - date.getTime()) < DAY_MS,
      );
      events.push(
        sameNight
          ? {
              date: sameNight.peak.date,
              type: 'eclipse',
              eclipseKind: sameNight.kind as LunarEvent['eclipseKind'],
              supermoon,
              blueMoon,
            }
          : { date, type: 'fullMoon', supermoon, blueMoon },
      );
    }
    previous = date;
    t = new Date(date.getTime() + DAY_MS);
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const lunarEventIcon = (e: LunarEvent) => {
  if (e.type === 'fullMoon') return '🌕';
  if (e.eclipseKind === 'total') return '🔴';
  if (e.eclipseKind === 'partial') return '🌘';
  return '🌒';
};

export const lunarEventTitle = (e: LunarEvent) => {
  const tags = [e.supermoon && 'Supermoon', e.blueMoon && 'Blue moon'].filter(Boolean);
  const suffix = tags.length ? ` · ${tags.join(' · ')}` : '';
  if (e.type === 'fullMoon') return `Full Moon${suffix}`;
  if (e.eclipseKind === 'total') return `Blood Moon (total lunar eclipse)${suffix}`;
  if (e.eclipseKind === 'partial') return `Partial lunar eclipse${suffix}`;
  return `Penumbral lunar eclipse${suffix}`;
};

/**
 * Moon days in `month` (YYYY-MM) for the calendar, grouped by local day in the same
 * shape as countdown occurrences. Each day lists eclipses, then favorites, then full moons.
 */
export const moonOccurrencesInMonth = (
  month: string,
  {
    myFavorite,
    partnerFavorite,
    partnerName,
  }: { myFavorite: number | null; partnerFavorite: number | null; partnerName: string },
): { [day: number]: CountdownOccurrence[] } => {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 1);
  const items: (CountdownOccurrence & { rank: number })[] = [];

  for (const e of upcomingLunarEvents(start, 1)) {
    if (e.date >= end) continue;
    items.push({
      id: `moon-${e.type}-${e.date.getTime()}`,
      title: lunarEventTitle(e),
      icon: lunarEventIcon(e),
      date: e.date.getTime(),
      rank: e.type === 'eclipse' ? 0 : 2,
    });
  }

  const favorites: [number | null, string, string][] = [
    [myFavorite, 'mine', 'Your favorite moon'],
    [partnerFavorite, 'partner', `${partnerName}'s favorite moon`],
  ];
  for (const [angle, who, title] of favorites) {
    if (angle === null) continue;
    let t = start;
    for (;;) {
      const date = nextPhaseTime(angle, t);
      if (date >= end) break;
      items.push({
        id: `moon-${who}-${date.getTime()}`,
        title,
        icon: PHASE_EMOJIS[phaseName(angle)],
        date: date.getTime(),
        rank: 1,
      });
      t = new Date(date.getTime() + DAY_MS);
    }
  }

  const byDay: { [day: number]: CountdownOccurrence[] } = {};
  for (const { rank, ...occurrence } of items.sort((a, b) => a.rank - b.rank || a.date - b.date)) {
    (byDay[new Date(occurrence.date).getDate()] ??= []).push(occurrence);
  }
  return byDay;
};
