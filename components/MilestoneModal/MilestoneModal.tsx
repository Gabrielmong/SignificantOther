import {
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Box,
  Text,
  Input,
  InputField,
  Textarea,
  TextareaInput,
} from '@gluestack-ui/themed';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, TouchableOpacity } from 'react-native';

import { useAppTheme, useShareToChat } from '../../hooks';
import type { MilestoneInput, PhotoChange } from '../../hooks/useMilestones';
import type { PlaceInput } from '../../hooks/usePlaces';
import { CountdownObject, Milestone, MilestoneKind, Place, SpecialKind } from '../../types';
import {
  ANNIVERSARY_KINDS,
  SPECIAL_DEFAULTS,
  findManualAnniversary,
  parseDay,
  toDay,
} from '../../utils/milestones';
import { KeyboardAwareModal } from '../KeyboardAwareModal';
import { PlacePicker, PlaceRow } from '../PlacePicker';

const EMOJIS = ['👋', '💕', '💍', '💒', '✈️', '🏠', '🎉', '🍽️', '🌅', '🎂', '🐶', '⭐'];

const KIND_LABEL: Record<MilestoneKind, string> = {
  met: 'We met',
  dating: 'Dating',
  engaged: 'Engaged',
  married: 'Married',
  custom: 'Custom',
};

const SPECIAL_ORDER: SpecialKind[] = ['met', 'dating', 'engaged', 'married'];

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone | null; // null when adding
  presetKind?: MilestoneKind;
  usedKinds: SpecialKind[];
  countdowns: CountdownObject;
  onSave: (
    input: MilestoneInput,
    photo: PhotoChange,
    options?: { replaceCountdownId?: string },
  ) => Promise<boolean>;
  onDelete: (m: Milestone) => Promise<boolean>;
  places: Place[];
  savePlace: (input: PlaceInput) => Promise<Place | null>;
}

