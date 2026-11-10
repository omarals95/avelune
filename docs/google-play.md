# Publishing Avelune on Google Play

A checklist from zero to a public Play Store listing. Google's rules change from time to time, so trust what Play Console asks for when it differs from this page.

What is already in the repository:

| Piece | Where |
|---|---|
| Signed App Bundle (.aab) build | Actions → **Google Play bundle** (`.github/workflows/android-play.yml`) |
| Release signing and version code | `app/plugins/withReleaseSigning.js` |
| Health Connect privacy-policy link (required by Google) | `app/plugins/withHealthPrivacyLink.js` + `avelune://privacy` in the app |
| Store texts, icon, feature graphic, screenshots (English + Arabic) | `fastlane/metadata/android/en-US/` and `fastlane/metadata/android/ar/` |
| Privacy policy | `PRIVACY.md` and <https://omarals95.github.io/avelune/privacy/> |

## 1. Create the developer account

1. Sign up at <https://play.google.com/console/signup> (one-time fee of US$25).
2. Choose a **personal** account unless you have a registered organisation.
3. Complete identity verification. Your developer name and contact email are shown on the store page; use an address you are happy to make public.

> **New personal accounts must run a closed test first.** Google requires at least **12 testers** who stay opted in for **14 days in a row** before you can apply for production. Start recruiting early: friends, family, and the communities you plan to ask for feedback.

## 2. Create your upload key (once, on your own computer)

Google signs the app for users ("Play App Signing"). You sign each upload with your own **upload key**. Keep it and its passwords somewhere safe, such as a password manager. If you lose it, Google can reset it, but that takes a few days.

You need Java's `keytool` (it comes with any JDK, or with Android Studio):

```sh
keytool -genkeypair -v -keystore avelune-upload.jks -alias upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Avelune"
```

Then base64-encode it so it can be stored as a GitHub secret:

```sh
# macOS
base64 -i avelune-upload.jks | pbcopy
# Linux
base64 -w0 avelune-upload.jks
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("avelune-upload.jks")) | Set-Clipboard
```

Never commit the `.jks` file or paste it anywhere public.

## 3. Add the repository secrets

On GitHub: **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | the base64 text from step 2 |
| `ANDROID_UPLOAD_STORE_PASSWORD` | the keystore password |
| `ANDROID_UPLOAD_KEY_ALIAS` | `upload` (or the alias you chose) |
| `ANDROID_UPLOAD_KEY_PASSWORD` | the key password (the same as the keystore password unless you set another) |

## 4. Build the App Bundle

1. Actions → **Google Play bundle** → Run workflow.
2. Leave *Version code* empty: it uses 100 + the workflow's run number, so every run is higher than the one before. Every upload to Play needs a higher version code than the last one.
3. When it finishes, download **avelune-play-aab** from the run's page and unzip it: you get `Avelune-0.1.0-play-<code>.aab`.

The run stops early with a clear message if a secret is missing, and checks that the bundle is not signed with the debug key.

The GitHub APK (Actions → Android APK, and the GitHub releases) stays signed with the debug key. Android cannot update one with the other, so anyone moving from the GitHub APK to the Play version must **export their data first** (Settings → Your data), uninstall, install from Play, then import.

## 5. Create the app in Play Console

1. **Create app**: name *Avelune: Period Tracker*, default language **English (United States)**, App, Free.
2. Accept the declarations (developer policies, US export laws).

## 6. Store listing

*Grow → Store presence → Main store listing*. Everything is in `fastlane/metadata/android/en-US/`:

| Field | File |
|---|---|
| App name (30) | `title.txt` |
| Short description (80) | `short_description.txt` |
| Full description (4000) | `full_description.txt` |
| App icon 512×512 | `images/icon.png` |
| Feature graphic 1024×500 | `images/featureGraphic.png` |
| Phone screenshots 1080×1920 | `images/phoneScreenshots/` (upload in order 1–7) |

