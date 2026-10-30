/**
 * Google Sign-In Configuration
 *
 * The web client ID is read from google-services.json in app.config.ts and
 * accessed via expo-constants. EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID overrides it.
 */

import Constants from 'expo-constants';

export const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';
