/**
 * Gradient Configurations
 * Pre-defined gradients for use across the app
 */

export interface GradientConfig {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
}

type GradientsType = { [key: string]: GradientConfig };

/**
 * Gradient presets
 */
export const gradients: GradientsType = {
  // Primary gradients (Purple)
  primarySubtle: {
    colors: ['#9d75ff', '#8859ff'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  primaryBold: {
    colors: ['#a385ff', '#6e34ff'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  primaryVertical: {
    colors: ['#c4a3ff', '#8859ff', '#5a1fff'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    locations: [0, 0.5, 1],
  },

  // Secondary gradients (Blue)
  secondarySubtle: {
    colors: ['#5d66e8', '#323aba'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondaryBold: {
    colors: ['#7179f6', '#2a2f9e'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Combined gradients
  sunset: {
    colors: ['#a385ff', '#8859ff', '#5d66e8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 0.5, 1],
  },
  aurora: {
    colors: ['#c4a3ff', '#a385ff', '#7179f6', '#5d66e8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 0.33, 0.66, 1],
  },

  // Neutral gradients with transparency
  glassDark: {
    colors: ['rgba(46, 46, 46, 0.7)', 'rgba(26, 26, 26, 0.7)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  glassLight: {
    colors: ['rgba(255, 255, 255, 0.7)', 'rgba(245, 245, 245, 0.7)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // Overlay gradients
  overlayDark: {
    colors: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  overlayLight: {
    colors: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

export type GradientKey = keyof typeof gradients;

/**
 * Get gradient configuration
 */
export const getGradient = (key: GradientKey): GradientConfig => {
  return gradients[key];
};