// Resolves with the chosen button, so the save flow can wait on it
const ask = (title: string, message: string, cancel: string, confirm: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirm, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  milestone,
  presetKind,
  usedKinds,
  countdowns,
  onSave,
  onDelete,
  places,
  savePlace,
}) => {
  const { theme } = useAppTheme();
  const shareToChat = useShareToChat();

  const [kind, setKind] = useState<MilestoneKind>('custom');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [date, setDate] = useState(new Date());
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<PhotoChange>({ type: 'keep' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [pickingPlace, setPickingPlace] = useState(false);

  const applyKind = (next: MilestoneKind, keepTitle: boolean) => {
    setKind(next);
    if (next !== 'custom' && !keepTitle) {
      setTitle(SPECIAL_DEFAULTS[next].title);
      setEmoji(SPECIAL_DEFAULTS[next].emoji);
    }
  };

  // Reset the form each time it opens
  useEffect(() => {
    if (!isOpen) return;

    if (milestone) {
      setKind(milestone.kind);
      setTitle(milestone.title);
      setTitleTouched(true);
      setDate(parseDay(milestone.day));
      setEmoji(milestone.emoji);
      setNote(milestone.note || '');
      setPlaceId(milestone.placeId ?? null);
    } else {
      setTitle('');
      setTitleTouched(false);
      setDate(new Date());
      setEmoji(EMOJIS[0]);
      setNote('');
      setPlaceId(null);
      applyKind(presetKind ?? 'custom', false);
    }
    setPhoto({ type: 'keep' });
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, milestone?.id, presetKind]);

  const kindOptions: MilestoneKind[] = [
    ...SPECIAL_ORDER.filter((k) => k === milestone?.kind || !usedKinds.includes(k)),
    'custom',
  ];

  const photoPreview =
    photo.type === 'new'
      ? photo.photo.uri
      : photo.type === 'keep'
        ? milestone?.photo?.url
        : undefined;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhoto({ type: 'new', photo: { uri: asset.uri, width: asset.width, height: asset.height } });
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    const day = toDay(date);

    // Offer to replace a hand-made countdown on the same date
    let replaceCountdownId: string | undefined;
    const isAnniversary = (ANNIVERSARY_KINDS as readonly MilestoneKind[]).includes(kind);
    // Special kinds are stored at their kind, so their countdown is "ms-{kind}"
    const linkedExists = countdowns[`ms-${kind !== 'custom' ? kind : milestone?.id}`];
    if (isAnniversary && !linkedExists) {
      const manual = findManualAnniversary(countdowns, day);
      if (manual?.id) {
        const replace = await ask(
          'Replace your countdown?',
          `You already have "${manual.title}" on this date. Replace it with the automatic one?`,
          'Keep both',
          'Replace',
        );
        if (replace) replaceCountdownId = manual.id;
      }
    }

    setSaving(true);
    const ok = await onSave(
      { id: milestone?.id, kind, title, day, emoji, note, placeId },
      photo,
      replaceCountdownId ? { replaceCountdownId } : undefined,
    );
    setSaving(false);
    if (ok) onClose();
  };

  // Shares the saved milestone, not unsaved edits in the form
  const handleShare = () => {
    if (!milestone) return;
    shareToChat({
      kind: 'milestone',
      id: milestone.id,
      title: milestone.title,
      subtitle: parseDay(milestone.day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      emoji: milestone.emoji,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!milestone) return;
    const confirmed = await ask(
      'Delete milestone?',
      `"${milestone.title}" and its photo will be removed for both of you.`,
      'Cancel',
      'Delete',
    );
    if (confirmed && (await onDelete(milestone))) onClose();
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

  const chip = (selected: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceElevated,
  });

  return (
    <KeyboardAwareModal isOpen={isOpen}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent style={{ backgroundColor: theme.colors.surface }}>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {milestone ? 'Edit milestone' : 'New milestone'}
          </Text>
        </ModalHeader>

        <ModalBody>
          <Box style={{ gap: 18, paddingBottom: 8 }}>
            {/* Type */}
            <Box>
              {label('Type')}
              <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {kindOptions.map((k) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => applyKind(k, titleTouched)}
                    style={chip(kind === k)}>
                    <Text
                      style={{
                        fontSize: theme.fontSize.sm,
                        fontWeight: theme.fontWeight.semibold,
                        color: kind === k ? theme.colors.onPrimary : theme.colors.text,
                      }}>
                      {KIND_LABEL[k]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Box>
            </Box>

            {/* Title */}
            <Box>
              {label('Title')}
              <Input>
                <InputField
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    setTitleTouched(true);
                  }}
                  placeholder="First trip together, Moved in…"
                  style={{ color: theme.colors.text }}
                />
              </Input>
            </Box>

            {/* Date */}
            <Box>
              {label('Date')}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  padding: 12,
                  borderRadius: 8,
                }}>
                <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text }}>
                  {date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(_event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
            </Box>

            {/* Place */}
            <Box>
              {label('Place (optional)')}
              <PlaceRow
                place={places.find((p) => p.id === placeId)}
                onPress={() => setPickingPlace(true)}
              />
              <PlacePicker
                isOpen={pickingPlace}
                places={places}
                selectedId={placeId}
                savePlace={savePlace}
                onSelect={setPlaceId}
                onClose={() => setPickingPlace(false)}
              />
            </Box>

            {/* Emoji */}
            <Box>
              {label('Emoji')}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Box style={{ flexDirection: 'row', gap: 8 }}>
                  {EMOJIS.map((e) => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setEmoji(e)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor:
                          emoji === e ? theme.colors.primary : theme.colors.surfaceElevated,
                      }}>
                      <Text style={{ fontSize: 24 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </Box>
              </ScrollView>
            </Box>

            {/* Note */}
            <Box>
              {label('Note (optional)')}
              <Textarea>
                <TextareaInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="What do you want to remember?"
                  style={{ color: theme.colors.text }}
                />
              </Textarea>
            </Box>

            {/* Photo */}
            <Box>
              {label('Photo (optional)')}
              {photoPreview ? (
                <Box style={{ gap: 8 }}>
                  <Image
                    source={{ uri: photoPreview }}
                    style={{ width: '100%', height: 160, borderRadius: theme.radii.md }}
                  />
                  <Box style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={pickPhoto} style={chip(false)}>
                      <Text style={{ color: theme.colors.text }}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPhoto({ type: 'remove' })}
                      style={chip(false)}>
                      <Text style={{ color: theme.colors.error }}>Remove</Text>
                    </TouchableOpacity>
                  </Box>
                </Box>
              ) : (
                <TouchableOpacity onPress={pickPhoto} style={chip(false)}>
                  <Text style={{ color: theme.colors.text }}>Add photo</Text>
                </TouchableOpacity>
              )}
            </Box>

            {/* Actions */}
            <Box style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              {milestone && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: theme.radii.md,
                    alignItems: 'center',
                    backgroundColor: theme.colors.surfaceElevated,
                  }}>
                  <Text
                    style={{ color: theme.colors.error, fontWeight: theme.fontWeight.semibold }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!title.trim() || saving}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: theme.radii.md,
                  alignItems: 'center',
                  backgroundColor: theme.colors.primary,
                  opacity: title.trim() ? 1 : 0.5,
                }}>
                {saving ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontWeight: theme.fontWeight.semibold,
                    }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </Box>

            {milestone && (
              <TouchableOpacity
                onPress={handleShare}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Share milestone to chat"
                style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
                  Share to chat
                </Text>
              </TouchableOpacity>
            )}
          </Box>
        </ModalBody>
      </ModalContent>
    </KeyboardAwareModal>
  );
};
