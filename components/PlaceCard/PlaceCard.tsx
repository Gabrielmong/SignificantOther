import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { useAppTheme } from '../../hooks';
import { Milestone, Photo, Place } from '../../types';
import { parseDay } from '../../utils/milestones';

interface PlaceCardProps {
  place: Place;
  milestones: Milestone[];
  photos: Photo[];
  onEdit: () => void;
  onDelete: () => void;
  onMilestonePress: (m: Milestone) => void;
  onPhotoPress: (index: number) => void;
  onClose: () => void;
}

// The memory behind a pin: its details and what's linked to it
export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  milestones,
  photos,
  onEdit,
  onDelete,
  onMilestonePress,
  onPhotoPress,
  onClose,
}) => {
  const { theme } = useAppTheme();
  const date = place.day
    ? parseDay(place.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const subtitle = [place.venue, date].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '55%',
        padding: 16,
        paddingBottom: 28,
        gap: 8,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.lg,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 24 }}>{place.emoji}</Text>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          {place.name}
        </Text>
        <TouchableOpacity onPress={onEdit} accessibilityLabel="Edit place" style={{ padding: 6 }}>
          <Pencil size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} accessibilityLabel="Delete place" style={{ padding: 6 }}>
          <Trash2 size={18} color={theme.colors.error} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={{ padding: 6 }}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {!!subtitle && (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.sm }}>{subtitle}</Text>
        )}
        {!!place.note && <Text style={{ color: theme.colors.text }}>{place.note}</Text>}

        {milestones.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {milestones.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => onMilestonePress(m)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: theme.radii.full,
                  backgroundColor: theme.colors.surfaceElevated,
                }}>
                <Text style={{ color: theme.colors.text, fontSize: theme.fontSize.sm }}>
                  {m.emoji} {m.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {photos.map((p, i) => (
                <TouchableOpacity key={p.id} onPress={() => onPhotoPress(i)}>
                  <Image
                    source={{ uri: p.thumbUrl ?? p.url }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      backgroundColor: theme.colors.surfaceElevated,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
};
