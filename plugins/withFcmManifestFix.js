const { withAndroidManifest } = require('expo/config-plugins');

// expo-notifications injects a `com.google.firebase.messaging.default_notification_color`
// meta-data tag (from this config's top-level `notification.color`), which collides
// with @react-native-firebase/messaging's own default for the same key — Android's
// manifest merger refuses to pick a winner without an explicit `tools:replace`.
// This plugin adds that override to our own app's copy of the tag.
const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';

module.exports = function withFcmManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application?.['meta-data']) return config;

    const metaData = application['meta-data'].find(
      (item) => item.$?.['android:name'] === META_DATA_NAME,
    );

    if (metaData) {
      metaData.$['tools:replace'] = 'android:resource';
    }

    return config;
  });
};
