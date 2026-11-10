// Signs Android release builds with your own upload key when the AVELUNE_UPLOAD_* environment variables are set
// (Google Play builds), and keeps the default debug signing otherwise (the GitHub APK workflow).
// AVELUNE_VERSION_CODE overrides android.versionCode, so every Play upload can use a higher number.
const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING = `
        release {
            if (System.getenv("AVELUNE_UPLOAD_STORE_FILE")) {
                storeFile file(System.getenv("AVELUNE_UPLOAD_STORE_FILE"))
                storePassword System.getenv("AVELUNE_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("AVELUNE_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("AVELUNE_UPLOAD_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('AVELUNE_UPLOAD_STORE_FILE')) return cfg;
    const fail = (what) => { throw new Error(`withReleaseSigning: could not find ${what} in android/app/build.gradle`); };

    // 1. A "release" signing config next to the debug one.
    if (!/signingConfigs\s*\{/.test(g)) fail('signingConfigs');
    g = g.replace(/signingConfigs\s*\{/, (m) => m + SIGNING);

    // 2. Release builds use it when the upload key is present.
    const rel = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!rel.test(g)) fail('the release build type signing line');
    g = g.replace(rel, '$1signingConfig System.getenv("AVELUNE_UPLOAD_STORE_FILE") ? signingConfigs.release : signingConfigs.debug');

    // 3. Version code override.
    if (!/versionCode \d+/.test(g)) fail('versionCode');
    g = g.replace(/versionCode (\d+)/, 'versionCode((System.getenv("AVELUNE_VERSION_CODE") ?: "$1").toInteger())');

    cfg.modResults.contents = g;
    return cfg;
  });
};
