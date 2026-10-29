/**
 * Gluestack Config
 * Stock @gluestack-ui/config with its primary color tokens replaced by the
 * user's accent, so un-styled Gluestack controls follow the theme.
 */

import { config } from '@gluestack-ui/config';

import { buildScale, mixHex } from './colorMath';
import type { Theme } from './index';

export const createGluestackConfig = (theme: Theme): typeof config => {
  // Light-ordered scale; Gluestack picks steps per color mode itself.
  const s = buildScale(theme.colors.primary);

  // The stock config types each token as its literal hex, hence the cast.
  const colors = {
    ...config.tokens.colors,
    primary0: mixHex(s[50], '#ffffff', 0.5),
    primary50: s[50],
    primary100: s[100],
    primary200: s[200],
    primary300: s[300],
    primary400: s[400],
    primary500: s[500],
    primary600: s[600],
    primary700: s[700],
    primary800: s[800],
    primary900: s[900],
    primary950: mixHex(s[900], '#000000', 0.5),
  } as typeof config.tokens.colors;

  return {
    ...config,
    tokens: {
      ...config.tokens,
      colors,
    },
  };
};
