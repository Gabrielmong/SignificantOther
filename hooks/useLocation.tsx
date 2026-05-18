import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useAppToast } from './useAppToast';

export const LOCATION_TASK_NAME = 'background-location-task';

export interface UserLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState<boolean | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { showToast } = useAppToast();

  // Request foreground location permission
  // Location permissions temporarily disabled
  const requestPermission = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    return false;
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(
    async (silent: boolean = false): Promise<UserLocation | null> => {
      try {
        setLoading(true);

        // Check if we have permission
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const granted = await requestPermission();
          if (!granted) {
            setLoading(false);
            return null;
          }
        }

        // Get current position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const userLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };

        setLocation(userLocation);
        setLoading(false);
        return userLocation;
      } catch (error) {
        if (!silent) {
          console.error('Error getting location:', error);
          showToast({
            title: 'Location Error',
            description: 'Could not get your current location. Please try again.',
            status: 'error',
          });
        }
        setLoading(false);
        return null;
      }
    },
    [requestPermission, showToast],
  );

  // Start background location updates with optional custom intervals
  const startBackgroundUpdate = useCallback(
    async (timeInterval: number = 300000, distanceInterval: number = 100): Promise<boolean> => {
      try {
        // Check if already tracking
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isTaskRegistered) {
          // Stop existing tracking to update intervals
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }

        // Request background permission
        const hasPermission = await requestBackgroundPermission();
        if (!hasPermission) {
          return false;
        }

        // Start location updates with custom intervals
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval, // Dynamic time interval
          distanceInterval, // Dynamic distance interval
          foregroundService: {
            notificationTitle: 'Significant Other',
            notificationBody:
              'Tracking your location to show distance and map updates to your partner',
            notificationColor: '#8859ff',
          },
        });

        setIsTracking(true);
        console.log('✅ Background location tracking started successfully');

        return true;
      } catch (error) {
        console.error('Error starting background location:', error);
        showToast({
          title: 'Error',
          description: 'Could not start background location tracking',
          status: 'error',
        });
        return false;
      }
    },
    [requestBackgroundPermission, showToast],
  );

  // Update background location tracking intervals
  const updateBackgroundIntervals = useCallback(
    async (timeInterval: number, distanceInterval: number): Promise<boolean> => {
      try {
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (!isTaskRegistered) {
          console.log('Background tracking not active, skipping interval update');
          return false;
        }

        // Restart with new intervals
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval,
          distanceInterval,
          foregroundService: {
            notificationTitle: 'Significant Other',
            notificationBody: 'Tracking your location to show distance to your partner',
            notificationColor: '#8859ff',
          },
        });

        console.log(`Updated location intervals: ${timeInterval}ms, ${distanceInterval}m`);
        return true;
      } catch (error) {
        console.error('Error updating background intervals:', error);
        return false;
      }
    },
    [],
  );

  // Stop background location updates
  const stopBackgroundUpdate = useCallback(async (): Promise<void> => {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(false);
        console.log('ℹ️ Background location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping background location:', error);
    }
  }, []);

  // Check if background tracking is active
  const checkBackgroundTracking = useCallback(async () => {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    setIsTracking(isTaskRegistered);
    return isTaskRegistered;
  }, []);

  // Check permission status on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      setHasBackgroundPermission(bgStatus === 'granted');

      await checkBackgroundTracking();
    })();
  }, [checkBackgroundTracking]);

  return {
    location,
    loading,
    hasPermission,
    hasBackgroundPermission,
    isTracking,
    requestPermission,
    requestBackgroundPermission,
    getCurrentLocation,
    startBackgroundUpdate,
    stopBackgroundUpdate,
    checkBackgroundTracking,
    updateBackgroundIntervals,
  };
};
