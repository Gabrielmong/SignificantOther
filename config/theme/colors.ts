/**
 * Color Palette - Modern Minimalist Purple/Blue Theme
 * Supports both light and dark modes with WCAG AA compliant contrast ratios
 */

// Purple Scale (Primary) - Based on #8859ff
export const purple = {
  50: '#f6f3ff',    // Very light purple for backgrounds
  100: '#ede7ff',   // Light purple for hover states
  200: '#ddd2ff',   // Subtle highlights
  300: '#c3b1ff',   // Disabled states
  400: '#a385ff',   // Secondary actions
  500: '#8859ff',   // PRIMARY - Main purple (current brand color)
  600: '#6e34ff',   // Hover/pressed states
  700: '#5a1fff',   // Active/focus states, own journal entries
  800: '#4a0fdb',   // Deep accents
  900: '#3a0ba8',   // Darkest purple
} as const;

// Blue Scale (Secondary) - Based on #323aba
export const blue = {
  50: '#f0f2fe',    // Very light blue backgrounds
  100: '#e1e5fd',   // Light blue hover
  200: '#c3cbfb',   // Subtle blue highlights
  300: '#8997f6',   // Light actions
  400: '#5d6ee8',   // Secondary buttons
  500: '#323aba',   // SECONDARY - Main blue (current partner color)
  600: '#2a2f9e',   // Hover states
  700: '#222582',   // Active states, partner journal entries
  800: '#1a1c66',   // Deep blue
  900: '#12144a',   // Darkest blue
} as const;

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

/**
 * Light Mode Color Map
 * Semantic color assignments for light mode
 */
export const lightColors = {
  // Base colors
  white: base.white,
  black: base.black,
  transparent: base.transparent,

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
  borderFocus: purple[500],       // Focused input border

  // Primary (Purple)
  primary: purple[500],           // Main primary color
  primary50: purple[50],
  primary100: purple[100],
  primary200: purple[200],
  primary300: purple[300],
  primary400: purple[400],
  primary500: purple[500],
  primary600: purple[600],        // Hover/pressed
  primary700: purple[700],        // Active/own entries
  primary800: purple[800],
  primary900: purple[900],

  // Secondary (Blue)
  secondary: blue[500],           // Main secondary color
  secondary50: blue[50],
  secondary100: blue[100],
  secondary200: blue[200],
  secondary300: blue[300],
  secondary400: blue[400],
  secondary500: blue[500],
  secondary600: blue[600],        // Hover/pressed
  secondary700: blue[700],        // Active/partner entries
  secondary800: blue[800],
  secondary900: blue[900],

  // Semantic
  success: semantic.success,
  error: semantic.error,
  warning: semantic.warning,
  info: semantic.info,

  // Component-specific
  cardBackground: base.white,
  inputBackground: base.white,
  buttonPrimary: purple[500],
  buttonSecondary: blue[500],

  // Message bubbles (chat)
  messageSelf: purple[600],       // User's messages
  messagePartner: blue[600],      // Partner's messages

  // Journal entries
  journalSelf: purple[700],       // User's journal entries
  journalPartner: blue[700],      // Partner's journal entries
} as const;

/**
 * Dark Mode Color Map
 * Semantic color assignments for dark mode
 * Colors adjusted for better visibility on dark backgrounds
 */
export const darkColors = {
  // Base colors
  white: base.white,
  black: base.black,
  transparent: base.transparent,

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
  borderFocus: '#9d75ff',         // Focused input border (lighter purple)

  // Primary (Purple) - Lighter shades for dark mode visibility
  primary: '#9d75ff',             // Main primary color (lighter)
  primary50: purple[900],         // Inverted for dark mode
  primary100: purple[800],
  primary200: purple[700],
  primary300: purple[600],
  primary400: purple[500],
  primary500: '#9d75ff',          // Lighter purple for visibility
  primary600: '#b08cff',          // Hover/pressed
  primary700: '#c4a3ff',          // Active/own entries
  primary800: purple[200],
  primary900: purple[100],

  // Secondary (Blue) - Lighter shades for dark mode visibility
  secondary: '#4a52d4',           // Main secondary color (lighter)
  secondary50: blue[900],         // Inverted for dark mode
  secondary100: blue[800],
  secondary200: blue[700],
  secondary300: blue[600],
  secondary400: blue[500],
  secondary500: '#4a52d4',        // Lighter blue for visibility
  secondary600: '#5d66e8',        // Hover/pressed
  secondary700: '#7179f6',        // Active/partner entries
  secondary800: blue[200],
  secondary900: blue[100],

  // Semantic
  success: '#34d399',             // Lighter for dark mode
  error: '#f87171',               // Lighter for dark mode
  warning: '#fbbf24',             // Lighter for dark mode
  info: '#60a5fa',                // Lighter for dark mode

  // Component-specific
  cardBackground: darkBg[50],
  inputBackground: darkBg[400],
  buttonPrimary: '#9d75ff',
  buttonSecondary: '#4a52d4',

  // Message bubbles (chat) - Using current colors
  messageSelf: purple[500],       // User's messages (#8859ff)
  messagePartner: blue[500],      // Partner's messages (#323aba)

  // Journal entries
  journalSelf: purple[700],       // User's journal entries
  journalPartner: blue[700],      // Partner's journal entries
} as const;

/**
 * Get colors based on color mode
 */
export const getColors = (mode: 'light' | 'dark') => {
  return mode === 'dark' ? darkColors : lightColors;
};

/**
 * Type exports for TypeScript
 */
export type ColorMode = 'light' | 'dark';
export type LightColors = typeof lightColors;
export type DarkColors = typeof darkColors;
export type ThemeColors = LightColors | DarkColors;
export type ColorKey = keyof LightColors; // Use lightColors keys as they're the same
