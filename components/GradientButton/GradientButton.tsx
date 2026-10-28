/**
 * GradientButton Component
 * A reusable button with gradient background and icon
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';

type GradientKey = 'primary' | 'aurora' | 'sunset' | 'ocean';

interface GradientButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  gradientKey?: GradientKey;
  count?: number;
  countLabel?: string;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  icon,
  onPress,
  gradientKey = 'primary',
  count,
  countLabel = 'items',
}) => {
  const { theme } = useAppTheme();

  const gradient = theme.gradients[gradientKey];
  const onColor = gradientKey === 'ocean' ? theme.colors.onPartner : theme.colors.onPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: theme?.radii?.lg || 12,
        overflow: 'hidden',
        ...theme?.shadows?.sm,
      }}
      activeOpacity={0.8}>
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        locations={gradient.locations}
        style={{
          flex: 1,
          padding: theme?.spacing?.[4] || 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme?.spacing?.[2] || 8,
        }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Text
          style={{
            fontSize: theme?.fontSize?.md || 16,
            fontWeight: theme?.fontWeight?.semibold || '600',
            color: onColor,
          }}>
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <Text
            style={{
              fontSize: theme?.fontSize?.xs || 12,
              color: onColor,
              opacity: 0.9,
            }}>
            {count} {countLabel}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};
