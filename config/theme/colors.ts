/**
 * Color Palette
 * Neutral/semantic colors are fixed; accent colors (primary = me,
 * secondary = partner) are built from the user's accent theme.
 * Supports both light and dark modes.
 */

import { buildScale, readableTextOn, type Scale } from './colorMath';
import type { ColorPair } from './accentThemes';

// Neutral Grays (for text, borders, backgrounds)
export const neutral = {
  50: '#fafafa',    // Lightest backgrounds
  100: '#f5f5f5',   // Card backgrounds (current light mode)
  200: '#e5e5e5',   // Borders
  300: '#d4d4d4',   // Disabled text
  400: '#a3a3a3',   // Placeholder text
  500: '#737373',   // Secondary text
  600: '#525252',   // Body text
  700: '#404040',   // Headings (light mode)
  800: '#262626',   // Dark text
  900: '#171717',   // Darkest text
} as const;

// Dark Mode Specific Backgrounds
export const darkBg = {
  50: '#1a1a1a',    // Elevated surfaces
  100: '#121212',   // Main background (current dark mode bg)
  200: '#0a0a0a',   // Deepest backgrounds
  300: '#2e2e2e',   // Cards/elevated (current chat header)
  400: '#3a3a3a',   // Hover states on dark
} as const;

// Dark Mode Specific Text Colors
export const darkText = {
  50: '#ffffff',    // Primary text
  100: '#e5e5e5',   // Secondary text
  200: '#a3a3a3',   // Tertiary text (placeholder)
  300: '#737373',   // Disabled text
} as const;

// Semantic Colors
export const semantic = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

// Base Colors
export const base = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorMode = 'light' | 'dark';

/**
 * Non-accent colors for each mode
 */
const neutralColors = {
  light: {
    // Backgrounds
    background: neutral[50],        // Main app background
    surface: base.white,            // Card/surface background
    surfaceElevated: neutral[100],  // Elevated surfaces
    overlay: 'rgba(0, 0, 0, 0.5)',  // Modal overlay

    // Text
    text: neutral[700],             // Primary text
    textSecondary: neutral[500],    // Secondary text
    textTertiary: neutral[400],     // Tertiary/placeholder text
    textInverse: base.white,        // Text on dark backgrounds

    // Borders
    border: neutral[200],           // Default border color

    // Semantic
    success: semantic.success,
    error: semantic.error,
    warning: semantic.warning,
    info: semantic.info,

    // Component-specific
    cardBackground: base.white,
    inputBackground: base.white,
  },
  dark: {
    // Backgrounds
    background: darkBg[100],        // Main app background (#121212)
    surface: darkBg[50],            // Card/surface background
    surfaceElevated: darkBg[300],   // Elevated surfaces (#2e2e2e)
    overlay: 'rgba(0, 0, 0, 0.7)',  // Modal overlay

    // Text
    text: darkText[50],             // Primary text (white)
    textSecondary: darkText[100],   // Secondary text
    textTertiary: darkText[200],    // Tertiary/placeholder text
    textInverse: neutral[700],      // Text on light backgrounds

    // Borders
    border: darkText[300],          // Default border color

    // Semantic - lighter for dark mode
    success: '#34d399',
    error: '#f87171',
    warning: '#fbbf24',
    info: '#60a5fa',

    // Component-specific
    cardBackground: darkBg[50],
    inputBackground: darkBg[400],
  },
};

/**
 * 50..900 tokens for one accent. Dark mode inverts the light/dark ends so
 * low numbers stay "subtle" on a dark background.
 */
const accentSteps = (mode: ColorMode, pair: ColorPair, scale: Scale) =>
  mode === 'light'
    ? {
        50: scale[50],
        100: scale[100],
        200: scale[200],
        300: scale[300],
        400: scale[400],
        500: pair.solid,
        600: pair.deep,
        700: pair.deep,
        800: scale[800],
        900: scale[900],
      }
    : {
        50: scale[900],
        100: scale[800],
        200: scale[700],
        300: scale[600],
        400: scale[400],
        500: pair.solid,
        600: pair.deep,
        700: pair.deep,
        800: scale[200],
        900: scale[100],
      };

/**
 * Build the semantic color map for a mode and resolved accent pairs
 * - self: my main colors
 * - partner: my partner's colors as seen on my phone
 * - alt: my theme's alternate shades (used for room-level categories)
 */
export const getColors = (mode: ColorMode, self: ColorPair, partner: ColorPair, alt: ColorPair) => {
  const p = accentSteps(mode, self, buildScale(self.solid));
  const s = accentSteps(mode, partner, buildScale(partner.solid));

  return {
    // Base colors
    white: base.white,
    black: base.black,
    transparent: base.transparent,

    ...neutralColors[mode],

    borderFocus: self.solid,        // Focused input border

    // Primary (me)
    primary: self.solid,
    primary50: p[50],
    primary100: p[100],
    primary200: p[200],
    primary300: p[300],
    primary400: p[400],
    primary500: p[500],
    primary600: p[600],             // Hover/pressed
    primary700: p[700],             // Active/own entries
    primary800: p[800],
    primary900: p[900],

    // Secondary (partner)
    secondary: partner.solid,
    secondary50: s[50],
    secondary100: s[100],
    secondary200: s[200],
    secondary300: s[300],
    secondary400: s[400],
    secondary500: s[500],
    secondary600: s[600],           // Hover/pressed
    secondary700: s[700],           // Active/partner entries
    secondary800: s[800],
    secondary900: s[900],

    // Text drawn on accent backgrounds
    onPrimary: readableTextOn(self.solid),
    onPartner: readableTextOn(partner.solid),

    // My theme's alternate color (room-level categories, e.g. work zones)
    accentAlt: alt.solid,

    // Component-specific
    buttonPrimary: self.solid,
    buttonSecondary: partner.solid,

    // Message bubbles (chat)
    messageSelf: self.solid,        // User's messages
    messagePartner: partner.solid,  // Partner's messages

    // Journal entries
    journalSelf: self.deep,         // User's journal entries
    journalPartner: partner.deep,   // Partner's journal entries
  };
};

/**
 * Type exports for TypeScript
 */
export type ThemeColors = ReturnType<typeof getColors>;
export type ColorKey = keyof ThemeColors;
