/**
 * The first-use notice, terms of use and privacy policy shown in the app.
 * The same text lives in the repository (README.md, TERMS.md, PRIVACY.md): keep them in sync,
 * and bump TERMS_VERSION when anything material changes so everyone sees the notice again.
 */
export const TERMS_VERSION = '2026-11-04';
export const TERMS_DATE = '4 November 2026';
export const REPO_URL = 'https://github.com/omarals95/avelune';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
/** Voluntary donations (GitHub Sponsors). */
export const DONATE_URL = 'https://github.com/sponsors/omarals95';

export const DONATE = {
  title: 'Help keep Avelune free',
  body: 'Avelune has no ads, subscriptions or paid features. If it helps you and you are able to, a donation helps cover the costs of keeping it going: app store accounts, test devices, hosting, and the time to fix bugs and build new features.',
  note: 'Donating is completely optional and unlocks nothing. Every feature stays free for everyone.',
  button: 'Donate with GitHub Sponsors',
};

export interface LegalSection { title: string; body: string[] }

/** The short points on the welcome notice. */
export const HIGHLIGHTS: { icon: 'heart' | 'lock-outline' | 'stethoscope' | 'github'; title: string; body: string }[] = [
  {
    icon: 'heart',
    title: 'A free, personal open-source project',
    body: 'Avelune is not a company or a paid product. There are no subscriptions, ads, in-app purchases or premium features, and there never will be. Anyone is free to use it.',
  },
  {
    icon: 'lock-outline',
    title: 'Private by design',
    body: 'No account, no analytics and no trackers. Your data stays on this device unless you choose to sync it, encrypted, to a server you trust.',
  },
  {
    icon: 'stethoscope',
    title: 'Not medical advice',
    body: 'Predictions are estimates for personal awareness. Avelune is not a medical device and must not be used as contraception or to diagnose anything.',
  },
  {
    icon: 'github',
    title: 'Help it grow',
    body: 'If you are able to contribute, please do: report a bug, suggest a feature, translate, improve the design or code, or share Avelune with someone who needs it.',
  },
];

export const WHY =
  'Technology today is a necessity for everyone, and understanding your own body should not depend on paying a monthly or yearly subscription. '
  + 'Avelune was created to add real value for people who cannot pay for one, or would rather not.';

export const TERMS: LegalSection[] = [
  {
    title: 'What Avelune is',
    body: [
      'Avelune is a free, personal open-source project released under the MIT License. It is not a paid product and is not run by a company. The official project never charges for the app, shows ads or sells data. If someone asks you to pay for it, that is not this project.',
      'You can support the project with a voluntary donation through GitHub Sponsors. Donations are optional, are not payment for the app, and do not unlock any features or support obligations.',
      'You may use, copy, modify and share it under the terms of the MIT License in the project repository.',
    ],
  },
  {
    title: 'Not a medical device',
    body: [
      'Period, ovulation, fertile-window and pregnancy information in Avelune are estimates based on what you log. They can be wrong, especially for irregular cycles, after stopping hormonal contraception, after pregnancy or with health conditions.',
      'Do not use Avelune as contraception, to plan or avoid pregnancy, or to diagnose or treat any condition. Articles and tips are general information, not medical advice. Always talk to a qualified health professional about your health, and contact emergency services in an emergency.',
    ],
  },
  {
    title: 'Your responsibilities',
    body: [
      'You are responsible for the data you enter and for keeping your own backups. If you use encrypted sync or encrypted backups and lose your passphrase, nobody can recover that data: this is by design.',
      'If you run or use an Avelune server, its operator is responsible for running it securely. Use HTTPS for anything outside your home network.',
    ],
  },
  {
    title: 'Other services',
    body: [
      'Connections to Apple Health, Health Connect, Fitbit, Oura, Garmin or other services are optional and are governed by those services’ own terms and privacy policies. Avelune is independent and not affiliated with them or with any other tracking app.',
    ],
  },
  {
    title: 'No warranty',
    body: [
      'Avelune is provided “as is”, without warranty of any kind. To the fullest extent the law allows, the authors and contributors are not liable for any claim, damages or loss arising from using it, including loss of data or decisions made based on its estimates.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'These terms may change as the project evolves. When they change in a meaningful way, the app shows this notice again. The full history is public in the project repository.',
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    title: 'The short version',
    body: [
      'Avelune collects nothing. There is no account to create, no analytics, no advertising, no tracking and no third-party SDKs that report on you. The project has no servers that receive your data.',
    ],
  },
  {
    title: 'What is stored, and where',
    body: [
      'Everything you log (periods, symptoms, moods, temperatures, notes, medication, pregnancy dates and health data you import) is stored only on your device. On iPhone and Android, encryption keys are kept in the system keychain or keystore. In a web browser, data is kept in that browser’s storage, so use the web app only on devices you trust.',
    ],
  },
  {
    title: 'Optional features that use the network',
    body: [
      'Encrypted sync: if you connect a server, your records are encrypted on your device with your passphrase before upload. The server stores only ciphertext. It can see your email, when you sync, how many records you have and when each changed, but not what they contain or which days you logged.',
      'Partner sharing: an encrypted summary that you control is stored on your server. Only someone with your invite code can read it. You choose what is included and can stop sharing at any time.',
      'Health connections: data is read on your device from Apple Health or Health Connect. If you sign in to Fitbit or Oura, your device talks to them directly. Nothing passes through the Avelune project.',
      'Backups and exports: files are saved where you choose. Backups are encrypted with your passphrase. Exports (CSV, JSON, PDF) are not encrypted, so store and share them carefully.',
    ],
  },
  {
    title: 'Your control',
    body: [
      'You can export everything (Settings → Your data) or delete it from this device, and delete your server account and synced data, at any time. Uninstalling the app removes its local data.',
      'If you use a server run by someone else, that operator can see the limited information described above, and their own privacy policy applies too.',
    ],
  },
  {
    title: 'Questions',
    body: [
      `Open an issue at ${ISSUES_URL}. Because the code is open source, anyone can check exactly what Avelune does with data.`,
    ],
  },
];

export const CONTRIBUTE: string[] = [
  'Report a bug or suggest a feature on GitHub.',
  'Improve the code, design, accessibility or translations.',
  'Test new versions on your phone and share feedback.',
  'Tell someone who could use a free, private tracker.',
];
