const { withGradleProperties } = require('expo/config-plugins');

// Build speed settings. The generated gradle.properties gives Gradle a 2GB heap, which is tight with
// this many native modules (Skia, Mapbox, Reanimated, Firebase...) and makes
// builds spend time garbage collecting. android/ is regenerated on every EAS
// build, so the setting has to come from a config plugin.
const JVM_ARGS = '-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError';

const setProperty = (properties, key, value) => {
  const existing = properties.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
  } else {
    properties.push({ type: 'property', key, value });
  }
};

module.exports = function withGradleBuildSettings(config) {
  return withGradleProperties(config, (config) => {
    setProperty(config.modResults, 'org.gradle.jvmargs', JVM_ARGS);
    // Reuse task outputs between tasks and modules within a build
    setProperty(config.modResults, 'org.gradle.caching', 'true');
    // Native code is compiled once per CPU architecture; build profiles in
    // eas.json list only the ones their builds need
    if (process.env.ANDROID_ARCHITECTURES) {
      setProperty(config.modResults, 'reactNativeArchitectures', process.env.ANDROID_ARCHITECTURES);
    }
    return config;
  });
};
