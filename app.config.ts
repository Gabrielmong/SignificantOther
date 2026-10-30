import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

import { version } from './package.json';

const EAS_PROJECT_ID = 'dd25f76b-ccc2-43b1-aef4-7f494942e3a9';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Significant Other',
  slug: 'SignificantOtherApp',
  // Bump it in package.json only; the build number (versionCode) is managed
  // by EAS (see eas.json appVersionSource)
  version,
  // Fingerprint of the native code: `eas update` only reaches builds whose
  // native side matches, so JS-only changes ship without a new build
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  // `npx expo run:android` downloads a matching build from EAS instead of
  // compiling, when one exists for the current fingerprint
  buildCacheProvider: 'eas',
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
      'expo-audio',
      {
        microphonePermission:
          'Allow Significant Other to use your microphone to record voice notes for your partner.',
      },
    ],
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
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'PartnerStatus',
            label: 'Partner Status',
            description: "Shows your partner's flower, message, and feeling",
            minWidth: '250dp',
            minHeight: '80dp',
            targetCellWidth: 5,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'PartnerStatusCompact',
            label: 'Partner Status (Compact)',
            description: "A single-line glance at your partner's name and feeling",
            minWidth: '250dp',
            minHeight: '50dp',
            targetCellWidth: 5,
            targetCellHeight: 1,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    './plugins/withFcmManifestFix',
    './plugins/withGradleBuildSettings',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: EAS_PROJECT_ID,
    },
    // Environment variables accessible via expo-constants
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
  notification: {
    icon: './assets/notification-icon.png',
    color: '#000000',
  },
});
