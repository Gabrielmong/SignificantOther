/**
 * PressableCard Component
 * Reusable card component with press animation and theme support
 * Consolidates FeelingPressable and FlowerPressable patterns
 */

import { Box, Text, Image } from '@gluestack-ui/themed';
import React, { useEffect, useRef } from 'react';
import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useAppTheme } from '../../hooks';
import { fadeEntering } from '../../utils/motion';
import { Skeleton } from '../Skeleton';
import { PressableScale } from './PressableScale';

interface PressableCardProps {
  // Content
  label?: string;
  content?: string;
  imageSource?: any;
  imageAlt?: string;
  /**
   * Identifies what the card shows (e.g. the flower or feeling). When it
   * changes, e.g. the partner updates it live, the new content fades in
   * instead of just swapping.
   */
  contentKey?: string;

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

const IMAGE_SIZE = 100;

export const PressableCard: React.FC<PressableCardProps> = ({
  label,
  content,
  imageSource,
  imageAlt = 'image',
  contentKey,
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

  // Only fade on later changes: on first mount the card arrives with its
  // screen, and fading it again on its own would look like a flicker.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const entering = mounted.current ? fadeEntering : undefined;
  // Loading → loaded also counts as a change, so the content fades in
  const fadeKey = loading ? 'loading' : (contentKey ?? content ?? '');

  // Image component (100x100 with loading state)
  const imageComponent = (
    <Box
      style={{
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {loading ? (
        <Skeleton width={IMAGE_SIZE} height={IMAGE_SIZE} borderRadius={theme.radii['2xl']} />
      ) : (
        imageSource && (
          <Animated.View key={fadeKey} entering={entering}>
            <Image
              source={imageSource}
              alt={imageAlt}
              style={{
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                borderRadius: theme.radii['2xl'],
              }}
            />
          </Animated.View>
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

      {loading ? (
        <Skeleton width="80%" height={theme.fontSize.md} style={{ marginTop: theme.spacing[1] }} />
      ) : (
        content && (
          <Animated.View
            key={fadeKey}
            entering={entering}
            style={{ alignSelf: 'stretch', alignItems: contentAlign }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: theme.fontSize.md,
                fontWeight: theme.fontWeight.medium,
              }}>
              {content}
            </Text>
          </Animated.View>
        )
      )}
    </Box>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
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
    </PressableScale>
  );
};
