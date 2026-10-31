# Cyclo

A private, local-first period, ovulation and fertile-window tracker for **iPhone, Android and the web**,
with an optional **self-hosted sync server**. Independent open-source project; not affiliated with any other tracking app.

- **Works fully offline.** All data is stored on the device. No account is needed.
- **Optional sync.** Point the app at your own server to sync phone ⇄ web. Last-write-wins per day with tombstones.
- **Tracking:** flow, 12 symptoms, 8 moods, basal body temperature (°C/°F), tags (ovulation test, sex, medication…), notes.
- **Predictions:** next period (with ± range when cycles are irregular), ovulation, 7-day fertile window, cycle phase.
- **Insights:** average cycle/period, regularity, cycle-length history, most-logged symptoms and moods.
- **Your data:** JSON export, a plain-text summary to share with a doctor, delete-on-device and delete-account.

> Predictions are estimates for personal awareness. Not a medical device; not for contraception.

## Layout

| Path | What |
|---|---|
| `packages/core` | Shared TypeScript: prediction engine, date helpers, sync merge rules (tested) |
| `server` | Fastify + SQLite: register/login, `/api/sync`, serves the web build (tested) |
| `app` | Expo / React Native app for iOS, Android and web |

## Run the server + web app (Docker)

```sh
docker compose up -d --build
# open http://localhost:8787  (put it behind HTTPS for anything beyond your LAN)
```
Data lives in the `cyclo-data` volume. After creating your account(s) set `ALLOW_REGISTRATION: "false"`.

Without Docker: `npm install && npm run web:build && npm run server` (Node 22).

## Run the mobile apps

```sh
npm install
cd app
npx expo start            # scan the QR code with Expo Go on iPhone or Android
```
Standalone builds: `npx eas build -p android` / `-p ios` (iOS needs an Apple developer account), or
`npx expo run:android` / `run:ios` locally (Android SDK / Xcode required).
In the app: **Settings → Cloud sync → enter your server URL → create account / sign in.**
On a phone use your server's LAN IP or public HTTPS URL (not `localhost`).
A new device can restore by tapping **"I already use a Cyclo server"** on the first screen.

## Develop

```sh
npm test            # core + server tests
npm run typecheck
```

## Privacy and security notes

- Passwords are hashed with scrypt; session tokens are stored hashed; auth and sync routes are rate-limited.
- Sync data is stored **unencrypted at rest on your server** (it is your server). Use full-disk encryption and HTTPS.
  End-to-end encrypted sync is a natural next step.
- Not yet implemented: push reminders, pregnancy mode, password reset, multi-factor auth.
