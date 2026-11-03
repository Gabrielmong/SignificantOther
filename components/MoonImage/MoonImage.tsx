import { Box } from '@gluestack-ui/themed';
import { Image } from 'expo-image';

import { MOON_PHASE_IMAGES } from '../../constants';
import { useAppTheme } from '../../hooks';

/**
 * `scrubbing` keeps every phase loaded and stacked, showing only `index`, so stepping
 * through phases (the favorite slider) swaps instantly instead of fading and loading
 * each photo. Otherwise one image cross-fades when the phase changes.
 */
export const MoonImage = ({
  index,
  size,
  scrubbing = false,
}: {
  index: number;
  size: number;
  scrubbing?: boolean;
}) => {
  const { theme } = useAppTheme();

  return (
    // A faint ring keeps the dark side (and the whole new moon) visible on dark cards
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}>
      {scrubbing ? (
        MOON_PHASE_IMAGES.map((source, i) => (
          <Image
            key={i}
            source={source}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: i === index ? 1 : 0,
            }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        ))
      ) : (
        <Image
          source={MOON_PHASE_IMAGES[index] ?? MOON_PHASE_IMAGES[0]}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      )}
    </Box>
  );
};
