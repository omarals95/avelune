// Builds the GitHub Pages site into _site/: a landing page, the privacy policy and terms (English and Arabic,
// generated from app/src/legal.ts and the Arabic dictionary, so they always match the app), and the web demo
// (copied from app/dist when it exists).
// Usage: node scripts/build-site.mjs   (env RELEASE_JSON: output of `gh release view --json tagName,assets`, optional)
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, '_site');
const REPO = 'https://github.com/omarals95/avelune';

const load = (file) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}));
  return m.exports;
};
const L = load('app/src/legal.ts');
const AR = {};
for (const f of fs.readdirSync(path.join(root, 'app/src/i18n/ar')).filter((x) => x.endsWith('.ts') && x !== 'index.ts')) {
  for (const v of Object.values(load(`app/src/i18n/ar/${f}`))) if (v && typeof v === 'object') Object.assign(AR, v);
}
const tAr = (s) => AR[s] ?? s;
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const arDate = (iso) => `${+iso.slice(8)} ${AR_MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

// Latest release downloads (falls back to the releases page).
let rel = null;
try { rel = process.env.RELEASE_JSON ? JSON.parse(process.env.RELEASE_JSON) : null; } catch { rel = null; }
const asset = (re) => rel?.assets?.find((a) => re.test(a.name))?.url ?? null;
const RELEASES = `${REPO}/releases/latest`;
const APK = asset(/android\.apk$/) ?? RELEASES;
const IPA = asset(/ios-unsigned\.ipa$/) ?? RELEASES;
const VERSION = rel?.tagName ?? '';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const linkify = (s) => esc(s).replace(/https?:\/\/[^\s)]+[^\s).,]/g, (u) => `<a href="${u}">${u}</a>`);

const C = {
  en: {
    dir: 'ltr', other: { code: 'ar', label: 'العربية', href: 'ar/' },
    title: 'Avelune: free, private period tracker',
    desc: 'A free, private and open-source period, ovulation and pregnancy tracker for Android, iPhone and the web. No account, no ads, no tracking. In English and Arabic.',
    nav: ['Features', 'Privacy', 'Download'],
    h1: 'Your rhythm.<br>Your space.',
    lead: 'A free, private and open-source tracker for your period, ovulation, fertile window and pregnancy. No account, no ads, no tracking.',
    demo: 'Try the web demo', android: 'Download for Android', iphone: 'iPhone',
    demoNote: 'The demo runs in your browser with made-up sample data. Nothing is sent anywhere.',
    noteT: 'A personal open-source project, not a paid product.',
    note: 'Avelune is not a company. There are no subscriptions, ads, in-app purchases or premium features, and there never will be. It exists because understanding your own body should not depend on paying for a subscription.',
    featT: 'Everything in one calm place', featS: 'Built for real lives: irregular cycles, PCOS, perimenopause, contraception, after birth or after a loss.',
    feats: [
      ['#A84461', 'Understand your cycle', 'A flower that changes with your cycle, honest forecast ranges with a plain explanation, and a calendar of periods, fertile days and ovulation.'],
      ['#6E8B6A', 'Log what matters', 'Flow, symptoms, mood, sex, discharge, tests, pill and medication, water, temperature, weight, sleep and notes.'],
      ['#8C6BB1', 'Graphs and ovulation', 'Cycle history, temperature with automatic ovulation detection, weight, activity, water and sleep, and a PDF report for your doctor.'],
      ['#D08A5C', 'Pregnancy mode', 'Month-by-month illustrations, week-by-week notes and your due date.'],
      ['#4E7FA6', 'Health connections', 'Apple Health, Health Connect (Samsung Health, Fitbit, Google) or your Fitbit account. Health data stays on your phone.'],
      ['#A84461', 'Partner sharing and Arabic', 'A view-only, end-to-end encrypted view for one person. Fully translated into Arabic with a right-to-left layout.'],
    ],
    privT: 'Private by design', privS: 'Your health data is yours. Avelune is built so it stays that way.',
    priv: ['No account: your data is stored on your phone', 'No ads, analytics or trackers', 'App lock and screenshot blocking', 'Optional end-to-end encrypted sync to a server you host', 'Encrypted backups; export to Excel, CSV or JSON any time', 'Open source: anyone can check what the app does'],
    shotsT: 'A look inside',
    shots: [['today', 'Today'], ['calendar', 'Calendar'], ['log', 'Daily log'], ['insights', 'Insights'], ['pregnancy', 'Pregnancy'], ['ar-today', 'In Arabic']],
    dlT: 'Download', dlS: VERSION ? `Latest release: ${VERSION}.` : 'Get the latest release.',
    dl: [
      ['Android', 'Download the APK on your phone and open it. Allow installing unknown apps if asked. Google Play is coming soon.', APK, 'Download APK'],
      ['iPhone', 'Not on the App Store yet. Install the .ipa with a tool that signs it with your Apple ID, such as Sideloadly or AltStore.', IPA, 'Download .ipa'],
      ['Web', 'Try Avelune in your browser with sample data. Your data stays in this browser.', 'app/?demo', 'Open the demo'],
      ['Source code', 'Read the code, report a problem, translate, or run your own sync server.', REPO, 'View on GitHub'],
    ],
    medical: 'Avelune is not a medical device. Do not use it as contraception or to diagnose anything. Predictions are estimates.',
    privacy: 'Privacy policy', terms: 'Terms of use', license: 'MIT License', updated: (d, v) => `Last updated ${d} (version ${v})`,
    seeAlso: 'The same text is shown in the app on first use and in Settings → About Avelune.', home: 'Avelune home',
    shotsPath: (n) => `img/${n}.webp`,
  },
  ar: {
    dir: 'rtl', other: { code: 'en', label: 'English', href: '../' },
    title: 'Avelune: متابعة مجانية وخاصة للدورة الشهرية',
    desc: 'تطبيق مجاني وخاص ومفتوح المصدر لمتابعة الدورة الشهرية والإباضة والحمل على Android وiPhone والويب. بلا حساب ولا إعلانات ولا تتبّع. بالعربية والإنجليزية.',
    nav: ['الميزات', 'الخصوصية', 'التنزيل'],
    h1: 'إيقاعكِ.<br>مساحتكِ.',
    lead: 'تطبيق مجاني وخاص ومفتوح المصدر لمتابعة دورتكِ الشهرية والإباضة وفترة الخصوبة والحمل. بلا حساب ولا إعلانات ولا تتبّع.',
    demo: 'جرّبي النسخة التجريبية', android: 'التنزيل لأجهزة Android', iphone: 'iPhone',
    demoNote: 'تعمل النسخة التجريبية في متصفحكِ ببيانات تجريبية غير حقيقية. لا يُرسل أي شيء إلى أي مكان.',
    noteT: 'مشروع شخصي مفتوح المصدر، وليس منتجًا مدفوعًا.',
    note: 'Avelune ليس شركة. لا اشتراكات ولا إعلانات ولا مشتريات داخل التطبيق ولا ميزات مدفوعة، ولن توجد أبدًا. وُجد لأن فهمكِ لجسدكِ لا ينبغي أن يتوقف على دفع اشتراك.',
    featT: 'كل ما تحتاجينه في مكان هادئ واحد', featS: 'مصمم لحياة حقيقية: الدورة غير المنتظمة، وتكيّس المبايض، وما قبل انقطاع الطمث، ووسائل منع الحمل، وما بعد الولادة أو فقدان الحمل.',
    feats: [
      ['#A84461', 'افهمي دورتكِ', 'زهرة تتغيّر مع دورتكِ، وتوقعات تظهر كنطاق صادق مع شرح واضح، وتقويم للدورة وأيام الخصوبة والإباضة.'],
      ['#6E8B6A', 'سجّلي ما يهمّكِ', 'التدفق والأعراض والمزاج والعلاقة الحميمة والإفرازات والاختبارات والحبوب والأدوية والماء والحرارة والوزن والنوم والملاحظات.'],
      ['#8C6BB1', 'رسوم بيانية والإباضة', 'تاريخ الدورة، والحرارة مع اكتشاف تلقائي للإباضة، والوزن والنشاط والماء والنوم، وتقرير PDF لطبيبكِ.'],
      ['#D08A5C', 'وضع الحمل', 'رسومات لكل شهر، وملاحظات لكل أسبوع، وموعد الولادة المتوقع.'],
      ['#4E7FA6', 'الربط بالخدمات الصحية', 'Apple Health أو Health Connect ‏(Samsung Health وFitbit وGoogle) أو حسابكِ في Fitbit. تبقى بياناتكِ الصحية على هاتفكِ.'],
      ['#A84461', 'المشاركة مع الشريك والعربية', 'عرض للقراءة فقط ومشفّر تشفيرًا تامًا لشخص واحد. ترجمة عربية كاملة بتصميم من اليمين إلى اليسار.'],
    ],
    privT: 'الخصوصية في أساس تصميمه', privS: 'بياناتكِ الصحية ملككِ، وصُمّم Avelune لتبقى كذلك.',
    priv: ['لا حساب: بياناتكِ محفوظة على هاتفكِ', 'لا إعلانات ولا تحليلات ولا أدوات تتبّع', 'قفل التطبيق ومنع لقطات الشاشة', 'مزامنة اختيارية مشفّرة تشفيرًا تامًا مع خادم تستضيفينه', 'نسخ احتياطية مشفّرة، وتصدير إلى Excel أو CSV أو JSON في أي وقت', 'مفتوح المصدر: يمكن لأي شخص التحقق مما يفعله التطبيق'],
    shotsT: 'نظرة من الداخل',
    shots: [['ar-today', 'اليوم'], ['ar-calendar', 'التقويم'], ['ar-log', 'السجل اليومي'], ['ar-insights', 'رؤى'], ['ar-pregnancy', 'الحمل'], ['ar-language', 'اللغة']],
    dlT: 'التنزيل', dlS: VERSION ? `أحدث إصدار: ${VERSION}.` : 'احصلي على أحدث إصدار.',
    dl: [
      ['Android', 'نزّلي ملف APK على هاتفكِ وافتحيه، واسمحي بتثبيت التطبيقات غير المعروفة إن طُلب منكِ. قريبًا على Google Play.', APK, 'تنزيل APK'],
      ['iPhone', 'غير متوفر على App Store بعد. ثبّتي ملف ‎.ipa بأداة توقّعه بحساب Apple الخاص بكِ، مثل Sideloadly أو AltStore.', IPA, 'تنزيل ‎.ipa'],
      ['الويب', 'جرّبي Avelune في متصفحكِ ببيانات تجريبية. تبقى بياناتكِ في هذا المتصفح.', '../app/?demo', 'فتح النسخة التجريبية'],
      ['الشيفرة المصدرية', 'اطّلعي على الشيفرة، أو أبلغي عن مشكلة، أو ساعدي في الترجمة، أو شغّلي خادم المزامنة الخاص بكِ.', REPO, 'على GitHub'],
    ],
    medical: 'Avelune ليس جهازًا طبيًا. لا تستخدميه وسيلةً لمنع الحمل أو لتشخيص أي حالة. التوقعات تقديرية.',
    privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام', license: 'رخصة MIT', updated: (d, v) => `آخر تحديث ${d} (الإصدار ${v})`,
    seeAlso: 'يظهر النص نفسه في التطبيق عند أول استخدام وفي الإعدادات ← عن Avelune.', home: 'الصفحة الرئيسية',
    shotsPath: (n) => `../img/${n}.webp`,
  },
};

const page = (lang, { title, desc, body, base, canonical }) => `<!doctype html>
<html lang="${lang}" dir="${C[lang].dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${base}img/og.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#482F49">
<link rel="icon" href="${base}img/icon.png">
<link rel="alternate" hreflang="en" href="https://omarals95.github.io/avelune/${canonical}">
<link rel="alternate" hreflang="ar" href="https://omarals95.github.io/avelune/ar/${canonical}">
<link rel="stylesheet" href="${base}style.css">
</head>
<body>
${body}
</body>
</html>
`;

const header = (lang, base, home) => {
  const c = C[lang];
  const otherHref = lang === 'en' ? `${base}ar/${home}` : `${base}${home}`;
  return `<header><div class="wrap">
  <a class="brand" href="${lang === 'en' ? base : `${base}ar/`}"><img src="${base}img/symbol.png" alt="">Avelune</a>
  <nav>
    <a class="hide-sm" href="${lang === 'en' ? base : `${base}ar/`}#features">${c.nav[0]}</a>
    <a class="hide-sm" href="${lang === 'en' ? base : `${base}ar/`}#privacy">${c.nav[1]}</a>
    <a href="${lang === 'en' ? base : `${base}ar/`}#download">${c.nav[2]}</a>
    <a class="lang" href="${otherHref}" hreflang="${c.other.code}" lang="${c.other.code}">${c.other.label}</a>
  </nav>
