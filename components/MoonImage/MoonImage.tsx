import { Box } from '@gluestack-ui/themed';
import { Image } from 'expo-image';

import { MOON_PHASE_IMAGES } from '../../constants';
import { useAppTheme } from '../../hooks';

export const MoonImage = ({ index, size }: { index: number; size: number }) => {
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
      <Image
        source={MOON_PHASE_IMAGES[index] ?? MOON_PHASE_IMAGES[0]}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    </Box>
  );
};
