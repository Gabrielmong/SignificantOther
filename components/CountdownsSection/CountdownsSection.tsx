import { Box, Text } from '@gluestack-ui/themed';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { useAppTheme } from '../../hooks';
import { Countdown, CountdownObject } from '../../types';
import { CountdownCard } from '../CountdownCard';

interface CountdownsSectionProps {
  countdowns: CountdownObject;
  onAddCountdown: () => void;
  onEditCountdown: (countdown: Countdown) => void;
  onViewAll: () => void;
}

export const CountdownsSection: React.FC<CountdownsSectionProps> = ({
  countdowns,
  onAddCountdown,
  onEditCountdown,
  onViewAll,
}) => {
  const { theme } = useAppTheme();

  return (
    <Box style={{ width: '100%', gap: theme?.spacing?.[3] || 12 }}>
      {/* Section Header with Add Button */}
      <Box
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <Text
          style={{
            fontSize: theme?.fontSize?.lg || 18,
            fontWeight: theme?.fontWeight?.bold || '700',
            color: theme?.colors?.text || '#000000',
          }}>
          Countdowns
        </Text>
        <TouchableOpacity
          onPress={onAddCountdown}
          style={{
            backgroundColor: theme.colors.primary,
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Plus size={20} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </Box>

      {/* Countdown Cards - Show only next 2 nearest countdowns */}
      {Object.keys(countdowns).length > 0 ? (
        <>
          {Object.values(countdowns)
            .sort((a, b) => a.date - b.date)
            .slice(0, 2)
            .map((countdown) => (
              <CountdownCard
                key={countdown.id}
                countdown={countdown}
                onPress={() => onEditCountdown(countdown)}
              />
            ))}

          {/* View All Button */}
          {Object.keys(countdowns).length > 2 && (
            <TouchableOpacity
              onPress={onViewAll}
              style={{
                backgroundColor: theme?.colors?.surface || '#FFFFFF',
                borderRadius: theme?.radii?.lg || 12,
                padding: theme?.spacing?.[4] || 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.primary,
              }}>
              <Text
                style={{
                  fontSize: theme?.fontSize?.md || 16,
                  color: theme.colors.primary,
                  fontWeight: theme?.fontWeight?.semibold || '600',
                }}>
                View All ({Object.keys(countdowns).length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <TouchableOpacity
          onPress={onAddCountdown}
          style={{
            backgroundColor: theme?.colors?.surface || '#FFFFFF',
            borderRadius: theme?.radii?.lg || 12,
            padding: theme?.spacing?.[6] || 24,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme?.colors?.border || '#E5E7EB',
            borderStyle: 'dashed',
          }}>
          <Plus
            size={32}
            color={theme?.colors?.textSecondary || '#6B7280'}
            style={{ marginBottom: 8 }}
          />
          <Text
            style={{
              fontSize: theme?.fontSize?.md || 16,
              color: theme?.colors?.textSecondary || '#6B7280',
            }}>
            Add your first countdown
          </Text>
        </TouchableOpacity>
      )}
    </Box>
  );
};
