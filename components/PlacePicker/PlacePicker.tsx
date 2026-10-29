import { Text } from '@gluestack-ui/themed';
import { MapPin, Plus, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '../../hooks';
import type { PlaceInput } from '../../hooks/usePlaces';
import { Place } from '../../types';
import { PlaceEditor } from '../PlaceEditor';

interface PlacePickerProps {
  isOpen: boolean;
  places: Place[];
  selectedId?: string | null;
  savePlace: (input: PlaceInput) => Promise<Place | null>;
  onSelect: (placeId: string | null) => void;
  onClose: () => void;
}

// Choose a saved place, no place, or add a new one right here, without
// leaving the form it was opened from
export const PlacePicker: React.FC<PlacePickerProps> = ({
  isOpen,
  places,
  selectedId,
  savePlace,
  onSelect,
  onClose,
}) => {
  const { theme } = useAppTheme();
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilter('');
      setAdding(false);
    }
  }, [isOpen]);

  const shown = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return places;
    return places.filter(
      (p) => p.name.toLowerCase().includes(text) || p.venue?.toLowerCase().includes(text),
    );
  }, [places, filter]);

  const choose = (id: string | null) => {
    onSelect(id);
    onClose();
  };

  const row = (key: string, content: React.ReactNode, onPress: () => void, active = false) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: theme.radii.md,
        backgroundColor: active ? theme.colors.surfaceElevated : 'transparent',
      }}>
      {content}
    </TouchableOpacity>
  );

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingTop: 40, gap: 8 }}
        keyboardShouldPersistTaps="handled">
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.text,
            }}>
            {adding ? 'New place' : 'Choose a place'}
          </Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={{ padding: 6 }}>
            <X size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {adding ? (
          <PlaceEditor
            initial={{}}
            places={places}
            savePlace={savePlace}
            mapHeight={220}
            onCancel={() => setAdding(false)}
            onSaved={(p) => choose(p.id)}
          />
        ) : (
          <>
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Find one of your places…"
              placeholderTextColor={theme.colors.textTertiary}
              style={{
                color: theme.colors.text,
                backgroundColor: theme.colors.surfaceElevated,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            {row(
              'new',
              <>
                <Plus size={18} color={theme.colors.primary} />
                <Text
                  style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
                  New place
                </Text>
              </>,
              () => setAdding(true),
            )}
            {row(
              'none',
              <>
                <MapPin size={18} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textSecondary }}>No place</Text>
              </>,
              () => choose(null),
              !selectedId,
            )}
            {shown.map((p) =>
              row(
                p.id,
                <>
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.colors.text, fontWeight: theme.fontWeight.semibold }}>
                      {p.name}
                    </Text>
                    {!!p.venue && (
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.xs }}>
                        {p.venue}
                      </Text>
                    )}
                  </View>
                </>,
                () => choose(p.id),
                p.id === selectedId,
              ),
            )}
          </>
        )}
      </ScrollView>
    </Modal>
  );
};

interface PlaceRowProps {
  place?: Place;
  onPress: () => void;
  disabled?: boolean;
}

// The "Place" field shown inside forms
export const PlaceRow: React.FC<PlaceRowProps> = ({ place, onPress, disabled }) => {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.surfaceElevated,
        opacity: disabled ? 0.6 : 1,
      }}>
      {place ? (
        <Text style={{ fontSize: 18 }}>{place.emoji}</Text>
      ) : (
        <MapPin size={18} color={theme.colors.textTertiary} />
      )}
      <Text style={{ color: place ? theme.colors.text : theme.colors.textTertiary, flex: 1 }}>
        {place ? place.name : 'Add a place'}
      </Text>
    </TouchableOpacity>
  );
};
