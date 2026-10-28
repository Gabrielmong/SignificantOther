/**
 * Color Math
 * Small hex helpers used to derive accent scales and readable text colors
 */

export type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

const toRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.substring(i, i + 2), 16)) as [number, number, number];
};

const toHex = (rgb: number[]): string =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Mix two hex colors. `weight` is the share of `b` (0 = all `a`, 1 = all `b`).
 */
export const mixHex = (a: string, b: string, weight: number): string => {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * weight));
};

const luminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * WCAG 2 contrast ratio between two hex colors
 */
export const contrastRatio = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * Text color for content drawn on `bg`: white when it reaches 3:1
 * (AA for bold/large text and UI), otherwise near-black.
 */
export const readableTextOn = (bg: string): '#ffffff' | '#111827' =>
  contrastRatio(bg, '#ffffff') >= 3 ? '#ffffff' : '#111827';

/**
 * Light-to-dark scale around `main` (500 = main)
 */
export const buildScale = (main: string): Scale => ({
  50: mixHex(main, '#ffffff', 0.92),
  100: mixHex(main, '#ffffff', 0.84),
  200: mixHex(main, '#ffffff', 0.68),
  300: mixHex(main, '#ffffff', 0.48),
  400: mixHex(main, '#ffffff', 0.24),
  500: main,
  600: mixHex(main, '#000000', 0.14),
  700: mixHex(main, '#000000', 0.28),
  800: mixHex(main, '#000000', 0.42),
  900: mixHex(main, '#000000', 0.56),
});
