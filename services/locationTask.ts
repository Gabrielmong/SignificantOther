import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { getDatabase, ref as databaseRef, update, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCATION_TASK_NAME } from '../hooks/useLocation';
import { checkAllZones } from '../utils/geofencing';
import { Zone } from '../types';

const USER_ID_KEY = '@location_task_user_id';
const ROOM_ID_KEY = '@location_task_room_id';

// Function to set user info for the background task
export const setLocationTaskUserInfo = async (userId: string, roomId: string) => {
  try {
    await AsyncStorage.multiSet([
      [USER_ID_KEY, userId],
      [ROOM_ID_KEY, roomId],
    ]);
    console.log('Location task user info saved:', { userId, roomId });
  } catch (error) {
    console.error('Error saving location task user info:', error);
  }
};

// Function to get user info from storage
export const getLocationTaskUserInfo = async (): Promise<{
  userId: string | null;
  roomId: string | null;
}> => {
  try {
    const values = await AsyncStorage.multiGet([USER_ID_KEY, ROOM_ID_KEY]);
    return {
      userId: values[0][1],
      roomId: values[1][1],
    };
  } catch (error) {
    console.error('Error getting location task user info:', error);
    return { userId: null, roomId: null };
  }
};

// Function to clear user info (e.g., on logout)
export const clearLocationTaskUserInfo = async () => {
  try {
    await AsyncStorage.multiRemove([USER_ID_KEY, ROOM_ID_KEY]);
    console.log('Location task user info cleared');
  } catch (error) {
    console.error('Error clearing location task user info:', error);
  }
};

// Define the background location task
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.error('Background location error:', error);
      return;
    }

    if (data) {
      const { locations } = data;
      const location = locations[0];

      if (location) {
        try {
          // Get user info from AsyncStorage
          const { userId, roomId } = await getLocationTaskUserInfo();

          if (userId && roomId) {
            const db = getDatabase();

            // Update location in Firebase
            const locationRef = databaseRef(db, `rooms/${roomId}/users/${userId}/location`);

            await update(locationRef, {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: Date.now(),
              speed: location.coords.speed || 0,
            });

            console.log('Background location updated:', {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              userId,
              roomId,
            });

            // Check zones
            try {
              const zonesRef = databaseRef(db, `rooms/${roomId}/zones`);
              const zonesSnapshot = await get(zonesRef);

              if (zonesSnapshot.exists()) {
                const zones = zonesSnapshot.val() as { [key: string]: Zone };
                const zoneResults = checkAllZones(
                  location.coords.latitude,
                  location.coords.longitude,
                  zones,
                );

                // Fetch current zone status BEFORE building updates
                const zoneStatusRef = databaseRef(db, `rooms/${roomId}/zoneStatus/${userId}`);
                const currentZoneStatusSnapshot = await get(zoneStatusRef);
                const currentZoneStatus = currentZoneStatusSnapshot.exists()
                  ? currentZoneStatusSnapshot.val()
                  : {};

                const statusUpdates: any = {};

                Object.entries(zoneResults).forEach(([zoneId, result]) => {
                  statusUpdates[zoneId] = {
                    zoneId,
                    zoneName: result.zoneName,
                    status: result.status,
                    distance: result.distance,
                    lastUpdated: Date.now(),
                  };

                  // Track entry time for 'inside' status
                  if (result.status === 'inside') {
                    // Check if user was already inside this zone
                    const wasAlreadyInside =
                      currentZoneStatus[zoneId]?.status === 'inside' &&
                      currentZoneStatus[zoneId]?.enteredAt;

                    if (wasAlreadyInside) {
                      // Preserve existing enteredAt timestamp
                      statusUpdates[zoneId].enteredAt = currentZoneStatus[zoneId].enteredAt;
                    } else {
                      // New entry - set current timestamp
                      statusUpdates[zoneId].enteredAt = Date.now();
                    }
                  }
                });

                await update(zoneStatusRef, statusUpdates);

                console.log('Zone status updated:', Object.keys(zoneResults).length, 'zones checked');
              }
            } catch (zoneError) {
              console.error('Error checking zones:', zoneError);
              // Don't fail the location update if zone checking fails
            }
          } else {
            console.warn('Background location update skipped: user info not found');
          }
        } catch (error) {
          console.error('Error updating location in background:', error);
        }
      }
    }
  },
);

export default LOCATION_TASK_NAME;
