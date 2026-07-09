const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');
config.projectRoot = path.resolve(__dirname);

module.exports = config;