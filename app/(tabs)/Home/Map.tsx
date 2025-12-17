import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {
  useAppTheme,
  useAuth,
  useFirebase,
  useLocation,
  useSmartLocationTracking,
  useZones,
} from '../../../hooks';
import { useAppSelector } from '../../../state';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Heart, X } from 'lucide-react-native';
import { MAPBOX_ACCESS_TOKEN } from '../../../config';
import { calculateDistance, formatDistance } from '../../../utils';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function Map() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);
  const { getCurrentLocation } = useLocation();
  const {
    getLocation,
    listenToLocationChanges,
    updateLocation,
    getZones,
    getZoneStatus,
    listenToZoneChanges,
    listenToZoneStatusChanges,
  } = useFirebase();

  // Enable smart location tracking with motion detection
  const { isMoving, movementIntensity, isMotionDetectionActive } = useSmartLocationTracking();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [partnerLocation, setPartnerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerPhotoURL, setPartnerPhotoURL] = useState<string | null>(null);
  const [areTogether, setAreTogether] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [showPartnerDrawer, setShowPartnerDrawer] = useState(false);
  const [showMergedDrawer, setShowMergedDrawer] = useState(false);
  const [userZoneStatus, setUserZoneStatus] = useState<any>(null);
  const [userSpeed, setUserSpeed] = useState<number | null>(null);

  // Refs for PointAnnotations to refresh after image loads
  const userAnnotationRef = useRef<any>(null);
  const partnerAnnotationRef = useRef<any>(null);
  const combinedAnnotationRef = useRef<any>(null);

  // Proximity threshold in meters (50 meters = ~164 feet)
  const PROXIMITY_THRESHOLD = 50;
  // Zones data via hook
  const { zones, partnerZoneStatus } = useZones({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    getZones,
    getZoneStatus,
    listenToZoneChanges,
    listenToZoneStatusChanges,
  });

  // Helper: build an approximate meter-accurate circle polygon around a point
  const makeCirclePolygon = (
    latitude: number,
    longitude: number,
    radiusMeters: number,
    steps: number = 64,
  ) => {
    const coords: [number, number][] = [];
    const latRad = (latitude * Math.PI) / 180;
    const metersPerDegLat = 111320; // approximate
    const metersPerDegLng = 111320 * Math.cos(latRad);
    const dLat = radiusMeters / metersPerDegLat;
    const dLng = radiusMeters / metersPerDegLng;

    for (let i = 0; i <= steps; i++) {
      const theta = (2 * Math.PI * i) / steps;
      const lat = latitude + dLat * Math.sin(theta);
      const lng = longitude + dLng * Math.cos(theta);
      coords.push([lng, lat]);
    }

    return {
      type: 'Polygon',
      coordinates: [coords],
    } as any;
  };

  // Build GeoJSON for zones
  const zoneFeatureCollection = useMemo(() => {
    const features = Object.values(zones || {}).map((zone: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [zone.longitude, zone.latitude],
      },
      properties: {
        id: zone.id || zone.name,
        name: zone.name,
        type: zone.type,
        radius: zone.radius || 100,
        isPartnerInside:
          !!partnerZoneStatus &&
          Object.values(partnerZoneStatus).some(
            (s: any) => s.zoneId === (zone.id || zone.name) && s.status === 'inside',
          ),
        isPartnerApproaching:
          !!partnerZoneStatus &&
          Object.values(partnerZoneStatus).some(
            (s: any) => s.zoneId === (zone.id || zone.name) && s.status === 'approaching',
          ),
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    } as any;
  }, [zones, partnerZoneStatus]);

  // Build polygon collection for accurate meter-based geofence rendering
  const zonePolygonCollection = useMemo(() => {
    const features = Object.values(zones || {}).map((zone: any) => ({
      type: 'Feature',
      geometry: makeCirclePolygon(zone.latitude, zone.longitude, zone.radius || 100),
      properties: {
        id: zone.id || zone.name,
        name: zone.name,
        type: zone.type,
        radius: zone.radius || 100,
        isPartnerInside:
          !!partnerZoneStatus &&
          Object.values(partnerZoneStatus).some(
            (s: any) => s.zoneId === (zone.id || zone.name) && s.status === 'inside',
          ),
        isPartnerApproaching:
          !!partnerZoneStatus &&
          Object.values(partnerZoneStatus).some(
            (s: any) => s.zoneId === (zone.id || zone.name) && s.status === 'approaching',
          ),
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    } as any;
  }, [zones, partnerZoneStatus]);

  // Load initial locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        console.log('User photoURL:', user.photoURL);
        console.log('User data:', {
          uid: user.uid,
          roomId: user.roomId,
          displayName: user.displayName,
        });

        const currentLoc = await getCurrentLocation();
        if (currentLoc) {
          setUserLocation({
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
          });

          // Save user's location to Firebase
          if (user.roomId && user.uid) {
            await updateLocation(user.roomId, user.uid, currentLoc);
          }
        }

        if (user.roomId && partnerId) {
          const partnerLoc = await getLocation(user.roomId, partnerId);
          if (partnerLoc) {
            setPartnerLocation({
              latitude: partnerLoc.latitude,
              longitude: partnerLoc.longitude,
            });
          }
        }
      } catch (e) {
        console.error('Error loading map data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  // Real-time location updates while map is open (every 2 seconds)
  useEffect(() => {
    const LOCAL_UPDATE_INTERVAL = 2000; // Update display every 2 seconds
    const FIREBASE_UPDATE_INTERVAL = 5000; // Upload to Firebase every 5 seconds

    let lastFirebaseUpdate = 0;

    const intervalId = setInterval(async () => {
      try {
        const currentLoc = await getCurrentLocation();
        if (currentLoc) {
          // Always update local display immediately for smooth real-time updates
          setUserLocation({
            latitude: currentLoc.latitude,
            longitude: currentLoc.longitude,
          });

          // Store speed if available
          if ('speed' in currentLoc && currentLoc.speed !== undefined) {
            setUserSpeed(currentLoc.speed);
          }

          // Upload to Firebase less frequently to save bandwidth
          const now = Date.now();
          if (now - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
            if (user.roomId && user.uid) {
              updateLocation(user.roomId, user.uid, currentLoc).catch((e) => {
                console.error('Error uploading location to Firebase:', e);
              });
              lastFirebaseUpdate = now;
            }
          }
        }
      } catch (e) {
        console.error('Error updating location:', e);
      }
    }, LOCAL_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user.roomId, user.uid, getCurrentLocation, updateLocation]);

  // Fetch partner's profile photo
  useEffect(() => {
    const fetchPartnerPhoto = async () => {
      if (user.roomId && partnerId) {
        try {
          const { getDatabase, ref: databaseRef, get } = await import('firebase/database');
          const db = getDatabase();
          const partnerRef = databaseRef(db, `users/${partnerId}`);
          const snapshot = await get(partnerRef);

          console.log('Fetching partner photo for:', partnerId);
          if (snapshot.exists()) {
            const partnerData = snapshot.val();
            console.log('Partner data:', partnerData);
            console.log('Partner photoURL:', partnerData.photoURL);
            setPartnerPhotoURL(partnerData.photoURL || null);
          } else {
            console.log('Partner data does not exist at users/' + partnerId);
          }
        } catch (error) {
          console.error('Error fetching partner photo:', error);
        }
      }
    };

    fetchPartnerPhoto();
  }, [user.roomId, partnerId]);

  // Listen for realtime location updates from both users
  useEffect(() => {
    if (!user.roomId) return;

    // Listen to user's own location changes (from background updates)
    if (user.uid) {
      listenToLocationChanges(
        (location) => {
          if (location) {
            setUserLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        },
        user.roomId,
        user.uid,
      );
    }

    // Listen to partner's location changes
    if (partnerId) {
      listenToLocationChanges(
        (location) => {
          if (location) {
            setPartnerLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        },
        user.roomId,
        partnerId,
      );
    }
  }, [user.roomId, user.uid, partnerId]);

  // Listen to user's own zone status
  useEffect(() => {
    if (!user.roomId || !user.uid) return;

    const unsubscribe = listenToZoneStatusChanges(
      (status) => {
        setUserZoneStatus(status);
      },
      user.roomId,
      user.uid,
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user.roomId, user.uid]);

  const handleBack = () => router.back();

  const getCameraConfig = () => {
    const loc = userLocation || partnerLocation;
    if (!loc) return null;

    if (!userLocation || !partnerLocation) {
      return {
        centerCoordinate: [loc.longitude, loc.latitude],
        zoomLevel: 12,
      };
    }

    const centerLng = (userLocation.longitude + partnerLocation.longitude) / 2;
    const centerLat = (userLocation.latitude + partnerLocation.latitude) / 2;

    const maxDiff = Math.max(
      Math.abs(userLocation.latitude - partnerLocation.latitude),
      Math.abs(userLocation.longitude - partnerLocation.longitude),
    );

    let zoomLevel = 14;
    if (maxDiff > 0.5) zoomLevel = 8;
    else if (maxDiff > 0.1) zoomLevel = 10;
    else if (maxDiff > 0.01) zoomLevel = 12;

    return {
      centerCoordinate: [centerLng, centerLat],
      zoomLevel,
    };
  };

  const cameraConfig = getCameraConfig();

  // Check proximity between users
  useEffect(() => {
    if (userLocation && partnerLocation) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude,
      );

      setAreTogether(distance <= PROXIMITY_THRESHOLD);
      console.log(
        `Distance: ${distance.toFixed(2)}m - Together: ${distance <= PROXIMITY_THRESHOLD}`,
      );
    } else {
      setAreTogether(false);
    }
  }, [userLocation, partnerLocation]);

  // Combined marker component for when users are together
  const CombinedMarker = () => {
    const primaryColor = theme?.gradients?.primary?.colors?.[0] || '#8B5CF6';
    const surfaceColor = theme?.colors?.surface || '#FFFFFF';
    const textColor = theme?.colors?.text || '#000000';

    return (
      <View style={styles.markerContainer}>
        {/* Pin pointer at bottom */}
        <View style={[styles.pinPointer, { borderTopColor: primaryColor }]} />

        {/* Combined circle with heart */}
        <View
          style={[
            styles.combinedCircle,
            {
              borderColor: primaryColor,
              backgroundColor: surfaceColor,
            },
          ]}>
          <Heart size={24} color={primaryColor} fill={primaryColor} />
        </View>

        {/* Label below */}
        <View style={[styles.label, { backgroundColor: surfaceColor }]}>
          <Text style={[styles.labelText, { color: textColor }]}>{partnerName} & You</Text>
        </View>
      </View>
    );
  };

  // Component for circular profile picture marker
  const ProfileMarker = ({
    photoURL,
    label,
    isUser = false,
    annotationRef,
  }: {
    photoURL?: string | null;
    label: string;
    isUser?: boolean;
    annotationRef?: React.RefObject<any>;
  }) => {
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Fallback colors if theme is not loaded
    const primaryColor = theme?.gradients?.primary?.colors?.[0] || '#8B5CF6';
    const secondaryColor = theme?.gradients?.secondary?.colors?.[0] || '#EC4899';
    const surfaceColor = theme?.colors?.surface || '#FFFFFF';
    const textColor = theme?.colors?.text || '#000000';

    // Handle image load - refresh annotation
    const handleImageLoad = () => {
      console.log(`Image loaded for ${label}, refreshing annotation`);
      annotationRef?.current?.refresh();
    };

    // Debug logging
    console.log(`ProfileMarker for ${label}:`, { photoURL, isUser });

    return (
      <View style={styles.markerContainer}>
        {/* Pin pointer at bottom */}
        <View
          style={[
            styles.pinPointer,
            {
              borderTopColor: isUser ? primaryColor : secondaryColor,
            },
          ]}
        />

        {/* Circular profile picture */}
        <View
          style={[
            styles.profileCircle,
            {
              borderColor: isUser ? primaryColor : secondaryColor,
              backgroundColor: surfaceColor,
            },
          ]}>
          {photoURL && photoURL.trim() !== '' ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: photoURL }}
                style={styles.profileImage}
                resizeMode="cover"
                onLoad={handleImageLoad}
                onError={(e) => console.log(`Image error for ${label}:`, e.nativeEvent.error)}
              />
            </View>
          ) : (
            <View
              style={[
                styles.initialsContainer,
                {
                  backgroundColor: isUser ? primaryColor : secondaryColor,
                },
              ]}>
              <Text style={styles.initialsText}>{getInitials(label)}</Text>
            </View>
          )}
        </View>

        {/* Label below */}
        <View style={[styles.label, { backgroundColor: surfaceColor }]}>
          <Text style={[styles.labelText, { color: textColor }]}>{label}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#FFFFFF' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme?.colors?.primary || '#8B5CF6'} />
          <Text style={{ color: theme?.colors?.text || '#000000' }}>Loading map…</Text>
        </View>
      </View>
    );
  }

  const getMotionStatusText = () => {
    if (!isMotionDetectionActive) return '';
    switch (movementIntensity) {
      case 'stationary':
        return '📍 Stationary';
      case 'slow':
        return '🚶 Moving Slowly';
      case 'moderate':
        return '🏃 Moving';
      case 'fast':
        return '🚗 Moving Fast';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme?.colors?.surface || '#FFFFFF' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonIcon}>
          <ArrowLeft size={24} color={theme?.colors?.text || '#000000'} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme?.colors?.text || '#000000' }]}>
            Locations
          </Text>
          {isMotionDetectionActive && (
            <Text
              style={[styles.motionStatus, { color: theme?.colors?.textSecondary || '#6B7280' }]}>
              {getMotionStatusText()}
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <MapboxGL.MapView
        style={styles.map}
        styleURL={theme?.colorMode === 'dark' ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street}>
        {cameraConfig && (
          <MapboxGL.Camera
            centerCoordinate={cameraConfig.centerCoordinate}
            zoomLevel={cameraConfig.zoomLevel}
            animationDuration={800}
          />
        )}

        {/* Show combined marker when together, otherwise show individual markers */}
        {areTogether && userLocation ? (
          <MapboxGL.PointAnnotation
            ref={combinedAnnotationRef}
            id="combined-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
            onSelected={() => setShowMergedDrawer(true)}>
            <CombinedMarker />
          </MapboxGL.PointAnnotation>
        ) : (
          <>
            {userLocation && (
              <MapboxGL.PointAnnotation
                ref={userAnnotationRef}
                id="user-location"
                coordinate={[userLocation.longitude, userLocation.latitude]}
                onSelected={() => setShowUserDrawer(true)}>
                <ProfileMarker
                  photoURL={user.photoURL}
                  label="You"
                  isUser={true}
                  annotationRef={userAnnotationRef}
                />
              </MapboxGL.PointAnnotation>
            )}

            {partnerLocation && (
              <MapboxGL.PointAnnotation
                ref={partnerAnnotationRef}
                id="partner-location"
                coordinate={[partnerLocation.longitude, partnerLocation.latitude]}
                onSelected={() => setShowPartnerDrawer(true)}>
                <ProfileMarker
                  photoURL={partnerPhotoURL}
                  label={partnerName}
                  isUser={false}
                  annotationRef={partnerAnnotationRef}
                />
              </MapboxGL.PointAnnotation>
            )}
          </>
        )}

        {/* Zones / Geofences: accurate meter-based polygons */}
        {showZones && (zonePolygonCollection.features?.length ?? 0) > 0 && (
          <MapboxGL.ShapeSource id="zones-polygons" shape={zonePolygonCollection}>
            <MapboxGL.FillLayer
              id="zones-fill"
              style={{
                fillColor: [
                  'match',
                  ['get', 'type'],
                  'home',
                  theme?.colors?.primary || '#8B5CF6',
                  'work',
                  theme?.colors?.secondary || '#EC4899',
                  'custom',
                  '#10B981',
                  theme?.colors?.primary || '#8B5CF6',
                ],
                fillOpacity: 0.18,
              }}
            />
            <MapboxGL.LineLayer
              id="zones-outline"
              style={{
                lineColor: [
                  'case',
                  ['get', 'isPartnerInside'],
                  '#10B981',
                  ['get', 'isPartnerApproaching'],
                  '#F59E0B',
                  theme?.colors?.border || '#E5E7EB',
                ],
                lineWidth: 2,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Zone labels anchored at centers */}
        {showZones && (zoneFeatureCollection.features?.length ?? 0) > 0 && (
          <MapboxGL.ShapeSource id="zones-labels-source" shape={zoneFeatureCollection}>
            <MapboxGL.SymbolLayer
              id="zones-labels"
              style={{
                textField: ['get', 'name'],
                textSize: 12,
                textColor: theme?.colors?.text || '#111827',
                textHaloColor: theme?.colors?.surface || '#FFFFFF',
                textHaloWidth: 1,
                textAllowOverlap: true,
                textOffset: [0, 1.5],
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      <StatusBar style={theme?.colorMode === 'dark' ? 'light' : 'dark'} />

      {/* Toggle zones visibility */}
      <View style={[styles.zonesToggle, { backgroundColor: theme?.colors?.surface || '#FFFFFF' }]}>
        <TouchableOpacity onPress={() => setShowZones((v) => !v)} style={styles.toggleButton}>
          <Text style={{ color: theme?.colors?.text || '#000000', fontWeight: '600' }}>
            {showZones ? 'Hide Zones' : 'Show Zones'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* User Info Drawer */}
      <Modal
        visible={showUserDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserDrawer(false)}>
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowUserDrawer(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.drawerContainer,
              { backgroundColor: theme?.colors?.background || '#FFFFFF' },
            ]}>
            <View style={styles.drawerHandle} />

            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme?.colors?.text || '#000000' }]}>
                Your Location
              </Text>
              <TouchableOpacity onPress={() => setShowUserDrawer(false)}>
                <X size={24} color={theme?.colors?.text || '#000000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent}>
              {/* Coordinates */}
              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                  {userLocation
                    ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                    : 'Unknown'}
                </Text>
              </View>

              {/* Speed */}
              {userSpeed !== null && (
                <View style={styles.infoSection}>
                  <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                    Speed
                  </Text>
                  <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                    {(userSpeed * 3.6).toFixed(1)} km/h
                    {userSpeed > 0 && ` (${(userSpeed * 2.237).toFixed(1)} mph)`}
                  </Text>
                </View>
              )}

              {/* Zone Information - Only show zones where user is inside */}
              {userZoneStatus &&
                Object.values(userZoneStatus).some((s: any) => s.status === 'inside') && (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={[styles.sectionTitle, { color: theme?.colors?.text }]}>
                      Current Zone
                    </Text>
                    {Object.values(userZoneStatus)
                      .filter((zoneStatus: any) => zoneStatus.status === 'inside')
                      .map((zoneStatus: any) => (
                        <View
                          key={zoneStatus.zoneId}
                          style={[
                            styles.zoneInfoCard,
                            {
                              backgroundColor: theme?.colors?.surface || '#F3F4F6',
                              borderLeftColor: '#10B981',
                            },
                          ]}>
                          <View style={styles.zoneHeader}>
                            <Text style={[styles.zoneName, { color: theme?.colors?.text }]}>
                              {zoneStatus.zoneName}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.statusText,
                                  {
                                    color: '#10B981',
                                  },
                                ]}>
                                inside
                              </Text>
                            </View>
                          </View>

                          {zoneStatus.distance !== undefined && (
                            <Text
                              style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                              Distance: {formatDistance(zoneStatus.distance)}
                            </Text>
                          )}

                          {zoneStatus.enteredAt && (
                            <Text
                              style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                              Entered:{' '}
                              {new Date(zoneStatus.enteredAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          )}

                          {zoneStatus.lastUpdated && (
                            <Text
                              style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                              Updated:{' '}
                              {new Date(zoneStatus.lastUpdated).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </Text>
                          )}
                        </View>
                      ))}
                  </>
                )}

              {(!userZoneStatus ||
                !Object.values(userZoneStatus).some((s: any) => s.status === 'inside')) && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary }]}>
                    Not inside any zones
                  </Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Partner Info Drawer */}
      <Modal
        visible={showPartnerDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPartnerDrawer(false)}>
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowPartnerDrawer(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.drawerContainer,
              { backgroundColor: theme?.colors?.background || '#FFFFFF' },
            ]}>
            <View style={styles.drawerHandle} />

            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme?.colors?.text || '#000000' }]}>
                {partnerName}'s Location
              </Text>
              <TouchableOpacity onPress={() => setShowPartnerDrawer(false)}>
                <X size={24} color={theme?.colors?.text || '#000000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent}>
              {/* Coordinates */}
              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                  {partnerLocation
                    ? `${partnerLocation.latitude.toFixed(6)}, ${partnerLocation.longitude.toFixed(6)}`
                    : 'Unknown'}
                </Text>
              </View>

              {/* Zone Information */}
              {partnerZoneStatus && Object.keys(partnerZoneStatus).length > 0 && (
                <>
                  <View style={styles.sectionDivider} />
                  <Text style={[styles.sectionTitle, { color: theme?.colors?.text }]}>Zones</Text>
                  {Object.values(partnerZoneStatus)
                    .filter((zoneStatus: any) => zoneStatus.status === 'inside')
                    .map((zoneStatus: any) => (
                      <View
                        key={zoneStatus.zoneId}
                        style={[
                          styles.zoneInfoCard,
                          {
                            backgroundColor: theme?.colors?.surface || '#F3F4F6',
                            borderLeftColor:
                              zoneStatus.status === 'inside'
                                ? '#10B981'
                                : zoneStatus.status === 'approaching'
                                  ? '#F59E0B'
                                  : theme?.colors?.border,
                          },
                        ]}>
                        <View style={styles.zoneHeader}>
                          <Text style={[styles.zoneName, { color: theme?.colors?.text }]}>
                            {zoneStatus.zoneName}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  zoneStatus.status === 'inside'
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : zoneStatus.status === 'approaching'
                                      ? 'rgba(245, 158, 11, 0.1)'
                                      : 'rgba(107, 114, 128, 0.1)',
                              },
                            ]}>
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    zoneStatus.status === 'inside'
                                      ? '#10B981'
                                      : zoneStatus.status === 'approaching'
                                        ? '#F59E0B'
                                        : theme?.colors?.textSecondary,
                                },
                              ]}>
                              {zoneStatus.status}
                            </Text>
                          </View>
                        </View>

                        {zoneStatus.status !== 'outside' && zoneStatus.distance !== undefined && (
                          <Text
                            style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                            Distance: {formatDistance(zoneStatus.distance)}
                          </Text>
                        )}

                        {zoneStatus.status === 'inside' && zoneStatus.enteredAt && (
                          <Text
                            style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                            Entered:{' '}
                            {new Date(zoneStatus.enteredAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        )}

                        {zoneStatus.lastUpdated && (
                          <Text
                            style={[styles.zoneDetail, { color: theme?.colors?.textSecondary }]}>
                            Updated:{' '}
                            {new Date(zoneStatus.lastUpdated).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </Text>
                        )}
                      </View>
                    ))}
                </>
              )}

              {(!partnerZoneStatus || Object.keys(partnerZoneStatus).length === 0) && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary }]}>
                    Not inside any zones
                  </Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Merged Drawer (when together) */}
      <Modal
        visible={showMergedDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMergedDrawer(false)}>
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={() => setShowMergedDrawer(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.drawerContainer,
              { backgroundColor: theme?.colors?.background || '#FFFFFF' },
            ]}>
            <View style={styles.drawerHandle} />

            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme?.colors?.text || '#000000' }]}>
                Together 💕
              </Text>
              <TouchableOpacity onPress={() => setShowMergedDrawer(false)}>
                <X size={24} color={theme?.colors?.text || '#000000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent}>
              {/* Distance between you */}
              {userLocation && partnerLocation && (
                <View style={styles.infoSection}>
                  <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                    Distance Apart
                  </Text>
                  <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                    {formatDistance(
                      calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        partnerLocation.latitude,
                        partnerLocation.longitude,
                      ),
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.sectionDivider} />

              {/* Your Information */}
              <Text style={[styles.sectionTitle, { color: theme?.colors?.text }]}>
                Your Location
              </Text>

              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                  {userLocation
                    ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                    : 'Unknown'}
                </Text>
              </View>

              {userSpeed !== null && (
                <View style={styles.infoSection}>
                  <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                    Speed
                  </Text>
                  <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                    {(userSpeed * 3.6).toFixed(1)} km/h
                    {userSpeed > 0 && ` (${(userSpeed * 2.237).toFixed(1)} mph)`}
                  </Text>
                </View>
              )}

              <View style={styles.sectionDivider} />

              {/* Partner's Information */}
              <Text style={[styles.sectionTitle, { color: theme?.colors?.text }]}>
                {partnerName}'s Location
              </Text>

              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: theme?.colors?.textSecondary }]}>
                  Coordinates
                </Text>
                <Text style={[styles.infoValue, { color: theme?.colors?.text }]}>
                  {partnerLocation
                    ? `${partnerLocation.latitude.toFixed(6)}, ${partnerLocation.longitude.toFixed(6)}`
                    : 'Unknown'}
                </Text>
              </View>

              {/* Combined Zone Information */}
              {((userZoneStatus && Object.keys(userZoneStatus).length > 0) ||
                (partnerZoneStatus && Object.keys(partnerZoneStatus).length > 0)) && (
                <>
                  <View style={styles.sectionDivider} />
                  <Text style={[styles.sectionTitle, { color: theme?.colors?.text }]}>
                    Current Zones
                  </Text>

                  {/* Your zones - Only show zones where user is inside */}
                  {userZoneStatus &&
                    Object.values(userZoneStatus).some((s: any) => s.status === 'inside') && (
                      <>
                        <Text
                          style={[
                            styles.infoLabel,
                            { color: theme?.colors?.textSecondary, marginBottom: 8 },
                          ]}>
                          Your Zones
                        </Text>
                        {Object.values(userZoneStatus)
                          .filter((zoneStatus: any) => zoneStatus.status === 'inside')
                          .map((zoneStatus: any) => (
                            <View
                              key={`user-${zoneStatus.zoneId}`}
                              style={[
                                styles.zoneInfoCard,
                                {
                                  backgroundColor: theme?.colors?.surface || '#F3F4F6',
                                  borderLeftColor: '#10B981',
                                },
                              ]}>
                              <View style={styles.zoneHeader}>
                                <Text style={[styles.zoneName, { color: theme?.colors?.text }]}>
                                  {zoneStatus.zoneName}
                                </Text>
                                <View
                                  style={[
                                    styles.statusBadge,
                                    {
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    },
                                  ]}>
                                  <Text
                                    style={[
                                      styles.statusText,
                                      {
                                        color: '#10B981',
                                      },
                                    ]}>
                                    inside
                                  </Text>
                                </View>
                              </View>

                              {zoneStatus.distance !== undefined && (
                                <Text
                                  style={[
                                    styles.zoneDetail,
                                    { color: theme?.colors?.textSecondary },
                                  ]}>
                                  Distance: {formatDistance(zoneStatus.distance)}
                                </Text>
                              )}

                              {zoneStatus.enteredAt && (
                                <Text
                                  style={[
                                    styles.zoneDetail,
                                    { color: theme?.colors?.textSecondary },
                                  ]}>
                                  Entered:{' '}
                                  {new Date(zoneStatus.enteredAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              )}
                            </View>
                          ))}
                      </>
                    )}

                  {/* Partner's zones - Only show zones where partner is inside */}
                  {partnerZoneStatus &&
                    Object.values(partnerZoneStatus).some((s: any) => s.status === 'inside') && (
                      <>
                        <Text
                          style={[
                            styles.infoLabel,
                            {
                              color: theme?.colors?.textSecondary,
                              marginTop: 12,
                              marginBottom: 8,
                            },
                          ]}>
                          {partnerName}'s Zones
                        </Text>
                        {Object.values(partnerZoneStatus)
                          .filter((zoneStatus: any) => zoneStatus.status === 'inside')
                          .map((zoneStatus: any) => (
                            <View
                              key={`partner-${zoneStatus.zoneId}`}
                              style={[
                                styles.zoneInfoCard,
                                {
                                  backgroundColor: theme?.colors?.surface || '#F3F4F6',
                                  borderLeftColor: '#10B981',
                                },
                              ]}>
                              <View style={styles.zoneHeader}>
                                <Text style={[styles.zoneName, { color: theme?.colors?.text }]}>
                                  {zoneStatus.zoneName}
                                </Text>
                                <View
                                  style={[
                                    styles.statusBadge,
                                    {
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    },
                                  ]}>
                                  <Text
                                    style={[
                                      styles.statusText,
                                      {
                                        color: '#10B981',
                                      },
                                    ]}>
                                    inside
                                  </Text>
                                </View>
                              </View>

                              {zoneStatus.distance !== undefined && (
                                <Text
                                  style={[
                                    styles.zoneDetail,
                                    { color: theme?.colors?.textSecondary },
                                  ]}>
                                  Distance: {formatDistance(zoneStatus.distance)}
                                </Text>
                              )}

                              {zoneStatus.enteredAt && (
                                <Text
                                  style={[
                                    styles.zoneDetail,
                                    { color: theme?.colors?.textSecondary },
                                  ]}>
                                  Entered:{' '}
                                  {new Date(zoneStatus.enteredAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              )}
                            </View>
                          ))}
                      </>
                    )}
                </>
              )}

              {(!userZoneStatus ||
                !Object.values(userZoneStatus).some((s: any) => s.status === 'inside')) &&
                (!partnerZoneStatus ||
                  !Object.values(partnerZoneStatus).some((s: any) => s.status === 'inside')) && (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary }]}>
                      Neither of you are inside any zones
                    </Text>
                  </View>
                )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  motionStatus: { fontSize: 12, marginTop: 2 },
  backButtonIcon: { padding: 8 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
  },
  pinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  imageWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  combinedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  zonesToggle: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 3,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  zoneInfoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  zoneDetail: {
    fontSize: 13,
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
