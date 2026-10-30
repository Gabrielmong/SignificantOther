import { Box, Text } from '@gluestack-ui/themed';
import { View } from 'react-native';

import { BoardCanvas } from './BoardCanvas';
import { useAppTheme } from '../../hooks';
import { Stroke } from '../../types';
import { Skeleton } from '../Skeleton';
import { PressableScale } from '../styled/PressableScale';

type WhiteBoardPreviewProps = {
  height: number;
  onPress?: () => void;
  strokes: Stroke[];
  canvasColor: string;
  boardName: string;
  loading?: boolean;
};

export const WhiteBoardPreview = ({
  height,
  onPress,
  strokes,
  canvasColor,
  boardName,
  loading,
}: WhiteBoardPreviewProps) => {
  const { theme } = useAppTheme();
  // Without onPress a plain View, so a pressable parent card gets the touch
  // (and its press animation) instead of this preview swallowing it
  const Container = onPress ? PressableScale : View;

  return (
    <Container
      onPress={onPress}
      style={{
        padding: theme.spacing[4],
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.md,
        width: '100%',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        ...theme.shadows.sm,
      }}>
      <Box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          width: '100%',
        }}>
        <Text
          style={{
            color: theme.colors.textTertiary,
            fontSize: theme.fontSize.sm,
          }}>
          Shared board
        </Text>
      </Box>
      <Box
        style={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          height,
        }}>
        {loading ? (
          <Skeleton height="100%" />
        ) : (
          <BoardCanvas
            strokes={strokes}
            canvasColor={canvasColor}
            style={{ width: '100%', height: '100%', borderRadius: theme.radii.md }}
          />
        )}
      </Box>
    </Container>
  );
};
