const { defineConfig } = require('eslint/config');
const universeNative = require('eslint-config-universe/flat/native');

// ESLint 9 flat config. Expo's universe preset already bundles Prettier
// (formatting differences show as warnings, using .prettierrc).
module.exports = defineConfig([
  {
    ignores: ['android/**', 'ios/**', '.expo/**', 'dist/**', 'docs/**', 'graphify-out/**'],
  },
  universeNative,
  {
    rules: {
      // universe only enables rules-of-hooks; the codebase already relies on
      // this one (it has eslint-disable comments for it)
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
