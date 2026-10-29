import { Text } from '@gluestack-ui/themed';
import { router, useLocalSearchParams, Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PlaceCard, PlaceEditor, PlaceMap, PlaceSearch, PhotoViewer } from '../../../components';
import { useAppTheme, useGallery, useMilestones, usePlaces, useShareToChat } from '../../../hooks';
import type { PlaceInput } from '../../../hooks/usePlaces';
import { Milestone, Place } from '../../../types';
import { parseDay } from '../../../utils/milestones';
import { listItemEntering, listItemExiting } from '../../../utils/motion';
import { addDraftAt, linkedTo } from '../../../utils/places';

export default function Places() {
  const { theme, colorMode } = useAppTheme();
  const { places, byId, loading, savePlace, removePlace } = usePlaces();
  const { milestones } = useMilestones();
  const gallery = useGallery();
  const params = useLocalSearchParams<{ focus?: string }>();
  const shareToChat = useShareToChat();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [moved, setMoved] = useState(false);
  const [editing, setEditing] = useState<Partial<PlaceInput> | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // Opened from a "📍 place" link: center on it with its card open. A link to
  // a place that no longer exists just shows the usual view.
  useEffect(() => {
    if (loading || !params.focus) return;
    const target = byId[params.focus];
    if (target) {
      setSelectedId(target.id);
      setFocus([target.longitude, target.latitude]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, params.focus]);

  const selected: Place | undefined = selectedId ? byId[selectedId] : undefined;
  const linked = useMemo(
    () =>
      selected ? linkedTo(selected.id, milestones, gallery.photos) : { milestones: [], photos: [] },
    [selected, milestones, gallery.photos],
  );

  // Prefer search results near what's on screen once there's something real there
  const proximity: [number, number] | 'ip' = center && (moved || places.length > 0) ? center : 'ip';

  const openEditor = (initial: Partial<PlaceInput>) => setEditing(initial);

  const handleDelete = (p: Place) =>
    Alert.alert('Delete place?', "Milestones and photos stay, they just won't have a place.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (await removePlace(p)) setSelectedId(null);
        },
      },
    ]);

  // Same venue · date line the card shows
  const handleShare = (p: Place) => {
    const date = p.day
      ? parseDay(p.day).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;
    shareToChat({
      kind: 'place',
      id: p.id,
      title: p.name,
      subtitle: [p.venue, date].filter(Boolean).join(' · ') || undefined,
      emoji: p.emoji,
    });
  };

  // navigate (not push) returns to the existing You Two screen instead of
  // stacking a second one
  const openMilestone = (m: Milestone) =>
    router.navigate({ pathname: '/(tabs)/YouTwo', params: { milestone: m.id } } as unknown as Href);

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
          Our places
        </Text>
        <TouchableOpacity
          onPress={() => openEditor(addDraftAt(center, moved, places.length) ?? {})}
          accessibilityLabel="Add a place">
          <Plus size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 12, zIndex: 2 }}>
        <PlaceSearch
          proximity={proximity}
          onPick={(s) =>
            openEditor({
              latitude: s.latitude,
              longitude: s.longitude,
              venue: s.name,
              name: s.name,
            })
          }
        />
      </View>

      <View style={{ flex: 1 }}>
        <PlaceMap
          places={places}
          selectedId={selectedId}
          focus={focus}
          onPinPress={(p) => {
            setSelectedId(p.id);
            setFocus([p.longitude, p.latitude]);
          }}
          onLongPress={([lng, lat]) => openEditor({ longitude: lng, latitude: lat })}
          onCenterChange={(c, wasMoved) => {
            setCenter(c);
            if (wasMoved) setMoved(true);
          }}
        />

        {!loading && places.length === 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 32,
              padding: 14,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surface,
              ...theme.shadows.md,
            }}>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Search for a place or long-press the map to drop a pin
            </Text>
          </View>
        )}

        {/* The card pins itself to the bottom, so the wrapper fills the map and
            lets touches through; keyed by place so switching pins fades it anew */}
        {selected && (
          <Animated.View
            key={selected.id}
            pointerEvents="box-none"
            style={StyleSheet.absoluteFill}
            entering={listItemEntering()}
            exiting={listItemExiting}>
            <PlaceCard
              place={selected}
              milestones={linked.milestones}
              photos={linked.photos}
              onEdit={() => openEditor({ ...selected })}
              onDelete={() => handleDelete(selected)}
              onShare={() => handleShare(selected)}
              onMilestonePress={openMilestone}
              onPhotoPress={setViewingIndex}
              onClose={() => setSelectedId(null)}
            />
          </Animated.View>
        )}
      </View>

      {/* Add / edit */}
      <Modal
        visible={editing !== null}
        animationType="slide"
        onRequestClose={() => setEditing(null)}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ padding: 16, paddingTop: 40 }}
          keyboardShouldPersistTaps="handled">
          <Text
            style={{
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: 12,
            }}>
            {editing?.id ? 'Edit place' : 'New place'}
          </Text>
          {editing && (
            <PlaceEditor
              initial={editing}
              places={places}
              savePlace={savePlace}
              mapHeight={220}
              onCancel={() => setEditing(null)}
              onSaved={(p) => {
                setEditing(null);
                setSelectedId(p.id);
                setFocus([p.longitude, p.latitude]);
              }}
            />
          )}
        </ScrollView>
      </Modal>

      <PhotoViewer
        isOpen={viewingIndex !== null}
        photos={linked.photos}
        startIndex={viewingIndex ?? 0}
        suggestions={gallery.tags.map((t) => t.tag)}
        onClose={() => setViewingIndex(null)}
        onTagPress={(tag) => {
          setViewingIndex(null);
          router.push({ pathname: '/(tabs)/YouTwo/Photos', params: { tag } } as unknown as Href);
        }}
        onSave={gallery.updateDetails}
        onDelete={gallery.removePhoto}
        places={places}
        savePlace={savePlace}
        onPlacePress={(placeId) => {
          setViewingIndex(null);
          const target = byId[placeId];
          if (target) {
            setSelectedId(target.id);
            setFocus([target.longitude, target.latitude]);
          }
        }}
      />
    </View>
  );
}
