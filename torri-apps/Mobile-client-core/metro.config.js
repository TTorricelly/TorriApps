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
    // Add support for SVG files
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx', 'svg'],
  },
  transformer: {
    // Support for SVG files
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
