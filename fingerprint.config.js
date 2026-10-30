const { SourceSkips } = require('expo/fingerprint');

// The fingerprint is the runtime version: an `eas update` only reaches builds
// with the same one, so it should change only with the native code. Left out:
// - the app version, so bumping it doesn't cut builds off from updates
// - package.json scripts, which never reach the app
// - the config's `extra` section (values from .env, read through
//   expo-constants), which updates carry themselves; a local .env that differs
//   from the EAS environment would otherwise make every update miss
/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips:
    SourceSkips.ExpoConfigVersions |
    SourceSkips.PackageJsonScriptsAll |
    SourceSkips.ExpoConfigExtraSection,
};
