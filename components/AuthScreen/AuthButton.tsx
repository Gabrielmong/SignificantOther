import { Text } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator } from 'react-native';

import { useAppTheme } from '../../hooks';
import { PressableScale } from '../styled/PressableScale';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// The auth pages' main call to action, in the app's primary gradient
export const AuthButton: React.FC<AuthButtonProps> = ({ title, onPress, loading, disabled }) => {
  const { theme } = useAppTheme();
  const gradient = theme.gradients.primary;
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={{
        borderRadius: theme.radii.lg,
        overflow: 'hidden',
        opacity: isDisabled ? 0.7 : 1,
        ...theme.shadows.sm,
      }}>
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[2],
        }}>
        <Text
          style={{
            color: theme.colors.onPrimary,
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.semibold,
          }}>
          {title}
        </Text>

        {loading && <ActivityIndicator size="small" color={theme.colors.onPrimary} />}
      </LinearGradient>
    </PressableScale>
  );
};
