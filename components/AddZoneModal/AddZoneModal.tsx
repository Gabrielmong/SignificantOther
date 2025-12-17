import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  Box,
  Text,
  Button,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useAppTheme, useLocation, useAuth, useFirebase } from '../../hooks';
import { ZoneType } from '../../types';
import { MAPBOX_ACCESS_TOKEN } from '../../config';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zone: {
    name: string;
    type: ZoneType;
    latitude: number;
    longitude: number;
    radius: number;
    icon: string;
  }) => void;
  onDelete?: () => void;
  initialData?: {
    name: string;
    type: ZoneType;
    latitude: number;
    longitude: number;
    radius: number;
    icon: string;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

const ZONE_TYPES: { value: ZoneType; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '📍' },
];

const RADIUS_OPTIONS = [50, 100, 200, 500]; // in meters

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AddZoneModal: React.FC<AddZoneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  currentLocation,
}) => {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { updateLocation } = useFirebase();
  const { getCurrentLocation } = useLocation();

  const [name, setName] = useState('');
  const [type, setType] = useState<ZoneType>('home');
  const [radius, setRadius] = useState(100);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const locationUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const [zoomLevel, setZoomLevel] = useState(15);

  // Sync form state with initialData when modal opens or data changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      // Editing existing zone - load its data
      setName(initialData.name);
      setType(initialData.type);
      setRadius(initialData.radius);
      setSelectedLocation({
        latitude: initialData.latitude,
        longitude: initialData.longitude,
      });
    } else {
      // Creating new zone - reset form
      setName('');
      setType('home');
      setRadius(100);
      setSelectedLocation(null);
    }
  }, [isOpen, initialData]);

  // Sync current location when it becomes available
  useEffect(() => {
    if (currentLocation) {
      setUserLocation(currentLocation);
    }
  }, [currentLocation]);

  // Set camera position when modal opens or selected location changes
  useEffect(() => {
    if (!isOpen) return;

    // Delay camera setup to ensure map is mounted and state is updated
    setTimeout(() => {
      const initialCenter = selectedLocation
        ? [selectedLocation.longitude, selectedLocation.latitude]
        : userLocation
          ? [userLocation.longitude, userLocation.latitude]
          : [-122.4324, 37.78825];

      cameraRef.current?.setCamera({
        centerCoordinate: initialCenter as [number, number],
        zoomLevel: 15,
        animationDuration: 300,
      });
    }, 200);
  }, [isOpen, selectedLocation, userLocation]);

  // Update location in real-time while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const updateUserLocation = async () => {
      try {
        const location = await getCurrentLocation(true);
        if (location && user.roomId && user.uid) {
          setUserLocation(location);
          // Upload location update to Firebase
          await updateLocation(user.roomId, user.uid, location);

          // If no location is selected yet, use current location
          if (!selectedLocation && !initialData) {
            setSelectedLocation(location);
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    // Get location immediately
    updateUserLocation();

    // Then update every 5 seconds while modal is open
    locationUpdateInterval.current = setInterval(updateUserLocation, 5000);

    return () => {
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [isOpen, user.roomId, user.uid, selectedLocation, initialData]);

  const handleMapPress = (event: any) => {
    const { geometry } = event;
    if (geometry && geometry.coordinates) {
      const [longitude, latitude] = geometry.coordinates;
      setSelectedLocation({ latitude, longitude });
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (!selectedLocation) {
      // Show error - need to select location
      return;
    }

    const selectedIcon = ZONE_TYPES.find((t) => t.value === type)?.icon || '📍';

    onSave({
      name: name.trim(),
      type,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      radius,
      icon: selectedIcon,
    });

    // Close modal - form will be reset via useEffect when it opens again
    onClose();
  };

  const handleCancel = () => {
    // Just close the modal - the form will be reset via useEffect when it opens again
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setSelectedLocation(userLocation);
      // Animate camera to current location
      cameraRef.current?.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: zoomLevel,
        animationDuration: 1000,
      });
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 1, 20); // Max zoom is 20
    setZoomLevel(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 1, 1); // Min zoom is 1
    setZoomLevel(newZoom);
    cameraRef.current?.setCamera({
      zoomLevel: newZoom,
      animationDuration: 300,
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen}>
      <ModalBackdrop onPress={handleCancel} />
      <ModalContent
        style={{
          maxHeight: '90%',
          width: SCREEN_WIDTH * 0.95,
          height: '90%',
        }}>
        <ModalCloseButton onPress={handleCancel} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme?.fontSize?.lg || 18,
              fontWeight: theme?.fontWeight?.bold || '700',
              color: theme?.colors?.text || '#000000',
            }}>
            {initialData ? 'Edit Zone' : 'New Zone'}
          </Text>
        </ModalHeader>

        {/* Fixed Map View - Not Scrollable */}
        <Box style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text
            style={{
              fontSize: theme?.fontSize?.sm || 14,
              fontWeight: theme?.fontWeight?.semibold || '600',
              color: theme?.colors?.text || '#000000',
              marginBottom: 8,
            }}>
            Location
          </Text>
          <View style={styles.mapContainer}>
                <MapboxGL.MapView
                  style={styles.map}
                  onPress={handleMapPress}
                  styleURL={
                    theme?.colorMode === 'dark' ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street
                  }>
                  <MapboxGL.Camera
                    ref={cameraRef}
                    defaultSettings={{
                      zoomLevel: 15,
                      centerCoordinate: selectedLocation
                        ? [selectedLocation.longitude, selectedLocation.latitude]
                        : userLocation
                          ? [userLocation.longitude, userLocation.latitude]
                          : [-122.4324, 37.78825],
                    }}
                    animationMode="flyTo"
                  />

                  {/* User's current location */}
                  {userLocation && (
                    <MapboxGL.PointAnnotation
                      id="user-location"
                      coordinate={[userLocation.longitude, userLocation.latitude]}>
                      <View style={styles.userMarker}>
                        <View style={styles.userMarkerInner} />
                      </View>
                    </MapboxGL.PointAnnotation>
                  )}

                  {/* Selected zone location */}
                  {selectedLocation && (
                    <>
                      {/* Zone radius circle */}
                      <MapboxGL.ShapeSource
                        id="zone-circle"
                        shape={{
                          type: 'Feature',
                          geometry: {
                            type: 'Point',
                            coordinates: [selectedLocation.longitude, selectedLocation.latitude],
                          },
                          properties: {},
                        }}>
                        <MapboxGL.CircleLayer
                          id="zone-circle-layer"
                          style={{
                            circleRadius: [
                              'interpolate',
                              ['exponential', 2],
                              ['zoom'],
                              0,
                              0,
                              20,
                              [
                                '*',
                                radius,
                                [
                                  '/',
                                  1,
                                  ['cos', ['*', selectedLocation.latitude, ['/', Math.PI, 180]]],
                                ],
                              ],
                            ],
                            circleColor: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
                            circleOpacity: 0.2,
                            circleStrokeColor: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
                            circleStrokeWidth: 2,
                          }}
                        />
                      </MapboxGL.ShapeSource>

                      {/* Zone center marker */}
                      <MapboxGL.PointAnnotation
                        id="zone-location"
                        coordinate={[selectedLocation.longitude, selectedLocation.latitude]}>
                        <View style={styles.zoneMarker}>
                          <Text style={styles.zoneMarkerText}>
                            {ZONE_TYPES.find((t) => t.value === type)?.icon || '📍'}
                          </Text>
                        </View>
                      </MapboxGL.PointAnnotation>
                    </>
                  )}
                </MapboxGL.MapView>

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    onPress={handleZoomIn}
                    style={[
                      styles.zoomButton,
                      {
                        backgroundColor: theme?.colors?.surface || '#FFFFFF',
                        ...theme?.shadows?.md,
                        marginBottom: 8,
                      },
                    ]}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleZoomOut}
                    style={[
                      styles.zoomButton,
                      {
                        backgroundColor: theme?.colors?.surface || '#FFFFFF',
                        ...theme?.shadows?.md,
                      },
                    ]}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>−</Text>
                  </TouchableOpacity>
                </View>

                {/* Use Current Location Button */}
                {userLocation && (
                  <TouchableOpacity
                    onPress={handleUseCurrentLocation}
                    style={[
                      styles.locationButton,
                      {
                        backgroundColor: theme?.colors?.surface || '#FFFFFF',
                        ...theme?.shadows?.md,
                      },
                    ]}>
                    <Text style={{ fontSize: 20 }}>📍</Text>
                  </TouchableOpacity>
                )}
          </View>
          <Text
            style={{
              fontSize: theme?.fontSize?.xs || 12,
              color: theme?.colors?.textSecondary || '#6B7280',
              marginTop: 8,
            }}>
            Tap on the map to select zone location
          </Text>
        </Box>

        {/* Scrollable Form Fields */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled">
            <Box style={{ padding: 20, gap: 20 }}>
            {/* Zone Type Selection */}
            <Box>
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm || 14,
                  fontWeight: theme?.fontWeight?.semibold || '600',
                  color: theme?.colors?.text || '#000000',
                  marginBottom: 8,
                }}>
                Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Box style={{ flexDirection: 'row', gap: 8 }}>
                  {ZONE_TYPES.map((zoneType) => (
                    <TouchableOpacity
                      key={zoneType.value}
                      onPress={() => {
                        setType(zoneType.value);
                        if (zoneType.value !== 'custom' && !initialData) {
                          setName(zoneType.label);
                        }
                      }}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor:
                            type === zoneType.value
                              ? theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'
                              : theme?.colors?.surface || '#F3F4F6',
                        },
                      ]}>
                      <Text style={styles.iconText}>{zoneType.icon}</Text>
                      <Text
                        style={{
                          color:
                            type === zoneType.value ? '#FFFFFF' : theme?.colors?.text || '#000000',
                          fontSize: theme?.fontSize?.sm || 14,
                          fontWeight: theme?.fontWeight?.semibold || '600',
                        }}>
                        {zoneType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Box>
              </ScrollView>
            </Box>

            {/* Name Input */}
            <Box>
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm || 14,
                  fontWeight: theme?.fontWeight?.semibold || '600',
                  color: theme?.colors?.text || '#000000',
                  marginBottom: 8,
                }}>
                Name
              </Text>
              <Input>
                <InputField
                  value={name}
                  onChangeText={setName}
                  placeholder={type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'My Place'}
                />
              </Input>
            </Box>

            {/* Radius Selection */}
            <Box>
              <Text
                style={{
                  fontSize: theme?.fontSize?.sm || 14,
                  fontWeight: theme?.fontWeight?.semibold || '600',
                  color: theme?.colors?.text || '#000000',
                  marginBottom: 8,
                }}>
                Detection Radius
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Box style={{ flexDirection: 'row', gap: 8 }}>
                  {RADIUS_OPTIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRadius(r)}
                      style={[
                        styles.radiusButton,
                        {
                          backgroundColor:
                            radius === r
                              ? theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'
                              : theme?.colors?.surface || '#F3F4F6',
                        },
                      ]}>
                      <Text
                        style={{
                          color: radius === r ? '#FFFFFF' : theme?.colors?.text || '#000000',
                          fontSize: theme?.fontSize?.sm || 14,
                          fontWeight: theme?.fontWeight?.semibold || '600',
                        }}>
                        {r}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Box>
              </ScrollView>
            </Box>

            {/* Action Buttons */}
            <Box style={{ gap: 12, marginBottom: 20 }}>
              <Box style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  onPress={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: theme?.colors?.surface || '#F3F4F6',
                  }}>
                  <Text style={{ color: theme?.colors?.text || '#000000' }}>Cancel</Text>
                </Button>
                <Button
                  onPress={handleSave}
                  disabled={!name.trim() || !selectedLocation}
                  style={{
                    flex: 1,
                    backgroundColor: theme?.gradients?.primary?.colors?.[0] || '#8B5CF6',
                    opacity: name.trim() && selectedLocation ? 1 : 0.5,
                  }}>
                  <Text style={{ color: '#FFFFFF' }}>Save</Text>
                </Button>
              </Box>
              {/* Delete Button - Only show when editing */}
              {initialData && onDelete && (
                <Button
                  onPress={handleDelete}
                  style={{
                    backgroundColor: '#EF4444',
                  }}>
                  <Text style={{ color: '#FFFFFF' }}>Delete Zone</Text>
                </Button>
              )}
            </Box>
          </Box>
        </ScrollView>
        </KeyboardAvoidingView>
      </ModalContent>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  zoneMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoneMarkerText: {
    fontSize: 24,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconText: {
    fontSize: 18,
  },
  radiusButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