</div></header>`;
};

const footer = (lang, base) => {
  const c = C[lang]; const p = lang === 'en' ? base : `${base}ar/`;
  return `<footer><div class="wrap">
  <span>Avelune</span>
  <a href="${p}privacy/">${c.privacy}</a>
  <a href="${p}terms/">${c.terms}</a>
  <a href="${REPO}">GitHub</a>
  <a href="${REPO}/blob/main/LICENSE">${c.license}</a>
</div></footer>`;
};

function landing(lang) {
  const c = C[lang]; const base = lang === 'en' ? '' : '../';
  const demo = lang === 'en' ? 'app/?demo' : '../app/?demo';
  const body = `${header(lang, base, '')}
<main>
<section class="hero"><div class="wrap">
  <div>
    <h1>${c.h1}</h1>
    <p class="lead">${esc(c.lead)}</p>
    <div class="buttons">
      <a class="btn primary" href="${demo}">${c.demo}</a>
      <a class="btn" href="${APK}">${c.android}</a>
      <a class="btn" href="#download">${c.iphone}</a>
    </div>
    <p class="small">${esc(c.demoNote)}</p>
  </div>
  <img class="phone" src="${base}img/${lang === 'en' ? 'today' : 'ar-today'}.webp" alt="" width="390" height="844">
