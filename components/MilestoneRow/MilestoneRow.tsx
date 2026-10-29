import { Text } from '@gluestack-ui/themed';
import React from 'react';
import { Image, View } from 'react-native';

import { useAppTheme } from '../../hooks';
import { Milestone } from '../../types';
import { parseDay } from '../../utils/milestones';
import { PressableScale } from '../styled/PressableScale';

interface MilestoneRowProps {
  milestone: Milestone;
  onPress: () => void;
}

export const MilestoneRow: React.FC<MilestoneRowProps> = ({ milestone, onPress }) => {
  const { theme } = useAppTheme();
  const date = parseDay(milestone.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${milestone.title}, ${date}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        padding: theme.spacing[3],
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
      }}>
      <Text style={{ fontSize: 26 }}>{milestone.emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          {milestone.title}
        </Text>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
          {date}
        </Text>
        {!!milestone.note && (
          <Text
            numberOfLines={1}
            style={{ fontSize: theme.fontSize.sm, color: theme.colors.textTertiary }}>
            {milestone.note}
          </Text>
        )}
      </View>

      {milestone.photo && (
        <Image
          source={{ uri: milestone.photo.url }}
          style={{ width: 44, height: 44, borderRadius: theme.radii.md }}
        />
      )}
    </PressableScale>
  );
};
