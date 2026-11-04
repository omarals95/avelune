// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Bundle the downloadable import template (Settings → Your data → Import from file).
config.resolver.assetExts.push('xlsx');

module.exports = config;
