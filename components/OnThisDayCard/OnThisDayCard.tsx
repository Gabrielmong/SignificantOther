import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks';
import { applyOpacity } from '../../config/theme';
import { Highlight, yearsText } from '../../utils/story';

interface OnThisDayCardProps {
  highlight: Highlight;
  placeName?: string;
  onPress: () => void;
}

// A memory from today's date in an earlier year
export const OnThisDayCard: React.FC<OnThisDayCardProps> = ({ highlight, placeName, onPress }) => {
  const { theme } = useAppTheme();
  const image =
    highlight.milestone?.photo?.thumbUrl ??
    highlight.milestone?.photo?.url ??
    highlight.photos[0]?.thumbUrl ??
    highlight.photos[0]?.url;
  const count = highlight.photos.length + (highlight.milestone?.photo ? 1 : 0);

  const details = [
    placeName ? `📍 ${placeName}` : null,
    count > 0 && highlight.milestone ? `${count} ${count === 1 ? 'photo' : 'photos'}` : null,
    highlight.more > 0 ? `+${highlight.more} more` : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      <LinearGradient
        colors={[applyOpacity(theme.colors.primary, 0.35), applyOpacity(theme.colors.primary700, 0.25)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          borderRadius: theme.radii.lg,
        }}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: theme.colors.surfaceElevated }}
          />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primary,
            }}>
            <Text style={{ fontSize: 30 }}>{highlight.milestone?.emoji ?? '📷'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.primary,
              letterSpacing: 0.5,
            }}>
            ON THIS DAY · {yearsText(highlight.yearsAgo).toUpperCase()}
          </Text>
          <Text
            numberOfLines={2}
            style={{ fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, color: theme.colors.text }}>
            {highlight.title}
          </Text>
          {details.length > 0 && (
            <Text numberOfLines={1} style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
              {details.join(' · ')}
            </Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};
