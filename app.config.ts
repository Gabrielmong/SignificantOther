import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Significant Other',
  slug: 'SignificantOtherApp',
  version: '1.8.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'significantotherapp',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#DFB7FF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['location', 'fetch', 'processing'],
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Allow Significant Other to track your location in the background to show real-time distance between you and your partner.',
      NSLocationWhenInUseUsageDescription:
        'Allow Significant Other to use your location to show the distance between you and your partner.',
      NSLocationAlwaysUsageDescription:
        'Allow Significant Other to track your location in the background to show real-time distance between you and your partner.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#DFB7FF',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
    },
    package: 'com.gandalfio.significantotherapp',
    googleServicesFile: './google-services.json',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION'],
  },
  androidStatusBar: {
    backgroundColor: '#000000',
    barStyle: 'dark-content',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    '@react-native-firebase/app',
    [
      'expo-image-picker',
      {
        photosPermission: 'The app accesses your photos to upload images.',
      },
    ],
    '@react-native-firebase/messaging',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow Significant Other to track your location in the background to show real-time distance between you and your partner.',
        locationAlwaysPermission:
          'Allow Significant Other to track your location in the background to show real-time distance between you and your partner.',
        locationWhenInUsePermission:
          'Allow Significant Other to use your location to show the distance between you and your partner.',
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    '@rnmapbox/maps',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'dd25f76b-ccc2-43b1-aef4-7f494942e3a9',
    },
    // Environment variables accessible via expo-constants
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
  notification: {
    icon: './assets/notification-icon.png',
    color: '#000000',
  },
});
