import { Text } from '@gluestack-ui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Pencil, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAppTheme, useKeyboardHeight } from '../../hooks';
import type { PhotoDetails } from '../../hooks/useGallery';
import type { PlaceInput } from '../../hooks/usePlaces';
import { Photo, Place } from '../../types';
import { parseDay, toDay } from '../../utils/milestones';
import { followPhoto } from '../../utils/photos';
import { PlacePicker, PlaceRow } from '../PlacePicker';
import { TagPicker } from '../TagPicker';

interface PhotoViewerProps {
  isOpen: boolean;
  photos: Photo[]; // In the order to swipe through
  startIndex: number;
  suggestions: string[];
  onClose: () => void;
  onTagPress: (tag: string) => void;
  onSave: (id: string, details: PhotoDetails) => Promise<boolean>;
  onDelete: (photo: Photo) => Promise<boolean>;
  onMilestonePress?: () => void; // Shown on milestone photos: go to the milestone
  places: Place[];
  savePlace: (input: PlaceInput) => Promise<Place | null>;
  onPlacePress?: (placeId: string) => void; // "📍 place": open it on the map
}

const formatDay = (day: string) =>
  parseDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Full-screen photos you swipe through, with their details, edit and delete
export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  isOpen,
  photos,
  startIndex,
  suggestions,
  onClose,
  onTagPress,
  onSave,
  onDelete,
  onMilestonePress,
  places,
  savePlace,
  onPlacePress,
}) => {
  const [pickingPlace, setPickingPlace] = useState(false);
  const { theme } = useAppTheme();
  // The viewer is its own full-screen window that doesn't resize for the
  // keyboard, so the details panel lifts itself above it while editing
  const keyboardHeight = useKeyboardHeight();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Photo>>(null);
  const [index, setIndex] = useState(startIndex);
  // The photo on screen, so list changes never point the actions elsewhere
  const currentId = useRef<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // id being edited
  const [draft, setDraft] = useState<PhotoDetails>({ day: '', tags: [] });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // startIndex only matters when the viewer opens
  useEffect(() => {
    if (isOpen) {
      setIndex(startIndex);
      currentId.current = photos[startIndex]?.id ?? null;
      setEditing(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // The list can change while open (deletes, partner uploads, re-sorts):
  // stay on the same photo, or the one that took its place
  useEffect(() => {
    if (!isOpen) return;
    const next = followPhoto(photos, currentId.current, index);
    if (next < 0) {
      onClose();
      return;
    }
    currentId.current = photos[next].id;
    if (next !== index) {
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, isOpen]);

  const photo = photos[Math.min(index, photos.length - 1)];
  if (!isOpen || !photo) return null;

  const startEdit = () => {
    setEditing(photo.id);
    setDraft({
      label: photo.label ?? '',
      description: photo.description ?? '',
      day: photo.day,
      tags: Object.keys(photo.tags ?? {}),
      // A milestone photo's place follows the milestone, so it isn't sent
      ...(photo.milestoneId ? {} : { placeId: photo.placeId ?? null }),
    });
  };

  // Saves to the photo the edit started on, even if the list moved since
  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const ok = await onSave(editing, draft);
    setSaving(false);
    if (ok) setEditing(null);
  };

  const handleDelete = () =>
    Alert.alert('Delete photo?', 'It will be removed for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(photo) },
    ]);

  const iconButton = (icon: React.ReactNode, onPress: () => void, label: string) => (
    <TouchableOpacity onPress={onPress} accessibilityLabel={label} style={{ padding: 8 }}>
      {icon}
    </TouchableOpacity>
  );

  const field = (
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
    multiline = false,
  ) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#8a8a8a"
      multiline={multiline}
      style={{
        color: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: multiline ? 64 : undefined,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          keyExtractor={(p) => p.id}
          initialScrollIndex={Math.min(startIndex, photos.length - 1)}
          getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!editing}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(next);
            currentId.current = photos[next]?.id ?? null;
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item.url }} contentFit="contain" style={{ width, height }} />
          )}
        />

        {/* Top bar */}
        <View
          style={{
            position: 'absolute',
            top: 40,
            left: 8,
            right: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          {iconButton(<X size={26} color="#ffffff" />, onClose, 'Close')}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!editing && iconButton(<Pencil size={22} color="#ffffff" />, startEdit, 'Edit')}
            {photo.milestoneId ? (
              <TouchableOpacity
                onPress={onMilestonePress}
                disabled={!onMilestonePress}
                accessibilityRole="link">
                <Text style={{ color: '#d4d4d4', fontSize: theme.fontSize.xs, marginRight: 8 }}>
                  From milestone: {photo.label}
                  {onMilestonePress ? ' ›' : ''}
                </Text>
              </TouchableOpacity>
            ) : (
              !editing && iconButton(<Trash2 size={22} color="#ffffff" />, handleDelete, 'Delete')
            )}
          </View>
        </View>

        {/* Details */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: keyboardHeight,
            // Above the keyboard there's less room; keep clear of the top bar
            maxHeight: keyboardHeight ? height - keyboardHeight - 120 : height * 0.6,
            padding: 16,
            paddingBottom: keyboardHeight ? 16 : 32,
            backgroundColor: 'rgba(0,0,0,0.65)',
          }}>
          {editing ? (
            <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
              {/* A milestone photo's label and date follow the milestone */}
              {!photo.milestoneId &&
                field(draft.label ?? '', (label) => setDraft({ ...draft, label }), 'Label')}
              {!photo.milestoneId && (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: 10,
                  }}>
                  <Text style={{ color: '#ffffff' }}>{formatDay(draft.day)}</Text>
                </TouchableOpacity>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={parseDay(draft.day)}
                  mode="date"
                  display="default"
                  onChange={(_event, date) => {
                    setShowDatePicker(false);
                    if (date) setDraft({ ...draft, day: toDay(date) });
                  }}
                />
              )}
              {field(
                draft.description ?? '',
                (description) => setDraft({ ...draft, description }),
                'Description',
                true,
              )}
              <TagPicker
                selected={draft.tags}
                suggestions={suggestions}
                onChange={(tags) => setDraft({ ...draft, tags })}
              />
              <PlaceRow
                place={places.find(
                  (p) => p.id === (photo.milestoneId ? photo.placeId : draft.placeId),
                )}
                disabled={!!photo.milestoneId}
                onPress={() => setPickingPlace(true)}
              />
              <PlacePicker
                isOpen={pickingPlace}
                places={places}
                selectedId={draft.placeId}
                savePlace={savePlace}
                onSelect={(placeId) => setDraft({ ...draft, placeId })}
                onClose={() => setPickingPlace(false)}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setEditing(null)}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  }}>
                  <Text style={{ color: '#ffffff' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: theme.colors.primary,
                  }}>
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    {saving ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ gap: 6 }}>
              {!!photo.label && (
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.bold,
                  }}>
                  {photo.label}
                </Text>
              )}
              <Text style={{ color: '#d4d4d4', fontSize: theme.fontSize.sm }}>
                {formatDay(photo.day)}
              </Text>
              {(() => {
                const place = photo.placeId
                  ? places.find((p) => p.id === photo.placeId)
                  : undefined;
                return place ? (
                  <TouchableOpacity
                    onPress={() => onPlacePress?.(place.id)}
                    disabled={!onPlacePress}
                    accessibilityRole="link">
                    <Text style={{ color: '#ffffff', fontSize: theme.fontSize.sm }}>
                      📍 {place.name}
                    </Text>
                  </TouchableOpacity>
                ) : null;
              })()}
              {!!photo.description && (
                <Text style={{ color: '#ffffff', fontSize: theme.fontSize.md }}>
                  {photo.description}
                </Text>
              )}
              {!!photo.tags && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {Object.keys(photo.tags).map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => onTagPress(tag)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: theme.radii.full,
                        backgroundColor: 'rgba(255,255,255,0.18)',
                      }}>
                      <Text style={{ color: '#ffffff', fontSize: theme.fontSize.xs }}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
