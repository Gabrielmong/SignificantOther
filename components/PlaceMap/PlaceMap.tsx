import { Text } from '@gluestack-ui/themed';
import MapboxGL from '@rnmapbox/maps';
import React, { useMemo, useRef } from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { MAPBOX_ACCESS_TOKEN } from '../../config/mapboxConfig';
import { useAppTheme } from '../../hooks';
import { Place } from '../../types';
import { cameraFor } from '../../utils/places';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const PADDING = 60;
const WORLD = { center: [0, 20] as [number, number], zoom: 1 };
const PIN_HIT_RADIUS = 28; // Screen points, a little past the pin's edge

// Web Mercator position in screen points at this zoom (512-point tiles)
const toScreen = ([lng, lat]: [number, number], zoom: number): [number, number] => {
  const scale = 512 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [
    ((lng + 180) / 360) * scale,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  ];
};

// The pin under a map tap, if any. A backup for the pins' own Pressable, which
// on some Android devices never gets the touch inside a MarkerView.
const pinNear = (places: Place[], tap: [number, number], zoom: number): Place | null => {
  const [tx, ty] = toScreen(tap, zoom);
  let nearest: Place | null = null;
  let best = PIN_HIT_RADIUS;
  for (const p of places) {
    const [px, py] = toScreen([p.longitude, p.latitude], zoom);
    const distance = Math.hypot(px - tx, py - ty);
    if (distance <= best) {
      nearest = p;
      best = distance;
    }
  }
  return nearest;
};

interface PlaceMapProps {
  places: Place[];
  selectedId?: string | null;
  draft?: { latitude: number; longitude: number } | null; // A pin not saved yet
  style?: ViewStyle;
  interactive?: boolean;
  focus?: [number, number] | null; // [lng, lat] to center on, close up
  onPinPress?: (p: Place) => void;
  onLongPress?: (coord: [number, number]) => void;
  onCenterChange?: (center: [number, number], moved: boolean) => void;
}

// The couple's places as emoji pins. Never shows or asks for the device's
// location: there is deliberately no user-location layer here.
export const PlaceMap: React.FC<PlaceMapProps> = ({
  places,
  selectedId,
  draft,
  style,
  interactive = true,
  focus,
  onPinPress,
  onLongPress,
  onCenterChange,
}) => {
  const { theme, colorMode } = useAppTheme();
  const moved = useRef(false);
  const zoom = useRef<number>(WORLD.zoom);

  const camera = useMemo(() => {
    if (focus) return { centerCoordinate: focus, zoomLevel: 15 };
    const view = cameraFor(places);
    if (view.kind === 'world') return { centerCoordinate: WORLD.center, zoomLevel: WORLD.zoom };
    if (view.kind === 'center') return { centerCoordinate: view.center, zoomLevel: view.zoom };
    return {
      bounds: { ne: view.ne, sw: view.sw },
      padding: {
        paddingTop: PADDING,
        paddingBottom: PADDING,
        paddingLeft: PADDING,
        paddingRight: PADDING,
      },
    };
  }, [places, focus]);

  const pin = (emoji: string, size: number, hollow = false) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hollow ? theme.colors.surface : theme.colors.primary,
        borderWidth: 2,
        borderColor: hollow ? theme.colors.primary : '#ffffff',
        borderStyle: hollow ? 'dashed' : 'solid',
      }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );

  return (
    <MapboxGL.MapView
      style={[{ flex: 1 }, style]}
      styleURL={colorMode === 'dark' ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      scaleBarEnabled={false}
      logoEnabled={interactive}
      attributionEnabled={interactive}
      onLongPress={(feature) => {
        const coords = (feature.geometry as GeoJSON.Point | undefined)?.coordinates;
        if (onLongPress && coords) onLongPress([coords[0], coords[1]]);
      }}
      onPress={(feature) => {
        const coords = (feature.geometry as GeoJSON.Point | undefined)?.coordinates;
        if (!onPinPress || !coords) return;
        const p = pinNear(places, [coords[0], coords[1]], zoom.current);
        if (p) onPinPress(p);
      }}
      onCameraChanged={(state) => {
        zoom.current = state.properties.zoom;
        if (state.gestures.isGestureActive) moved.current = true;
      }}
      onMapIdle={(state) => {
        const [lng, lat] = state.properties.center;
        onCenterChange?.([lng, lat], moved.current);
      }}>
      <MapboxGL.Camera {...camera} animationDuration={600} />

      {places.map((p) => (
        <MapboxGL.MarkerView key={p.id} coordinate={[p.longitude, p.latitude]} allowOverlap>
          {/* Pressable cancels when the touch turns into a pan, unlike a raw touch end */}
          <Pressable
            onPress={() => onPinPress?.(p)}
            disabled={!onPinPress}
            accessibilityRole="button"
            accessibilityLabel={p.name}>
            {pin(p.emoji, p.id === selectedId ? 44 : 36)}
          </Pressable>
        </MapboxGL.MarkerView>
      ))}

      {draft && (
        <MapboxGL.MarkerView coordinate={[draft.longitude, draft.latitude]} allowOverlap>
          {pin('📍', 40, true)}
        </MapboxGL.MarkerView>
      )}
    </MapboxGL.MapView>
  );
};
