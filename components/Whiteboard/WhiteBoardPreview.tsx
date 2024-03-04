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
  const { colorMode } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 10,
        backgroundColor: colorMode === 'dark' ? '#000000' : '#F5F5F5',
        borderRadius: 10,
        width: '100%',
        alignItems: 'flex-start',
        gap: 10,
      }}>
      <Box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}>
        <Text>{loading ? 'Loading...' : boardName}</Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
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
          <Spinner />
        ) : (
          <Svg
            height={'100%'}
            width={'100%'}
            style={{ backgroundColor: canvasColor, borderRadius: 10 }}>
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
