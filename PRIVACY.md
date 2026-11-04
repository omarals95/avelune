# Privacy policy

*Avelune · last updated 4 November 2026 (version 2026-11-04)*

Avelune is built so that your health data stays yours. See also the [terms of use](TERMS.md).

## The short version

Avelune collects nothing. There is no account to create, no analytics, no advertising, no tracking and no third-party SDKs that report on you. The project has no servers that receive your data.

## What is stored, and where

Everything you log (periods, symptoms, moods, temperatures, notes, medication, pregnancy dates and health data you import) is stored only on your device. On iPhone and Android, encryption keys are kept in the system keychain or keystore. In a web browser, data is kept in that browser’s storage, so use the web app only on devices you trust.

## Optional features that use the network

Encrypted sync: if you connect a server, your records are encrypted on your device with your passphrase before upload. The server stores only ciphertext. It can see your email, when you sync, how many records you have and when each changed, but not what they contain or which days you logged.

Partner sharing: an encrypted summary that you control is stored on your server. Only someone with your invite code can read it. You choose what is included and can stop sharing at any time.

Health connections: data is read on your device from Apple Health or Health Connect. If you sign in to Fitbit or Oura, your device talks to them directly. Nothing passes through the Avelune project.

Backups and exports: files are saved where you choose. Backups are encrypted with your passphrase. Exports (CSV, JSON, PDF) are not encrypted, so store and share them carefully.

## Your control

You can export everything (Settings → Your data) or delete it from this device, and delete your server account and synced data, at any time. Uninstalling the app removes its local data.

If you use a server run by someone else, that operator can see the limited information described above, and their own privacy policy applies too.

## Questions

Open an issue at https://github.com/omarals95/avelune/issues. Because the code is open source, anyone can check exactly what Avelune does with data.

---

This text is generated from [`app/src/legal.ts`](app/src/legal.ts), the same source the app shows on first use and in Settings → About Avelune.
