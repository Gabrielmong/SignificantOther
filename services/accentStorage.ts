import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ACCENT, toAccentId, type AccentId } from '../config/theme/accentThemes';

const ACCENT_KEY = '@SignificantOther:accent';
const PARTNER_ACCENT_KEY = '@SignificantOther:partnerAccent';

// Function to read the cached accent ids, so the first paint uses the right
// theme before Firebase answers
export const loadCachedAccents = async (): Promise<{
  accentId: AccentId;
  partnerAccentId: AccentId;
}> => {
  try {
    const values = await AsyncStorage.multiGet([ACCENT_KEY, PARTNER_ACCENT_KEY]);
    return {
      accentId: toAccentId(values[0][1]),
      partnerAccentId: toAccentId(values[1][1]),
    };
  } catch (error) {
    console.error('Error loading cached accents:', error);
    return { accentId: DEFAULT_ACCENT, partnerAccentId: DEFAULT_ACCENT };
  }
};

// Function to cache this user's accent id
export const cacheAccent = async (id: AccentId) => {
  try {
    await AsyncStorage.setItem(ACCENT_KEY, id);
  } catch (error) {
    console.error('Error caching accent:', error);
  }
};

// Function to cache the partner's accent id
export const cachePartnerAccent = async (id: AccentId) => {
  try {
    await AsyncStorage.setItem(PARTNER_ACCENT_KEY, id);
  } catch (error) {
    console.error('Error caching partner accent:', error);
  }
};

// Function to clear both cached accent ids (e.g., on logout)
export const clearAccentStorage = async () => {
  try {
    await AsyncStorage.multiRemove([ACCENT_KEY, PARTNER_ACCENT_KEY]);
  } catch (error) {
    console.error('Error clearing accent storage:', error);
  }
};
