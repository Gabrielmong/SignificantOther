/**
 * Card Component
 * Basic card component with theme support
 * Used for non-interactive content containers
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  backgroundColor?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding,
  backgroundColor,
  variant = 'default',
  style,
}) => {
  const { theme } = useAppTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...theme.shadows.md,
          backgroundColor: backgroundColor || theme.colors.surfaceElevated,
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: backgroundColor || theme.colors.surface,
        };
      case 'default':
      default:
        return {
          ...theme.shadows.sm,
          backgroundColor: backgroundColor || theme.colors.surface,
        };
    }
  };

  return (
    <View
      style={[
        {
          padding: padding !== undefined ? padding : theme.commonSpacing.cardPadding,
          borderRadius: theme.radii.md,
        },
        getVariantStyles(),
        style,
      ]}>
      {children}
    </View>
  );
};
