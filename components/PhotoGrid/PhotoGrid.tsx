import { Text } from '@gluestack-ui/themed';
import { Image } from 'expo-image';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { SectionList, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '../../hooks';
import { Photo } from '../../types';
import { selectionFeedback } from '../../utils/haptics';
import { Columns, groupPhotos, nextColumns } from '../../utils/photos';

const GAP = 2;
// How far the pinch must go to change the column count
const ZOOM_OUT_AT = 1.15;
const ZOOM_IN_AT = 0.87;
// Past the last zoom step the grid only gives a little, like a rubber band
const LIMIT_STRETCH = 0.05;
const SPRING = { damping: 20, stiffness: 220, mass: 0.6 };

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

  // The grid scales live with the fingers. On release it either springs back,
  // or swaps to the new column count starting at the size the fingers left the
  // tiles at, then springs to rest, so the change reads as one continuous zoom.
  const scale = useSharedValue(1);
  const pendingScale = useRef<number | null>(null);

  const commitColumns = useCallback(
    (next: Columns, releasedAt: number) => {
      // Tiles are columns/next times bigger in the new layout
      pendingScale.current = (releasedAt * next) / columns;
      // A tick per zoom level, like stepping a dial
      selectionFeedback();
      onColumnsChange(next);
    },
    [columns, onColumnsChange],
  );

  // Before the new layout paints, show it at the old visual size, then settle
  useLayoutEffect(() => {
    if (pendingScale.current === null) return;
    scale.value = withSequence(
      withTiming(pendingScale.current, { duration: 0 }),
      withSpring(1, SPRING),
    );
    pendingScale.current = null;
  }, [columns, scale]);

  // The list's own scrolling, as a gesture the pinch can run alongside. It must
  // wrap the SectionList directly (it attaches to the nearest native view);
  // attached to a wrapper view instead, the list stops scrolling.
  const listScroll = useMemo(() => Gesture.Native(), []);

  const pinch = useMemo(() => {
    const zoomOutTo = nextColumns(columns, 'out');
    const zoomInTo = nextColumns(columns, 'in');
    const maxScale = zoomOutTo === columns ? 1 + LIMIT_STRETCH : Infinity;
    const minScale = zoomInTo === columns ? 1 - LIMIT_STRETCH : 0;

    return Gesture.Pinch()
      .simultaneousWithExternalGesture(listScroll)
      .onUpdate((event) => {
        scale.value = Math.min(Math.max(event.scale, minScale), maxScale);
      })
      .onEnd((event) => {
        const next =
          event.scale > ZOOM_OUT_AT ? zoomOutTo : event.scale < ZOOM_IN_AT ? zoomInTo : columns;
        if (next !== columns) {
          runOnJS(commitColumns)(next, scale.value);
        } else {
          scale.value = withSpring(1, SPRING);
        }
      });
  }, [columns, commitColumns, scale, listScroll]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    // Anchored top-left like Google Photos, so tiles never drift off the left edge
    transformOrigin: 'top left',
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={pinch}>
      {/* Clips the scaled grid so it never draws over the screen header */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={animatedStyle}>
          <GestureDetector gesture={listScroll}>
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
                        style={{
                          width: tile,
                          height: tile,
                          backgroundColor: theme.colors.surfaceElevated,
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </GestureDetector>
        </Animated.View>
      </View>
    </GestureDetector>
  );
};
