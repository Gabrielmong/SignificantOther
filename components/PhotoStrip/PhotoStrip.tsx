import { Text } from '@gluestack-ui/themed';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '../../hooks';
import { Photo } from '../../types';

const SIZE = 70;
const SHOWN = 8;

interface PhotoStripProps {
  photos: Photo[]; // Newest first
  total: number;
  onSeeAll: () => void;
  onPhotoPress: (index: number) => void;
  onAdd: () => void;
}

// The newest photos on the You Two tab, with a way into the full gallery
export const PhotoStrip: React.FC<PhotoStripProps> = ({
  photos,
  total,
  onSeeAll,
  onPhotoPress,
  onAdd,
}) => {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          Photos
        </Text>
        {total > 0 && (
          <TouchableOpacity onPress={onSeeAll} accessibilityRole="button">
            <Text style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
              See all {total} ›
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {total === 0 ? (
        <TouchableOpacity
          onPress={onAdd}
          accessibilityRole="button"
          style={{
            height: SIZE,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
          <Plus size={18} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary }}>Add photos</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {photos.slice(0, SHOWN).map((photo, index) => (
              <TouchableOpacity
                key={photo.id}
                onPress={() => onPhotoPress(index)}
                accessibilityRole="imagebutton"
                accessibilityLabel={photo.label || 'Photo'}>
                <Image
                  source={{ uri: photo.thumbUrl ?? photo.url }}
                  style={{
                    width: SIZE,
                    height: SIZE,
                    borderRadius: 10,
                    backgroundColor: theme.colors.surfaceElevated,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};
