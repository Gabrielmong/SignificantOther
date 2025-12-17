/**
 * Typography System
 * Font sizes, weights, line heights, and text styles
 */

/**
 * Font Sizes
 * Current app uses: 12, 14, 16, 18, 20, 24px
 * Standardized into a proper scale
 */
export const fontSize = {
  xs: 12,     // Caption, helper text, timestamps
  sm: 14,     // Small body, labels, secondary text
  md: 16,     // Default body text
  lg: 18,     // Large body, subtitles
  xl: 20,     // H3 headings, board names
  '2xl': 24,  // H2 headings, screen titles
  '3xl': 30,  // H1 headings
  '4xl': 36,  // Display text, hero headings
  '5xl': 48,  // Extra large display
} as const;

/**
 * Font Weights
 * Current app uses: regular (default) and bold
 * Extended with medium and semibold for better hierarchy
 */
export const fontWeight = {
  normal: '400',    // Regular text
  medium: '500',    // Slightly emphasized text
  semibold: '600',  // Section headers, important labels
  bold: '700',      // Headings, strong emphasis (current bold)
} as const;

/**
 * Line Heights
 * Relative to font size for better readability
 */
export const lineHeight = {
  tight: 1.2,     // For headings (tight spacing)
  normal: 1.5,    // For body text (comfortable reading)
  relaxed: 1.75,  // For large body text (extra breathing room)
} as const;

/**
 * Letter Spacing
 * Subtle adjustments for different font sizes
 */
export const letterSpacing = {
  tight: -0.02,   // Large headings (slightly condensed)
  normal: 0,      // Body text (default)
  wide: 0.02,     // Small caps, buttons (slightly expanded)
} as const;

/**
 * Pre-defined Text Styles
 * Common text style combinations for consistency
 */
export const textStyles = {
  // Display Styles (Hero text)
  display: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },

  // Heading Styles
  h1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },
  h2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.normal,
  },
  h4: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
  },

  // Body Styles
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },

  // Label Styles
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  labelSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },

  // Caption Styles
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },

  // Button Styles
  button: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },
  buttonSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },

  // Special Styles
  timestamp: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  badge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
  },
} as const;

/**
 * Component-Specific Typography
 * Preset styles for common components
 */
export const componentTypography = {
  // Screen Titles (e.g., "Chat", "Journal")
  screenTitle: textStyles.h2,

  // Board Name (Home screen)
  boardName: {
    fontSize: fontSize['2xl'],  // Upgraded from 20px
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
  },

  // Card Titles
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
  },

  // Input Labels
  inputLabel: textStyles.label,

  // Helper Text
  helperText: textStyles.caption,

  // Message Text (Chat)
  messageText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },

  // Message Timestamp
  messageTimestamp: textStyles.timestamp,

  // Journal Entry Title
  journalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.normal,
  },

  // Journal Entry Preview
  journalPreview: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },

  // Wishlist Item
  wishlistItem: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },

  // Quick Access Card Label (Home screen)
  quickAccessLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },

  // Quick Access Card Content
  quickAccessContent: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
} as const;

/**
 * Type exports
 */
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
export type LineHeight = keyof typeof lineHeight;
export type TextStyleKey = keyof typeof textStyles;
export type ComponentTypographyKey = keyof typeof componentTypography;
