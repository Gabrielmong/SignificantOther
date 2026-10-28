import React, { useMemo } from 'react';
import {
  Image,
  LayoutAnimation,
  SectionList,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '../../hooks';
import { Photo } from '../../types';
import { Columns, groupPhotos, nextColumns } from '../../utils/photos';

const GAP = 2;

interface PhotoGridProps {
  photos: Photo[]; // Already sorted and filtered
  columns: Columns;
  onColumnsChange: (c: Columns) => void;
  onPhotoPress: (photo: Photo, ordered: Photo[]) => void;
  ListHeaderComponent?: React.ReactElement;
}

// Month (or, at 5 columns, year) sections of square thumbnails. Pinch out
// for bigger tiles, pinch in to fit more per row.
export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  columns,
  onColumnsChange,
  onPhotoPress,
  ListHeaderComponent,
}) => {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const tile = (width - GAP * (columns - 1)) / columns;

  // Each section's photos chunked into rows of `columns`
  const sections = useMemo(
    () =>
      groupPhotos(photos, columns === 5 ? 'year' : 'month').map((section) => {
        const rows: Photo[][] = [];
        for (let i = 0; i < section.photos.length; i += columns) {
          rows.push(section.photos.slice(i, i + columns));
        }
        return { key: section.key, title: section.title, data: rows };
      }),
    [photos, columns],
  );

  // Pinch runs alongside the list's own scrolling, so Android's scroll
  // view doesn't swallow it
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onEnd((event) => {
        const next =
          event.scale > 1.15
            ? nextColumns(columns, 'out')
            : event.scale < 0.87
              ? nextColumns(columns, 'in')
              : columns;
        if (next !== columns) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onColumnsChange(next);
        }
      });
    return Gesture.Simultaneous(pinch, Gesture.Native());
  }, [columns, onColumnsChange]);

  return (
    <GestureDetector gesture={gesture}>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row[0].id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              paddingHorizontal: 12,
              paddingTop: 16,
              paddingBottom: 8,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item: row }) => (
          <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
            {row.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.85}
                onPress={() => onPhotoPress(photo, photos)}
                accessibilityRole="imagebutton"
                accessibilityLabel={photo.label || 'Photo'}>
                <Image
                  source={{ uri: photo.thumbUrl ?? photo.url }}
                  style={{ width: tile, height: tile, backgroundColor: theme.colors.surfaceElevated }}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </GestureDetector>
  );
};
