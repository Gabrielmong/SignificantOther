import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetCountdown } from '../types';

const USER_ID_KEY = '@widget_task_user_id';
const ROOM_ID_KEY = '@widget_task_room_id';
const PARTNER_ID_KEY = '@widget_task_partner_id';
const PARTNER_NAME_KEY = '@widget_task_partner_name';
const LAST_DATA_KEY = '@widget_task_last_data';

export type WidgetDisplayData = {
  flower: string;
  message: string;
  feeling: string;
  partnerName: string;
  updatedAt: number;
  nextCountdown?: WidgetCountdown | null;
};

// Function to set user/room/partner info for the widget task handler
export const setWidgetTaskUserInfo = async (
  userId: string,
  roomId: string,
  partnerId: string,
  partnerName: string,
) => {
  try {
    await AsyncStorage.multiSet([
      [USER_ID_KEY, userId],
      [ROOM_ID_KEY, roomId],
      [PARTNER_ID_KEY, partnerId],
      [PARTNER_NAME_KEY, partnerName],
    ]);
    console.log('Widget task user info saved:', { userId, roomId, partnerId, partnerName });
  } catch (error) {
    console.error('Error saving widget task user info:', error);
  }
};

// Function to get user/room/partner info from storage
export const getWidgetTaskUserInfo = async (): Promise<{
  userId: string | null;
  roomId: string | null;
  partnerId: string | null;
  partnerName: string | null;
}> => {
  try {
    const values = await AsyncStorage.multiGet([
      USER_ID_KEY,
      ROOM_ID_KEY,
      PARTNER_ID_KEY,
      PARTNER_NAME_KEY,
    ]);
    return {
      userId: values[0][1],
      roomId: values[1][1],
      partnerId: values[2][1],
      partnerName: values[3][1],
    };
  } catch (error) {
    console.error('Error getting widget task user info:', error);
    return { userId: null, roomId: null, partnerId: null, partnerName: null };
  }
};

// Function to clear user/room/partner info (e.g., on logout)
export const clearWidgetTaskUserInfo = async () => {
  try {
    await AsyncStorage.multiRemove([USER_ID_KEY, ROOM_ID_KEY, PARTNER_ID_KEY, PARTNER_NAME_KEY, LAST_DATA_KEY]);
    console.log('Widget task user info cleared');
  } catch (error) {
    console.error('Error clearing widget task user info:', error);
  }
};

// Function to persist the last-known widget display data (written by both
// the FCM push handler and the widget task handler's fallback read)
export const setWidgetLastData = async (data: WidgetDisplayData) => {
  try {
    await AsyncStorage.setItem(LAST_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving widget last data:', error);
  }
};

// Function to read the last-known widget display data
export const getWidgetLastData = async (): Promise<WidgetDisplayData | null> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_DATA_KEY);
    return raw ? (JSON.parse(raw) as WidgetDisplayData) : null;
  } catch (error) {
    console.error('Error getting widget last data:', error);
    return null;
  }
};

// Function to merge a partial update into the last-known widget display data.
// Every writer uses this, so a flower/feeling push doesn't wipe the cached
// countdown and a countdown change doesn't wipe the partner fields.
export const mergeWidgetLastData = async (
  partial: Partial<WidgetDisplayData>,
): Promise<WidgetDisplayData> => {
  const cached = await getWidgetLastData();
  const merged: WidgetDisplayData = {
    flower: '',
    message: '',
    feeling: '',
    partnerName: '',
    ...cached,
    ...partial,
    updatedAt: Date.now(),
  };
  await setWidgetLastData(merged);
  return merged;
};
