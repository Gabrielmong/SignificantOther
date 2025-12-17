/**
 * Spacing Scale - 4px Base Unit
 * Consistent spacing system for margins, padding, gaps
 */

export const spacing = {
  0: 0,       // No spacing
  1: 4,       // 4px - Tight spacing
  2: 8,       // 8px - Compact spacing (replaces hardcoded 10)
  3: 12,      // 12px - Default gap
  4: 16,      // 16px - Standard padding (replaces hardcoded 20 in some places)
  5: 20,      // 20px - Comfortable spacing (current default)
  6: 24,      // 24px - Loose spacing
  7: 28,      // 28px
  8: 32,      // 32px - Section spacing
  9: 36,      // 36px
  10: 40,     // 40px - Large spacing
  11: 44,     // 44px
  12: 48,     // 48px - Extra large
  14: 56,     // 56px
  16: 64,     // 64px - Huge spacing
  20: 80,     // 80px
  24: 96,     // 96px
  28: 112,    // 112px
  32: 128,    // 128px
} as const;

/**
 * Commonly used spacing values with semantic names
 */
export const commonSpacing = {
  // Padding
  screenPadding: spacing[5],      // 20px - Default screen padding
  cardPadding: spacing[6],        // 24px - Card padding (upgraded from 20)
  cardPaddingCompact: spacing[5], // 20px - Compact card padding
  buttonPadding: spacing[3],      // 12px - Button padding
  inputPadding: spacing[4],       // 16px - Input padding

  // Gaps
  tinyGap: spacing[1],           // 4px
  smallGap: spacing[2],          // 8px
  defaultGap: spacing[4],        // 16px - Default gap (upgraded from 10)
  mediumGap: spacing[5],         // 20px
  largeGap: spacing[6],          // 24px
  extraLargeGap: spacing[8],     // 32px

  // Component-specific
  iconSize: spacing[6],          // 24px - Default icon size
  iconSizeLarge: spacing[8],     // 32px - Large icon
  iconSizeSmall: spacing[5],     // 20px - Small icon

  // Layout
  sectionSpacing: spacing[8],    // 32px - Between sections
  contentSpacing: spacing[6],    // 24px - Between content blocks
} as const;

/**
 * Border Radius Scale
 */
export const radii = {
  none: 0,
  sm: 8,      // Small elements
  md: 10,     // Default (current button/card radius)
  lg: 12,     // Large cards
  xl: 16,     // Modal/sheet corners
  '2xl': 20,  // Images (current feeling/flower images)
  '3xl': 24,  // Extra large radius
  full: 9999, // Circles, pills
} as const;

/**
 * Shadow/Elevation System
 * Using react-native shadow properties
 */
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

/**
 * Type exports
 */
export type SpacingKey = keyof typeof spacing;
export type RadiiKey = keyof typeof radii;
export type ShadowKey = keyof typeof shadows;
