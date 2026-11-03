import { Image } from 'expo-image';

import { MOON_PHASE_IMAGES } from '../../constants';

export const MoonImage = ({ index, size }: { index: number; size: number }) => (
  <Image
    source={MOON_PHASE_IMAGES[index] ?? MOON_PHASE_IMAGES[0]}
    style={{ width: size, height: size }}
    contentFit="contain"
    transition={150}
    accessibilityIgnoresInvertColors
  />
);
