import React, { useEffect, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { Search } from 'lucide-react-native';
import { useAppTheme } from '../../hooks';
import { PlaceSuggestion, geocodeUrl, parseGeocode } from '../../utils/places';
import { MAPBOX_ACCESS_TOKEN } from '../../config/mapboxConfig';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

interface PlaceSearchProps {
  proximity: [number, number] | 'ip';
  onPick: (s: PlaceSuggestion) => void;
}

// Finds a place by name with Mapbox, preferring results near `proximity`.
// A failed search only ever shows a message; dropping a pin still works.
export const PlaceSearch: React.FC<PlaceSearchProps> = ({ proximity, onPick }) => {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [failed, setFailed] = useState(false);
  const proximityRef = useRef(proximity);
  proximityRef.current = proximity;

  useEffect(() => {
    const text = query.trim();
    setFailed(false);
    if (text.length < MIN_CHARS) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(geocodeUrl(text, proximityRef.current, MAPBOX_ACCESS_TOKEN), {
          signal: controller.signal,
        });
        const found = parseGeocode(await response.json());
        setResults(found);
        setFailed(found.length === 0);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Error searching places:', error);
        setResults([]);
        setFailed(true);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pick = (s: PlaceSuggestion) => {
    setQuery('');
    setResults([]);
    onPick(s);
  };

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: theme.colors.surfaceElevated,
        }}>
        <Search size={16} color={theme.colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a place to add…"
          placeholderTextColor={theme.colors.textTertiary}
          returnKeyType="search"
          style={{ flex: 1, paddingVertical: 10, color: theme.colors.text }}
        />
      </View>

      {results.length > 0 && (
        <View style={{ borderRadius: 10, backgroundColor: theme.colors.surface, ...theme.shadows.md }}>
          {results.map((s, i) => (
            <TouchableOpacity
              key={`${s.name}-${s.latitude}-${s.longitude}-${i}`}
              onPress={() => pick(s)}
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: theme.fontWeight.semibold }}>
                {s.name}
              </Text>
              {!!s.address && (
                <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.xs }}>
                  {s.address}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {failed && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.xs, paddingHorizontal: 4 }}>
          Couldn't find that. Try dropping a pin instead.
        </Text>
      )}
    </View>
  );
};
