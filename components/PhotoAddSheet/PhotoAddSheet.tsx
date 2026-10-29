import React, { useEffect, useState } from 'react';
import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Box,
  Text,
} from '@gluestack-ui/themed';
import { ActivityIndicator, Image, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../hooks';
import type { PendingPhoto } from '../../hooks/useGallery';
import { exifDay } from '../../utils/photos';
import { parseDay, toDay } from '../../utils/milestones';
import { TagPicker } from '../TagPicker';
import { PlacePicker, PlaceRow } from '../PlacePicker';
import type { PlaceInput } from '../../hooks/usePlaces';
import { Place } from '../../types';
import { KeyboardAwareModal } from '../KeyboardAwareModal';

// Opens the system picker (up to 30 photos) and turns each pick into a
// pending upload dated from its EXIF data. Cancel gives []. Throws on
// picker errors so the caller can tell the user.
export const pickPhotosForGallery = async (): Promise<PendingPhoto[]> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 30,
    exif: true,
    quality: 1,
  });
  if (result.canceled) return [];

  const today = new Date();
  return result.assets.map((asset) => ({
    key: asset.uri,
    picked: { uri: asset.uri, width: asset.width, height: asset.height },
    day: exifDay(asset.exif as Record<string, unknown> | null | undefined, today),
  }));
};

interface PhotoAddSheetProps {
  isOpen: boolean;
  items: PendingPhoto[];
  suggestions: string[];
  onClose: () => void;
  onUpload: (
    items: PendingPhoto[],
    shared: { tags: string[]; label?: string; placeId?: string },
    onProgress: (done: number, total: number) => void,
  ) => Promise<PendingPhoto[]>;
  places: Place[];
  savePlace: (input: PlaceInput) => Promise<Place | null>;
}

