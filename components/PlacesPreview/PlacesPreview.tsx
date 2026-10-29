import React from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { MapPin } from 'lucide-react-native';
import { useAppTheme } from '../../hooks';
import { Place } from '../../types';
import { PressableScale } from '../styled/PressableScale';
import { PlaceMap } from '../PlaceMap';

interface PlacesPreviewProps {
  places: Place[];
  onOpen: () => void;
}

// A small, still map of the couple's places on the You Two tab
export const PlacesPreview: React.FC<PlacesPreviewProps> = ({ places, onOpen }) => {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.text }}>
          Places
        </Text>
        <TouchableOpacity onPress={onOpen} accessibilityRole="button">
          <Text style={{ color: theme.colors.primary, fontWeight: theme.fontWeight.semibold }}>
            Open map ›
          </Text>
        </TouchableOpacity>
      </View>

      {places.length === 0 ? (
        <PressableScale
          onPress={onOpen}
          accessibilityRole="button"
          style={{
            height: 70,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
          <MapPin size={18} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary }}>Add your first place</Text>
        </PressableScale>
      ) : (
        // A plain View, not a Touchable: on Android a fading (opacity) wrapper
        // hides the native map inside it. The tap target sits on top instead.
        <View style={{ height: 140, borderRadius: theme.radii.md, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ flex: 1 }}>
            <PlaceMap places={places} interactive={false} />
          </View>
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel="Open the map of our places"
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
    </View>
  );
};
