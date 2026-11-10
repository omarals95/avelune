// Health Connect opens the app with a "show permissions rationale" intent (Android 13 and earlier) or
// VIEW_PERMISSION_USAGE (Android 14+) when someone taps "privacy policy" for Avelune in Health Connect.
// Google Play requires the app to show its privacy policy then. This turns those intents into an
// avelune://privacy link, which the app answers by opening Settings → About → Privacy policy.
const { withMainActivity } = require('@expo/config-plugins');

const HELPER = `
  private fun aveluneShowPrivacy(i: android.content.Intent?) {
    val a = i?.action ?: return
    if (a == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" || a == "android.intent.action.VIEW_PERMISSION_USAGE") {
      i.action = android.content.Intent.ACTION_VIEW
      i.data = android.net.Uri.parse("avelune://privacy")
    }
  }

  override fun onNewIntent(intent: android.content.Intent) {
    aveluneShowPrivacy(intent)
    super.onNewIntent(intent)
  }
`;

module.exports = function withHealthPrivacyLink(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('aveluneShowPrivacy')) return cfg;
    if (cfg.modResults.language !== 'kt') throw new Error('withHealthPrivacyLink: expected a Kotlin MainActivity');
    if (/override fun onNewIntent/.test(src)) throw new Error('withHealthPrivacyLink: MainActivity already overrides onNewIntent');
    const cls = /class MainActivity\s*:\s*ReactActivity\(\)\s*\{/;
    const create = /(\n\s*)super\.onCreate\(/;
    if (!cls.test(src) || !create.test(src)) throw new Error('withHealthPrivacyLink: unexpected MainActivity layout');
    src = src.replace(create, '$1aveluneShowPrivacy(intent)$1super.onCreate(');
    src = src.replace(cls, (m) => m + '\n' + HELPER);
    cfg.modResults.contents = src;
    return cfg;
  });
};
