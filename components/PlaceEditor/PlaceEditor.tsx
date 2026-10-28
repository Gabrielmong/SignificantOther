import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';
import type { PlaceInput } from '../../hooks/usePlaces';
import { Place } from '../../types';
import { PlaceMap } from '../PlaceMap';
import { PlaceSearch } from '../PlaceSearch';
import { PlaceForm } from '../PlaceForm';

interface PlaceEditorProps {
  initial: Partial<PlaceInput>;
  places: Place[];
  savePlace: (input: PlaceInput) => Promise<Place | null>;
  onSaved: (p: Place) => void;
  onCancel: () => void;
  mapHeight: number;
}

// Search, a small map (long-press moves the pin) and the place form, used
// by the full map and by the place picker inside other forms
export const PlaceEditor: React.FC<PlaceEditorProps> = ({
  initial,
  places,
  savePlace,
  onSaved,
  onCancel,
  mapHeight,
}) => {
  const { theme } = useAppTheme();
  const [value, setValue] = useState<PlaceInput>({
    name: '',
    emoji: '📍',
    latitude: NaN,
    longitude: NaN,
    ...initial,
  });
  const [focus, setFocus] = useState<[number, number] | null>(
    Number.isFinite(initial.longitude) && Number.isFinite(initial.latitude)
      ? [initial.longitude!, initial.latitude!]
      : null,
  );
  const [proximity, setProximity] = useState<[number, number] | 'ip'>('ip');
  const [saving, setSaving] = useState(false);

  const hasPin = Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const canSave = value.name.trim().length > 0 && hasPin && !saving;
  const otherPlaces = places.filter((p) => p.id !== value.id);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const saved = await savePlace(value);
    setSaving(false);
    if (saved) onSaved(saved);
  };

  return (
    <View style={{ gap: 12 }}>
      <PlaceSearch
        proximity={proximity}
        onPick={(s) => {
          setValue((v) => ({
            ...v,
            latitude: s.latitude,
            longitude: s.longitude,
            venue: s.name,
            name: v.name.trim() ? v.name : s.name,
          }));
          setFocus([s.longitude, s.latitude]);
        }}
      />

      <View style={{ height: mapHeight, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <PlaceMap
          places={otherPlaces}
          draft={hasPin ? { latitude: value.latitude, longitude: value.longitude } : null}
          focus={focus}
          onLongPress={([lng, lat]) => setValue((v) => ({ ...v, latitude: lat, longitude: lng }))}
          onCenterChange={(center, moved) => {
            // Prefer results near what's on screen once there's something real there
            if (moved || otherPlaces.length > 0 || hasPin) setProximity(center);
          }}
        />
      </View>
      <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.textTertiary }}>
        {hasPin ? 'Long-press the map to move the pin.' : 'Search above, or long-press the map to drop a pin.'}
      </Text>

      <PlaceForm value={value} onChange={setValue} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: theme.radii.md,
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceElevated,
          }}>
          <Text style={{ color: theme.colors.text }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: theme.radii.md,
            alignItems: 'center',
            backgroundColor: theme.colors.primary,
            opacity: canSave ? 1 : 0.5,
          }}>
          {saving ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={{ color: theme.colors.onPrimary, fontWeight: theme.fontWeight.semibold }}>
              Save place
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
