# Contributing to Avelune

Thank you for wanting to help. Avelune is a free, personal open-source project: there is no company behind it, no paid tier and no
subscription. It exists because technology today is a necessity for everyone, and understanding your own body should not depend on
paying a monthly or yearly subscription. If you have the ability to contribute and support it for the community, please go ahead.

## Ways to help

- **Report a bug.** Open an [issue](https://github.com/omarals95/avelune/issues) with your phone or browser, the app version and the steps to reproduce it. Please never attach real health data. Describe it or use made-up values instead.
- **Suggest a feature.** Open an issue that explains the problem you want solved, not only the solution.
- **Improve the code.** Fix a bug, add a feature from the roadmap, or improve accessibility and performance.
- **Design and writing.** Improve screens, illustrations, icons, wording or help articles. Health content must be general information, not medical advice.
- **Translate** the app into your language.
- **Test** new builds on your phone and share feedback.
- **Spread the word.** Tell someone who could use a free, private tracker, or star the repository.
- **Donate.** If you can't contribute time, a [donation through GitHub Sponsors](https://github.com/sponsors/omarals95) helps cover the costs of maintaining the app. It is always optional.

## Getting started

```sh
npm install
npm test            # core + server tests
npm run typecheck   # all workspaces
cd app && npx expo start
```

See the [README](README.md) for the layout of the repository, running the server and building the apps.

## Ground rules

- **Privacy first.** Do not add analytics, ads, trackers or third-party SDKs that send data anywhere. Anything that leaves the device must be optional, explained to the person, and end-to-end encrypted where possible.
- **Free forever.** No paywalls, premium features or subscriptions.
- **Honest about health.** Predictions are estimates. Never present the app as a medical device or a method of contraception.
- **Tests.** Add or update tests in `packages/core` for any change to predictions, dates, imports or encryption.
- **Small, focused pull requests** with a clear description are easiest to review.
- Be kind and respectful to everyone.

## Terms and privacy text

The first-use notice, terms of use and privacy policy live in [`app/src/legal.ts`](app/src/legal.ts). After changing them, run
`node scripts/legal-docs.mjs` to regenerate [TERMS.md](TERMS.md) and [PRIVACY.md](PRIVACY.md), and bump `TERMS_VERSION`
if the change is meaningful so everyone sees the notice again.

By contributing you agree that your contribution is released under the project's [MIT License](LICENSE).
