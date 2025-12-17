import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks';
import { Box } from '@gluestack-ui/themed';
import { GradientKey } from '../../config/theme';

interface GradientCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  gradientKey?: GradientKey;
  style?: ViewStyle;
  useGradient?: boolean;
  opacity?: number;
}

export const GradientCard: React.FC = ({
  children,
  onPress,
  gradientKey = 'primarySubtle',
  style,
  useGradient = false,
  opacity = 1,
}) => {
  const { theme } = useAppTheme();
  const gradient = theme.gradients[gradientKey];

  const cardStyle: ViewStyle = {
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
    ...style,
  };

  const content = (
    <Box style={{ position: 'relative', width: '100%', height: '100%' }}>
      {useGradient && (
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          locations={gradient.locations}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            opacity,
          }}
        />
      )}
      <Box
        style={{
          backgroundColor: useGradient ? 'transparent' : theme.colors.surface,
          width: '100%',
          height: '100%',
        }}>
        {children}
      </Box>
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cardStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <Box style={cardStyle}>{content}</Box>;
};
