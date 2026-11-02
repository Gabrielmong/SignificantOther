import { Text } from '@gluestack-ui/themed';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '../../hooks';
import { Place } from '../../types';
import { placeSubtitle } from '../../utils/places';

interface PlaceListProps {
  places: Place[];
  open: boolean;
  onToggle: () => void;
  onSelect: (p: Place) => void;
}

// Every place as a list over the bottom of the map: a bar with the count that
// opens into a panel. Reaches places whose pins are crowded together or off
// screen.
export const PlaceList: React.FC<PlaceListProps> = ({ places, open, onToggle, onSelect }) => {
  const { theme } = useAppTheme();
  const Chevron = open ? ChevronDown : ChevronUp;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '55%',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.lg,
      }}>
      <TouchableOpacity
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide places list' : 'Show places list'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: open ? 8 : 24,
        }}>
        <Text
          style={{
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
          }}>
          {places.length === 1 ? '1 place' : `${places.length} places`}
        </Text>
        <Chevron size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const subtitle = placeSubtitle(item);
            return (
              <TouchableOpacity
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}>
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: theme.fontSize.md,
                      fontWeight: theme.fontWeight.semibold,
                      color: theme.colors.text,
                    }}>
                    {item.name}
                  </Text>
                  {!!subtitle && (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};
