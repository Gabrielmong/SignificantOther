import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams, Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@gluestack-ui/themed';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useAppTheme, useAppToast, useGallery, usePlaces } from '../../../hooks';
import type { PendingPhoto } from '../../../hooks/useGallery';
import {
  PhotoAddSheet,
  PhotoGrid,
  PhotoViewer,
  Skeleton,
  pickPhotosForGallery,
} from '../../../components';
import { Photo } from '../../../types';
import { photosWithTag } from '../../../utils/photos';
import { fadeEntering } from '../../../utils/motion';

// Matches PhotoGrid's tile spacing, so the placeholders line up with the photos
const GRID_GAP = 2;
const SKELETON_ROWS = 5;

export default function Photos() {
  const { theme, colorMode } = useAppTheme();
  const { photos, tags, loading, columns, setColumns, addPhotos, updateDetails, removePhoto } =
    useGallery();
  const { places, savePlace } = usePlaces();
  const { showToast } = useAppToast();
  const { width } = useWindowDimensions();
  const tile = (width - GRID_GAP * (columns - 1)) / columns;
  // Opened from a tag on the You Two tab: start filtered by it
  const params = useLocalSearchParams<{ tag?: string }>();
  const [activeTag, setActiveTag] = useState<string | null>(
    typeof params.tag === 'string' && params.tag ? params.tag : null,
  );
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  // Index into the filtered list, fixed when the photo is tapped
  const [viewing, setViewing] = useState<number | null>(null);

  // A filter whose last photo was deleted falls back to "All"
  useEffect(() => {
    if (!loading && activeTag && !tags.some((t) => t.tag === activeTag)) setActiveTag(null);
  }, [tags, activeTag, loading]);

  const visible = useMemo(() => photosWithTag(photos, activeTag), [photos, activeTag]);

  const handleAdd = async () => {
    try {
      const picked = await pickPhotosForGallery();
      if (picked.length) setPending(picked);
    } catch (error) {
      console.error('Error picking photos:', error);
      showToast({
        title: "Couldn't open your photos",
        description: 'Please check the app has permission to access photos.',
        status: 'error',
      });
    }
  };
  const handlePhotoPress = (photo: Photo, ordered: Photo[]) =>
    setViewing(Math.max(ordered.findIndex((p) => p.id === photo.id), 0));

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: theme.radii.full,
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
      }}>
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: active ? theme.fontWeight.semibold : theme.fontWeight.normal,
          color: active ? theme.colors.onPrimary : theme.colors.text,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.text,
          }}>
          Photos
        </Text>
        <TouchableOpacity onPress={handleAdd} accessibilityLabel="Add photos">
          <Plus size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tag filter */}
      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
          {chip('All', activeTag === null, () => setActiveTag(null))}
          {tags.map(({ tag }) => chip(tag, activeTag === tag, () => setActiveTag(tag)))}
        </ScrollView>
      )}

      {loading ? (
        // A grid of squares shaped like the gallery while the photos load
        <View accessibilityLabel="Loading photos">
          <Skeleton
            width={90}
            height={theme.fontSize.sm}
            style={{ marginLeft: 12, marginTop: 16, marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
            {Array.from({ length: columns * SKELETON_ROWS }, (_, i) => (
              <Skeleton key={i} width={tile} height={tile} borderRadius={0} />
            ))}
          </View>
        </View>
      ) : photos.length === 0 ? (
        <TouchableOpacity
          onPress={handleAdd}
          style={{
            margin: 16,
            padding: 32,
            alignItems: 'center',
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
          }}>
          <Text style={{ color: theme.colors.textSecondary }}>Add your first photo</Text>
        </TouchableOpacity>
      ) : (
        // Fades the photos in over where the placeholders were
        <Animated.View entering={fadeEntering} style={{ flex: 1 }}>
          <PhotoGrid
            photos={visible}
            columns={columns}
            onColumnsChange={setColumns}
            onPhotoPress={handlePhotoPress}
          />
        </Animated.View>
      )}

      <PhotoAddSheet
        isOpen={pending.length > 0}
        items={pending}
        suggestions={tags.map((t) => t.tag)}
        onClose={() => setPending([])}
        onUpload={addPhotos}
        places={places}
        savePlace={savePlace}
      />

      <PhotoViewer
        isOpen={viewing !== null}
        photos={visible}
        startIndex={viewing ?? 0}
        suggestions={tags.map((t) => t.tag)}
        onClose={() => setViewing(null)}
        onTagPress={(tag) => {
          setViewing(null);
          setActiveTag(tag);
        }}
        onSave={updateDetails}
        onDelete={removePhoto}
        places={places}
        savePlace={savePlace}
        onPlacePress={(placeId) => {
          setViewing(null);
          router.push({ pathname: '/(tabs)/YouTwo/Places', params: { focus: placeId } } as unknown as Href);
        }}
        onMilestonePress={() => {
          setViewing(null);
          router.back();
        }}
      />
    </View>
  );
}