</div></section>

<section><div class="wrap"><div class="note"><strong>${esc(c.noteT)}</strong> ${esc(c.note)}</div></div></section>

<section id="features"><div class="wrap">
  <h2>${esc(c.featT)}</h2><p class="sub">${esc(c.featS)}</p>
  <div class="grid">${c.feats.map(([col, h, p]) => `<div class="card"><h3><span class="dot" style="background:${col}"></span>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
</div></section>

<section><div class="wrap">
  <h2>${esc(c.shotsT)}</h2>
  <div class="shots">${c.shots.map(([n, cap]) => `<figure><img src="${base}img/${n}.webp" alt="${esc(cap)}" loading="lazy" width="390" height="844"><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>
</div></section>

<section id="privacy"><div class="wrap">
  <h2>${esc(c.privT)}</h2><p class="sub">${esc(c.privS)}</p>
  <ul class="checks">${c.priv.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <p class="small"><a href="privacy/">${c.privacy}</a> · <a href="terms/">${c.terms}</a></p>
</div></section>

<section id="download"><div class="wrap">
  <h2>${esc(c.dlT)}</h2><p class="sub">${esc(c.dlS)}</p>
  <div class="dl">${c.dl.map(([h, p, href, b]) => `<div class="card"><h3>${esc(h)}</h3><p>${esc(p)}</p><a class="btn" href="${href}">${esc(b)}</a></div>`).join('')}</div>
  <p class="small">${esc(c.medical)}</p>
</div></section>
</main>
${footer(lang, base)}`;
  return page(lang, { title: c.title, desc: c.desc, body, base, canonical: '' });
}

function legal(lang, kind) {
  const c = C[lang]; const base = lang === 'en' ? '../' : '../../';
  const sections = kind === 'privacy' ? L.PRIVACY : L.TERMS;
  const tr = lang === 'en' ? (s) => s : tAr;
  const title = kind === 'privacy' ? c.privacy : c.terms;
  const date = lang === 'en' ? L.TERMS_DATE : arDate(L.TERMS_VERSION);
  const body = `${header(lang, base, `${kind}/`)}
<main class="wrap doc">
  <h1>${esc(title)}</h1>
  <p class="meta">Avelune · ${esc(c.updated(date, L.TERMS_VERSION))}</p>
  ${sections.map((s) => `<h2>${esc(tr(s.title))}</h2>\n  ${s.body.map((p) => `<p>${linkify(tr(p))}</p>`).join('\n  ')}`).join('\n  ')}
  <p class="meta">${esc(c.seeAlso)}${lang === 'ar' ? ` ${esc(tAr('Health guidance, the terms and the privacy policy are translated for convenience. If anything differs, the English text applies.'))}` : ''}</p>
</main>
${footer(lang, base)}`;
  return page(lang, { title: `${title} · Avelune`, desc: c.desc, body, base, canonical: `${kind}/` });
}

// ---- write ----
fs.rmSync(out, { recursive: true, force: true });
const write = (rel, s) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copy = (from, rel) => { const p = path.join(out, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(path.join(root, from), p); };

write('index.html', landing('en'));
write('ar/index.html', landing('ar'));
for (const k of ['privacy', 'terms']) { write(`${k}/index.html`, legal('en', k)); write(`ar/${k}/index.html`, legal('ar', k)); }
write('.nojekyll', '');
copy('site/style.css', 'style.css');

const fonts = {
  'playfair-display/500Medium/PlayfairDisplay_500Medium.ttf': 1, 'nunito-sans/400Regular/NunitoSans_400Regular.ttf': 1, 'nunito-sans/700Bold/NunitoSans_700Bold.ttf': 1,
  'ibm-plex-sans-arabic/400Regular/IBMPlexSansArabic_400Regular.ttf': 1, 'ibm-plex-sans-arabic/600SemiBold/IBMPlexSansArabic_600SemiBold.ttf': 1,
  'noto-naskh-arabic/600SemiBold/NotoNaskhArabic_600SemiBold.ttf': 1,
};
for (const f of Object.keys(fonts)) copy(`node_modules/@expo-google-fonts/${f}`, `fonts/${path.basename(f)}`);
for (const f of fs.readdirSync(path.join(root, 'docs/screenshots'))) copy(`docs/screenshots/${f}`, `img/${f}`);
copy('app/assets/symbol.png', 'img/symbol.png');
copy('app/assets/icon.png', 'img/icon.png');
copy('app/assets/petals/card-light.webp', 'img/petals.webp');
copy('fastlane/metadata/android/en-US/images/featureGraphic.png', 'img/og.png');

const dist = path.join(root, 'app/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) fs.cpSync(dist, path.join(out, 'app'), { recursive: true });
else console.warn('app/dist not found: the site is built without the web demo (run the web build first).');

console.log(`Built ${path.relative(root, out)}/ (${VERSION || 'no release info'})`);
