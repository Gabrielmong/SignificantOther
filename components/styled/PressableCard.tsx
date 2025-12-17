/**
 * PressableCard Component
 * Reusable card component with press animation and theme support
 * Consolidates FeelingPressable and FlowerPressable patterns
 */

import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { Box, Text, Image, Spinner } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PressableCardProps {
  // Content
  label?: string;
  content?: string;
  imageSource?: any;
  imageAlt?: string;

  // Layout
  imagePosition?: 'left' | 'right';
  contentAlign?: 'flex-start' | 'flex-end' | 'center';

  // State
  loading?: boolean;
  disabled?: boolean;

  // Interaction
  onPress?: () => void;

  // Styling
  padding?: number;
  height?: number;
  gradient?: boolean;

  // Custom styles
  style?: ViewStyle;
}

export const PressableCard: React.FC<PressableCardProps> = ({
  label,
  content,
  imageSource,
  imageAlt = 'image',
  imagePosition = 'left',
  contentAlign = 'flex-start',
  loading = false,
  disabled = false,
  onPress,
  padding,
  height,
  gradient = false,
  style,
}) => {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  // Animation style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: theme.duration.normal });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: theme.duration.normal });
  };

  // Image component (100x100 with loading state)
  const imageComponent = (
    <Box
      style={{
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {loading ? (
        <Box
          style={{
            backgroundColor: theme.colors.surface,
            width: 100,
            height: 100,
            borderRadius: theme.radii['2xl'],
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Spinner color={theme.colors.primary} />
        </Box>
      ) : (
        imageSource && (
          <Image
            source={imageSource}
            alt={imageAlt}
            style={{
              width: 100,
              height: 100,
              borderRadius: theme.radii['2xl'],
            }}
          />
        )
      )}
    </Box>
  );

  // Text content component
  const textComponent = (
    <Box
      style={{
        alignItems: contentAlign,
        flex: 1,
      }}>
      {label && (
        <Text
          style={{
            color: theme.colors.textTertiary,
            fontSize: theme.fontSize.sm,
            marginBottom: theme.spacing[1],
          }}>
          {label}
        </Text>
      )}

      {content && (
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.medium,
          }}>
          {loading ? 'Loading...' : content}
        </Text>
      )}
    </Box>
  );

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        animatedStyle,
        {
          padding: padding || theme.commonSpacing.cardPaddingCompact,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexDirection: 'row',
          gap: theme.spacing[3],
          minHeight: height,
          opacity: disabled ? 0.5 : 1,
          ...theme.shadows.sm,
        },
        style,
      ]}>
      {/* Render image and text based on imagePosition */}
      {imagePosition === 'left' ? (
        <>
          {imageComponent}
          {textComponent}
        </>
      ) : (
        <>
          {textComponent}
          {imageComponent}
        </>
      )}
    </AnimatedTouchable>
  );
};
