const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // Add the monorepo root to watch for changes in shared packages
    path.resolve(__dirname, '../../'),
  ],
  resolver: {
    // Support for yarn workspaces
    unstable_enablePackageExports: true,
    // Add support for CSS files (nativewind)
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'css'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
  },
  transformer: {
    // Add CSS support for nativewind
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
