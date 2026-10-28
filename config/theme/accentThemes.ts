/**
 * Accent Themes
 * User-selectable accent palettes. Each person picks one; the partner's side
 * of shared views uses the partner's pick (or this theme's alternate shades
 * when both picked the same one).
 */

import type { ColorMode } from './colors';

export type AccentId = 'twilight' | 'rose' | 'ocean' | 'forest' | 'sunset' | 'graphite';

export type AccentShades = { main: string; main2: string; alt: string; alt2: string };

export type AccentTheme = { id: AccentId; name: string; light: AccentShades; dark: AccentShades };

export type ColorPair = { solid: string; deep: string };

export const ACCENT_IDS: readonly AccentId[] = [
  'twilight',
  'rose',
  'ocean',
  'forest',
  'sunset',
  'graphite',
];

export const DEFAULT_ACCENT: AccentId = 'twilight';

export const accentThemes: Record<AccentId, AccentTheme> = {
  twilight: {
    id: 'twilight',
    name: 'Twilight',
    light: { main: '#8859ff', main2: '#5a1fff', alt: '#5d6ee8', alt2: '#2a2f9e' },
    dark: { main: '#9d75ff', main2: '#6e34ff', alt: '#7179f6', alt2: '#4a52d4' },
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    light: { main: '#e8457c', main2: '#be185d', alt: '#f0835a', alt2: '#d4552c' },
    dark: { main: '#f472a0', main2: '#db2777', alt: '#f79b78', alt2: '#e8673f' },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    light: { main: '#0e9fb4', main2: '#0b6f85', alt: '#3a72e0', alt2: '#2448a8' },
    dark: { main: '#2cc3d6', main2: '#0e9fb4', alt: '#6b97f2', alt2: '#3a72e0' },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    light: { main: '#2f9e6a', main2: '#1d6f49', alt: '#8a9a2a', alt2: '#5f6c14' },
    dark: { main: '#4cc48b', main2: '#2f9e6a', alt: '#b0c24a', alt2: '#8a9a2a' },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    light: { main: '#ef7a2c', main2: '#c2510f', alt: '#de4561', alt2: '#a8233e' },
    dark: { main: '#ff9a52', main2: '#ef7a2c', alt: '#f06b83', alt2: '#de4561' },
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    light: { main: '#475569', main2: '#1e293b', alt: '#7c8aa0', alt2: '#55627a' },
    dark: { main: '#a8b4c6', main2: '#64748b', alt: '#d0d7e2', alt2: '#94a3b8' },
  },
};

export const isAccentId = (v: unknown): v is AccentId =>
  typeof v === 'string' && (ACCENT_IDS as readonly string[]).includes(v);

export const toAccentId = (v: unknown): AccentId => (isAccentId(v) ? v : DEFAULT_ACCENT);

/**
 * My own colors: main → main2
 */
export const selfPair = (mode: ColorMode, mine: AccentId): ColorPair => {
  const s = accentThemes[mine][mode];
  return { solid: s.main, deep: s.main2 };
};

/**
 * My theme's alternate shades: alt → alt2
 */
export const altPair = (mode: ColorMode, mine: AccentId): ColorPair => {
  const s = accentThemes[mine][mode];
  return { solid: s.alt, deep: s.alt2 };
};

/**
 * Partner's colors as seen on my phone: their theme's main colors, or my
 * theme's alternate shades when we both picked the same theme.
 */
export const partnerPair = (mode: ColorMode, mine: AccentId, partner: AccentId): ColorPair =>
  partner === mine ? altPair(mode, mine) : selfPair(mode, partner);
