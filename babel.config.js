module.exports = function (api) {
  const isProduction = api.env('production');
  api.cache.using(() => isProduction);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      './babel/lucide-direct-imports',
      // Logging costs time on device; errors and warnings still get through
      ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};
