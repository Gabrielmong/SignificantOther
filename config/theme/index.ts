/**
 * Theme Configuration - Main Export
 * Centralized design system for Significant Other app
 */

import {
  purple,
  blue,
  neutral,
  darkBg,
  darkText,
  semantic,
  base,
  lightColors,
  darkColors,
  getColors,
  type ColorMode,
  type ThemeColors,
  type ColorKey,
} from './colors';

import {
  spacing,
  commonSpacing,
  radii,
  shadows,
  type SpacingKey,
  type RadiiKey,
  type ShadowKey,
} from './spacing';

import {
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  componentTypography,
  type FontSize,
  type FontWeight,
  type LineHeight,
  type TextStyleKey,
  type ComponentTypographyKey,
} from './typography';

import {
  duration,
  easing,
  springConfig,
  animationPresets,
  interactionTiming,
  reducedMotion,
  type AnimationPreset,
  type SpringConfigKey,
  type DurationKey,
} from './animations';

import {
  gradients,
  getGradient,
  type GradientKey,
  type GradientConfig,
} from './gradients';

/**
 * Complete Theme Object
 */
export interface Theme {
  colorMode: ColorMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  commonSpacing: typeof commonSpacing;
  radii: typeof radii;
  shadows: typeof shadows;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  letterSpacing: typeof letterSpacing;
  textStyles: typeof textStyles;
  componentTypography: typeof componentTypography;
  duration: typeof duration;
  easing: typeof easing;
  springConfig: typeof springConfig;
  animationPresets: typeof animationPresets;
  interactionTiming: typeof interactionTiming;
  gradients: typeof gradients;
}

/**
 * Create theme object based on color mode
 */
export const createTheme = (colorMode: ColorMode = 'dark'): Theme => {
  return {
    colorMode,
    colors: getColors(colorMode),
    spacing,
    commonSpacing,
    radii,
    shadows,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textStyles,
    componentTypography,
    duration,
    easing,
    springConfig,
    animationPresets,
    interactionTiming,
    gradients,
  };
};

/**
 * Default themes
 */
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

/**
 * Export all individual modules
 */
export {
  // Colors
  purple,
  blue,
  neutral,
  darkBg,
  darkText,
  semantic,
  base,
  lightColors,
  darkColors,
  getColors,

  // Spacing
  spacing,
  commonSpacing,
  radii,
  shadows,

  // Typography
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  componentTypography,

  // Animations
  duration,
  easing,
  springConfig,
  animationPresets,
  interactionTiming,
  reducedMotion,

  // Gradients
  gradients,
  getGradient,
};

/**
 * Export all types
 */
export type {
  ColorMode,
  ThemeColors,
  ColorKey,
  SpacingKey,
  RadiiKey,
  ShadowKey,
  FontSize,
  FontWeight,
  LineHeight,
  TextStyleKey,
  ComponentTypographyKey,
  AnimationPreset,
  SpringConfigKey,
  DurationKey,
  GradientKey,
  GradientConfig,
};

/**
 * Helper functions
 */

/**
 * Get spacing value
 */
export const getSpacing = (key: SpacingKey): number => {
  return spacing[key];
};

/**
 * Get multiple spacing values
 */
export const getSpacingMultiple = (...keys: SpacingKey[]): number[] => {
  return keys.map((key) => spacing[key]);
};

/**
 * Get text style
 */
export const getTextStyle = (key: TextStyleKey) => {
  return textStyles[key];
};

/**
 * Get component typography
 */
export const getComponentTypography = (key: ComponentTypographyKey) => {
  return componentTypography[key];
};

/**
 * Get shadow style
 */
export const getShadow = (key: ShadowKey) => {
  return shadows[key];
};

/**
 * Get animation preset
 */
export const getAnimationPreset = (key: AnimationPreset) => {
  return animationPresets[key];
};

/**
 * Apply opacity to color
 * Useful for creating semi-transparent colors
 */
export const applyOpacity = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  // Handle rgb colors
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  return color;
};

/**
 * Get contrast text color based on background
 * Returns either black or white for optimal contrast
 */
export const getContrastColor = (backgroundColor: string, theme: Theme): string => {
  // Simple implementation - in production, you'd calculate luminance
  // For now, use theme-aware approach
  if (theme.colorMode === 'dark') {
    return theme.colors.text;
  }
  return theme.colors.text;
};
