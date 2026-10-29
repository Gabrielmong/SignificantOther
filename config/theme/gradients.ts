/**
 * Gradient Configurations
 * Accent gradients are built from the user's (primary) and partner's
 * (secondary) resolved colors; glass/overlay gradients are fixed.
 */

import type { ColorPair } from './accentThemes';
import { buildScale } from './colorMath';
import type { ColorMode } from './colors';

/**
 * Shapes match expo-linear-gradient's `colors` / `locations` props, which
 * require at least two stops.
 */
export type GradientColors = readonly [string, string, ...string[]];
export type GradientLocations = readonly [number, number, ...number[]];

export interface GradientConfig {
  colors: GradientColors;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: GradientLocations;
}

export type GradientKey =
  | 'primary'
  | 'primarySubtle'
  | 'primaryBold'
  | 'primaryVertical'
  | 'partner'
  | 'ocean'
  | 'secondarySubtle'
  | 'secondaryBold'
  | 'sunset'
  | 'aurora'
  | 'glassDark'
  | 'glassLight'
  | 'overlayDark'
  | 'overlayLight';

const diagonal = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const vertical = { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };

/**
 * Build gradient presets for a mode and resolved accent pairs
 */
export const buildGradients = (
  _mode: ColorMode,
  self: ColorPair,
  partner: ColorPair,
): Record<GradientKey, GradientConfig> => {
  const s = buildScale(self.solid);
  const p = buildScale(partner.solid);

  return {
    // My gradients
    // `primary` is the app's default accent gradient, referenced throughout
    // as `theme.gradients.primary` (header icons, spinners, CTAs).
    primary: { colors: [self.solid, self.deep], ...diagonal },
    primarySubtle: { colors: [s[400], self.solid], ...diagonal },
    primaryBold: { colors: [self.solid, self.deep], ...diagonal },
    primaryVertical: {
      colors: [s[300], self.solid, self.deep],
      ...vertical,
      locations: [0, 0.5, 1],
    },

    // Partner gradients
    // `ocean` and `secondaryBold` alias `partner`.
    partner: { colors: [partner.solid, partner.deep], ...diagonal },
    ocean: { colors: [partner.solid, partner.deep], ...diagonal },
    secondarySubtle: { colors: [p[400], partner.solid], ...diagonal },
    secondaryBold: { colors: [partner.solid, partner.deep], ...diagonal },

    // Combined (me + partner) gradients
    sunset: { colors: [s[400], self.solid, partner.solid], ...diagonal, locations: [0, 0.5, 1] },
    aurora: {
      colors: [s[300], s[400], p[400], partner.solid],
      ...diagonal,
      locations: [0, 0.33, 0.66, 1],
    },

    // Neutral gradients with transparency
    glassDark: { colors: ['rgba(46, 46, 46, 0.7)', 'rgba(26, 26, 26, 0.7)'], ...vertical },
    glassLight: { colors: ['rgba(255, 255, 255, 0.7)', 'rgba(245, 245, 245, 0.7)'], ...vertical },

    // Overlay gradients
    overlayDark: { colors: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)'], ...vertical },
    overlayLight: { colors: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)'], ...vertical },
  };
};