Then **Manage translations → Add your own translation → Arabic (ar)** and use the files in `fastlane/metadata/android/ar/` (Arabic text, feature graphic and right-to-left screenshots).

- **Category:** Health & Fitness. **Tags:** e.g. *period tracker*, *women's health*.
- **Contact details:** email (required); website `https://omarals95.github.io/avelune/`.

## 7. App content (Policy → App content)

Answer every section truthfully; these are the facts about Avelune to answer with.

- **Privacy policy URL:** `https://omarals95.github.io/avelune/privacy/` (from the Website workflow; `https://github.com/omarals95/avelune/blob/main/PRIVACY.md` also works). The Arabic version is at `https://omarals95.github.io/avelune/ar/privacy/`.
- **Ads:** No ads.
- **App access:** All functionality is available without special access (no login). Partner sharing and sync are optional and need a server the person sets up.
- **Content rating:** fill in the IARC questionnaire. Avelune has no violence, gambling or user-to-user chat. It does let people **log sexual activity in text** (no images), and it has health information. Answer those questions accordingly; the rating is decided by the questionnaire.
- **Target audience and content:** choose 13 and older (do not include under-13 age groups, which would bring in the Families policy). The app is not designed for children.
- **News app:** No. **Government app:** No. **Financial features:** None.
- **Health apps declaration:** select the features that apply: period and cycle tracking, fertility and ovulation, pregnancy, and reading fitness and wellness data. State that Avelune is **not a medical device**.
- **Health Connect permissions:** Play asks you to justify each Health Connect permission. Avelune only **reads**, never writes, and shows the data next to the cycle on the Health page:

  | Permission | Why |
  |---|---|
  | Steps, distance, active calories | Activity cards and trends on the Health page |
  | Sleep | Sleep card and trends; sleep next to cycle phases |
  | Heart rate, resting heart rate | Heart card; resting heart rate across the cycle |
  | Weight | Weight trend next to the cycle |
  | Basal body temperature, body temperature | Confirming ovulation from the temperature rise |
  | Oxygen saturation | SpO₂ card |
  | Hydration | Water card and daily goal |
  | Health data history | Showing trends from before the app was installed (charts go back months) |

  When someone taps Avelune's privacy policy inside Health Connect, the app opens **Settings → About** with the privacy policy expanded (Google requires this; it is handled by `withHealthPrivacyLink.js`). The privacy policy states the Limited Use commitment Google asks for.
- **Data safety:** Avelune has no account, analytics, ads or crash reporting, and keeps data on the phone. Data leaves the phone only when the person turns on an optional feature:
  - **Sync** and **partner sharing** send data to a server the person chooses, **end-to-end encrypted** (the server cannot read it).
  - **Fitbit / Oura** sign-in: the phone talks to those services directly.
  - **Backups** are encrypted files the person saves themselves.

  Read Google's current definitions of "collected" and "shared", and of what end-to-end encrypted data needs to be declared, before you answer. If in doubt, declaring **Health info** and **Fitness info** as *optional*, *encrypted in transit*, and *deletable on request* is the cautious choice. Answer **"No"** to selling data and to using data for advertising.
- **Camera:** used only to scan the partner QR code (runtime permission; no form needed).

## 8. Testing tracks

1. *Testing → Internal testing*: create a release, upload the `.aab`, add yourself as a tester and install it from the opt-in link. Check:
   - Health Connect connects and shows data, and *Health Connect → App permissions → Avelune → privacy policy* opens the privacy policy in the app.
   - Notifications, app lock, Excel export and import, and Arabic.
2. *Testing → Closed testing*: create a track, add your **12+ testers** (email list or a Google Group), upload the `.aab` and roll out. Keep them opted in for 14 days.
3. *Production*: apply for access when Play Console allows it, then create a production release.

Each new version: bump `expo.version` in `app/app.json` when the version name should change, run **Google Play bundle** again, upload the new `.aab`, and add release notes (`fastlane/metadata/android/<language>/changelogs/<versionCode>.txt` holds the text for each version).
