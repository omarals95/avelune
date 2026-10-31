# Cyclo

A private, local-first period, ovulation and fertile-window tracker for **iPhone, Android and the web**,
with an optional **self-hosted sync server**. Independent open-source project; not affiliated with any other tracking app.

- **Works fully offline.** All data is stored on the device. No account is needed.
- **Optional end-to-end encrypted sync.** Point the app at your own server to sync phone ⇄ web. Everything is encrypted on-device before upload; the server stores only ciphertext. Last-write-wins per day with encrypted tombstones.
- **Reminders (iOS/Android).** Period coming up, fertile window starts, daily check-in. Scheduled locally on the device from your own data; no push service. "Discreet wording" (default) keeps lock-screen text generic.
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

## Encryption design

```
passphrase ──scrypt(N=2^14,r=8,p=1, public salt)──▶ master ──HKDF──▶ encKey  (XChaCha20-Poly1305)
                                                           └─HKDF──▶ idKey   (HMAC-SHA256)
```
- You choose an **encryption passphrase** (≥10 chars, must differ from your account password). It never leaves the device.
- Each record (a day log, the settings, or a deletion) is encrypted with a fresh random nonce. The ciphertext is bound to its record id (AEAD associated data), and the real timestamp is repeated inside the ciphertext, so a malicious server cannot swap, relabel or silently alter records.
- Record ids are `HMAC(idKey, "day:2026-10-01")`, so the server cannot see which dates you logged.
- The server stores the public salt + KDF cost + an encrypted key-check blob (set once) so a new device can verify the passphrase before syncing. Wrong passphrase → rejected.
- The derived key is kept in the iOS Keychain / Android Keystore (`expo-secure-store`); on web it falls back to `localStorage`.
- Crypto uses audited pure-JS `@noble/ciphers` and `@noble/hashes`, so it behaves identically on web, iOS and Android.

**What the server can still see:** your email, when you sync, how many records you have, and when each was last edited (needed for last-write-wins). It cannot see content or which days you logged.
**Not protected:** a compromised device or browser; the web build's key in `localStorage` is readable by any script on that origin, so only use the web app on devices you trust.
**Recovery:** there is none by design. Lose the passphrase and synced data is unreadable (local data on your devices is unaffected; export JSON regularly).

## Privacy and security notes

- Account passwords are hashed with scrypt; session tokens are stored hashed; auth and sync routes are rate-limited.
- Use HTTPS in front of the server for anything beyond your LAN.
- Not yet implemented: pregnancy mode, password reset, multi-factor auth, passphrase change/key rotation.
