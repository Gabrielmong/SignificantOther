/**
 * Mapbox Configuration
 *
 * The Mapbox access token is stored in the .env file and accessed via expo-constants.
 * See .env.example for setup instructions.
 */

import Constants from 'expo-constants';

export const MAPBOX_ACCESS_TOKEN =
  Constants.expoConfig?.extra?.mapboxAccessToken || '';
