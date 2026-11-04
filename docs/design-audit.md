# Avelune design audit

Audited 31 Oct 2026 against the UI UX Pro Max rules (priority order: accessibility → touch → performance →
style → layout → typography/colour → animation → forms → navigation → charts) and the Avelune brand brief.
Method: code review of every screen, WCAG contrast measurements, and Playwright screenshots at 412 and 375 px.

## Findings and fixes

| # | Priority | Finding (before) | Rule | Fix (after) |
|---|---|---|---|---|
| 1 | Critical: accessibility | Five log-category chips failed contrast with white text when selected: mood 2.3:1, other 2.9:1, tests 3.3:1, activity 3.6:1, sex 4.0:1 | Contrast 4.5:1 | New accessible category palette, every accent ≥6:1 with white and ≥4.8:1 on its tint |
| 2 | Critical: accessibility | Inactive tab labels 1.8:1; secondary text 3.96:1 on the grey background | Contrast 4.5:1 | Inactive tabs use Muted Mauve (5.0:1); secondary text uses Mauve on ivory/white and Ink Plum on tinted cards |
| 3 | Critical: accessibility | Fertile days were shown only as teal text; ovulation and fertile shared one colour | Colour not the only cue | Distinct shapes: filled (period), dashed ring (predicted), soft fill (fertile), soft fill + dashed ring (ovulation); visible calendar legend; spoken labels ("12 October 2026, fertile window") |
| 4 | Critical: accessibility | Icon glyphs were exposed to screen readers; status circle read as fragments; calendar edit checkboxes had no role/state | Labels and roles | Icons hidden from the accessibility tree; status circle announced as one sentence; checkboxes expose `checked`/`disabled`; week days expose `selected`; headings marked as headers; "Predictions updated" announced politely |
| 5 | Critical: touch | Steppers 34–40pt, clear buttons ~32pt, water glasses 34pt, segmented control ~38pt, week chips ~40pt | Targets ≥44pt / 48dp | All steppers 44, buttons ≥52 tall, rows ≥56, tabs 56, hitSlop on glasses and clear buttons, week chips 44 |
| 6 | High: style | Emoji used for pregnancy size comparisons (font-dependent, off-brand) | No emoji as icons | Original vector `GrowthMark` (plum and rose petals cradling a seed that grows with the week), always paired with text |
| 7 | High: style | Generic pink and teal palette, moon icon, system font, no logo, default Expo app icon | Brand consistency | Full Avelune palette as semantic tokens, official logo lockup on onboarding, symbol avatar, app icon, Android adaptive icon, splash, favicon |
| 8 | Medium: typography | System font everywhere; custom weights would break on Android | Font pairing; base 16 | Varela Round headings and Nunito Sans body via a brand `Text` wrapper that maps weights to font files; Dynamic Type capped at 1.6× |
| 9 | Medium: typography | Calendar micro-labels 8–10px | Min readable size | Cycle-day and TODAY labels 11px; mini-year view hidden from assistive tech (each month is a labelled button) |
| 10 | Medium: animation | "Predictions updated" pop ignored reduced motion | Respect reduced motion | Pop, loops, fades and chart growth all respect the OS setting |
| 11 | Medium: colour | Raw hex values scattered through screens | Semantic tokens | Tokens in `theme.ts` (`colors`, `phase`, `font`, `space`, `motion`, `TOUCH`); chart, partner and insight colours moved onto tokens |
| 12 | Low: forms | Field labels were small grey 13px text | Visible, legible labels | 14px semibold Ink Plum labels above every field; errors stay next to fields |
| 13 | Low: charts | Chart accent colours were unrelated to the brand | Chart consistency | Phase accents per series; Dusty Rose for decorative highlight and baseline only |

## Verified
- 42 unit tests pass (core + server). TypeScript clean.
- End-to-end in Chromium at 375 px: onboarding, logging, calendar edit, encrypted sync, partner link/join/revoke, pregnancy mode. No page errors.

## Not yet verified / recommended next
1. **On-device QA**: largest Dynamic Type / Android font scale, TalkBack/VoiceOver pass, landscape on tablets. The web build cannot emulate these.
2. **Dark mode**: the app is light-only (`userInterfaceStyle: light`). A dark theme needs its own contrast pass (Ink Plum surfaces, lifted phase accents).
3. **Store identity**: display name, bundle id and package are `app.avelune.tracker`, ready for a store release.
4. **Charts**: add tap tooltips with exact values (currently visual only, with a text headline).