export const PhotoAddSheet: React.FC<PhotoAddSheetProps> = ({
  isOpen,
  items: initialItems,
  suggestions,
  onClose,
  onUpload,
  places,
  savePlace,
}) => {
  const { theme } = useAppTheme();
  const [items, setItems] = useState<PendingPhoto[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [sharedLabel, setSharedLabel] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [sharedPlaceId, setSharedPlaceId] = useState<string | null>(null);
  // Which place field the picker is filling: the batch's, or one photo's
  const [pickingPlace, setPickingPlace] = useState<'shared' | 'item' | null>(null);

  // Fresh form each time it opens
  useEffect(() => {
    if (!isOpen) return;
    setItems(initialItems);
    setSelectedKey(initialItems.length === 1 ? initialItems[0].key : null);
    setTags([]);
    setSharedLabel('');
    setSharedPlaceId(null);
    setProgress(null);
    setRetrying(false);
  }, [isOpen, initialItems]);

  const single = items.length === 1;
  const uploading = progress !== null;
  const selected = items.find((i) => i.key === selectedKey) ?? null;

  const updateSelected = (changes: Partial<PendingPhoto>) =>
    setItems((list) => list.map((i) => (i.key === selectedKey ? { ...i, ...changes } : i)));

  const handleUpload = async () => {
    if (uploading || items.length === 0) return;
    setProgress({ done: 0, total: items.length });
    const failed = await onUpload(
      items,
      { tags, label: sharedLabel.trim() || undefined, placeId: sharedPlaceId || undefined },
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);

    if (failed.length === 0) {
      onClose();
      return;
    }
    // Keep only what failed, ready to retry
    setItems(failed);
    setSelectedKey(failed.length === 1 ? failed[0].key : null);
    setRetrying(true);
  };

  const label = (text: string) => (
    <Text
      style={{
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
        marginBottom: 8,
      }}>
      {text}
    </Text>
  );

  const input = (value: string, onChange: (text: string) => void, placeholder: string, multiline = false) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textTertiary}
      multiline={multiline}
      style={{
        color: theme.colors.text,
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: multiline ? 72 : undefined,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );

  // Label, date and description of one photo
  const itemFields = (item: PendingPhoto) => (
    <Box style={{ gap: 14 }}>
      <Box>
        {label(single ? 'Label' : 'Label for this photo')}
        {input(item.label ?? '', (text) => updateSelected({ label: text }), 'Beach day, First apartment…')}
      </Box>
      <Box>
        {label('Date')}
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={{ backgroundColor: theme.colors.surfaceElevated, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: theme.colors.text }}>
            {parseDay(item.day).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={parseDay(item.day)}
            mode="date"
            display="default"
            onChange={(_event, date) => {
              setShowDatePicker(false);
              if (date) updateSelected({ day: toDay(date) });
            }}
          />
        )}
      </Box>
      <Box>
        {label('Description (optional)')}
        {input(item.description ?? '', (text) => updateSelected({ description: text }), 'What happened here?', true)}
      </Box>
      <Box>
        {label(single ? 'Place (optional)' : 'Place for this photo')}
        <PlaceRow
          place={places.find((p) => p.id === item.placeId)}
          onPress={() => setPickingPlace('item')}
        />
      </Box>
    </Box>
  );

  const buttonText = uploading
    ? `Uploading ${progress!.done} of ${progress!.total}…`
    : retrying
      ? `Retry ${items.length}`
      : single
        ? 'Save photo'
        : `Upload ${items.length} photos`;

  return (
    <KeyboardAwareModal isOpen={isOpen}>
      <ModalBackdrop onPress={uploading ? undefined : onClose} />
      <ModalContent style={{ backgroundColor: theme.colors.surface }}>
        {!uploading && <ModalCloseButton onPress={onClose} />}
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {single ? 'Add photo' : `Add ${items.length} photos`}
          </Text>
        </ModalHeader>

        <ModalBody>
          <Box style={{ gap: 18, paddingBottom: 8 }}>
            {single && items[0] ? (
              <>
                <Image
                  source={{ uri: items[0].picked.uri }}
                  style={{ width: '100%', height: 200, borderRadius: theme.radii.md }}
                />
                {itemFields(items[0])}
              </>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Box style={{ flexDirection: 'row', gap: 8 }}>
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setSelectedKey(item.key === selectedKey ? null : item.key)}
                        accessibilityLabel="Edit this photo">
                        <Image
                          source={{ uri: item.picked.uri }}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            borderWidth: 2,
                            borderColor:
                              item.key === selectedKey ? theme.colors.primary : 'transparent',
                          }}
                        />
                        <Text style={{ position: 'absolute', right: 4, bottom: 2, fontSize: 12 }}>
                          ✎
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </Box>
                </ScrollView>
                <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
                  Tap a photo to give it its own label, date or description.
                </Text>
                {selected && itemFields(selected)}
                <Box>
                  {label('Label for all (optional)')}
                  {input(sharedLabel, setSharedLabel, 'Costa Rica 2025')}
                </Box>
                <Box>
                  {label('Place for all (optional)')}
                  <PlaceRow
                    place={places.find((p) => p.id === sharedPlaceId)}
                    onPress={() => setPickingPlace('shared')}
                  />
                </Box>
              </>
            )}

            <PlacePicker
              isOpen={pickingPlace !== null}
              places={places}
              selectedId={pickingPlace === 'shared' ? sharedPlaceId : selected?.placeId}
              savePlace={savePlace}
              onSelect={(id) =>
                pickingPlace === 'shared'
                  ? setSharedPlaceId(id)
                  : updateSelected({ placeId: id ?? undefined })
              }
              onClose={() => setPickingPlace(null)}
            />

            <Box>
              {label(single ? 'Tags' : 'Tags for all')}
              <TagPicker selected={tags} suggestions={suggestions} onChange={setTags} />
            </Box>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={{
                padding: 14,
                borderRadius: theme.radii.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: theme.colors.primary,
              }}>
              {uploading && <ActivityIndicator color={theme.colors.onPrimary} />}
              <Text style={{ color: theme.colors.onPrimary, fontWeight: theme.fontWeight.semibold }}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </Box>
        </ModalBody>
      </ModalContent>
    </KeyboardAwareModal>
  );
};
