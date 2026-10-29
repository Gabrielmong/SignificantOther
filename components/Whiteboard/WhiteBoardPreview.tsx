import { Box, Text } from '@gluestack-ui/themed';
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { PathData } from './Whiteboard';
import { useAppTheme, useAuth, useFirebase } from '../../hooks';
import { Skeleton } from '../Skeleton';
import { PressableScale } from '../styled/PressableScale';

type WhiteBoardPreviewProps = {
  height: number;
  onPress?: () => void;
  paths: PathData[];
  canvasColor: string;
  boardName: string;
  loading?: boolean;
};

export const WhiteBoardPreview = ({
  height,
  onPress,
  paths,
  canvasColor,
  boardName,
  loading,
}: WhiteBoardPreviewProps) => {
  const { user } = useAuth();
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
          <Svg
            height="100%"
            width="100%"
            style={{ backgroundColor: canvasColor, borderRadius: theme.radii.md }}>
            {paths?.map((path, index) => (
              <Path
                key={index}
                d={path.path.join(' ')}
                fill="none"
                stroke={path.color}
                strokeWidth={path.width}
              />
            ))}
          </Svg>
        )}
      </Box>
    </Container>
  );
};
