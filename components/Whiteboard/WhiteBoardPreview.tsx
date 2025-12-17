import { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useAppTheme, useAuth, useFirebase } from '../../hooks';
import { PathData } from './Whiteboard';
import { Path, Svg } from 'react-native-svg';
import { Box, Spinner, Text } from '@gluestack-ui/themed';

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

  return (
    <TouchableOpacity
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
          height: height,
        }}>
        {loading ? (
          <Spinner color={theme.colors.primary} />
        ) : (
          <Svg
            height={'100%'}
            width={'100%'}
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
    </TouchableOpacity>
  );
};
