# Privacy-first / open-source period trackers, and unmet needs across period apps

Research date: 2026-11-03. Read these notes with the following method caveats:
- **Primary sources read directly:** the drip GitLab issue tracker through its public API (issue titles, dates and bodies), and the Mensinator GitHub issue list sorted by comment count, page 1 of 8 (182 issues in total).
- **Search summaries only:** WebFetch could not reach Reddit, discuss.privacyguides.net, mozillafoundation.org and ottyapp.com from this session. Findings from those sites and from app-store pages come from search-engine summaries, not full pages. Short quoted phrases from search summaries are marked "(per search summary)" because I could not check them word for word. Everything else is labelled as a paraphrase.
- **No Reddit material:** Because of the block, these notes contain no Reddit user quotes. Community wish-lists are inferred from GitHub/GitLab issues (real users), app-store review snippets, one academic survey, and vendor feature lists. Vendor feature lists show what makers think users want, not what users said.
- **Undated sources:** Sources older than 2023 are flagged [HISTORICAL]. Sources with no date I could confirm are flagged [UNDATED].

---

## Q1. What do users of the privacy-first and open-source apps praise, and what do they find lacking compared with Flo or Clue (predictions, polish, sync, backups)? (Part 1: per-app catalogue)

### Takeaway
People praise the private apps for keeping data on the device, needing no account, and being open source. Euki received Mozilla's only 10/10 in its July 2026 review. The repeated shortfalls compared with Flo and Clue are:
- no fertile-window or ovulation estimate, or only a very conservative one
- predictions that need several cycles of data, or none at all
- no automatic backup or sync, so data is lost with the phone
- weak import from other apps
- UI rough edges, widgets, accessibility bugs and dark mode
- missing medication and contraception reminders

### Cited Findings

#### Cross-app context
- Mozilla's July 2026 review of six period trackers scored them: Euki 10/10 (the only perfect score), Clue 8, Flo 7, Period Calendar 6, Spot On 5, Stardust 2. Euki stores health data locally and needs no account. I could not open Mozilla's page directly; these figures come from secondary write-ups. — [CyberInsider](https://cyberinsider.com/mozilla-study-ranks-euki-as-the-most-private-period-tracker/); [Captain Compliance](https://captaincompliance.com/education/mozilla-tested-six-period-tracker-apps-only-one-earned-a-perfect-privacy-score/); [Mozilla review (blocked in session)](https://www.mozillafoundation.org/en/nothing-personal/euki-privacy-review/)

#### Euki (nonprofit, open source)
- **(a) Negative:** Mozilla notes that the app's name alone can show that someone uses a reproductive-health app, even if no records are exposed (paraphrase, per search summary, 2026). — [Mozilla Euki review](https://www.mozillafoundation.org/en/nothing-personal/euki-privacy-review/)
- **(b) Neutral:**
  - In Mozilla's testing (2026), core features sent no health data off the device, and the in-app browser for external pages did not leak health data either.
  - Euki's privacy policies have stayed textually identical since it was spun off from Women Help Women in mid-2024.
  - Source for both points: [Mozilla Euki review](https://www.mozillafoundation.org/en/nothing-personal/euki-privacy-review/); [CyberInsider](https://cyberinsider.com/mozilla-study-ranks-euki-as-the-most-private-period-tracker/)
- **(b) Neutral:** The App Store shows 4.2/5 from 132 ratings, and the privacy label says "Data Not Collected" (per search summary; date of snapshot unknown). — [App Store](https://apps.apple.com/app/id1469213846)
- **(c) Improvement:** Mozilla advises users to set a PIN and to have data cleared on a schedule. This implies Euki offers both, and that they are opt-in rather than on by default (inference from a search summary). — [Mozilla Euki review](https://www.mozillafoundation.org/en/nothing-personal/euki-privacy-review/)
- **Gap:** I could not reach substantive Euki user reviews about features (predictions, backup, export).

#### drip. (bloodyhealth; open source, Android and iOS)

**(a) Negatives and limitations**
- The developer FAQ says drip does not show fertile days in the calendar. The team wants to change this and to add things like manually pausing tracking, but calls it "a huge rebuild project". Because the work is volunteer and done in free time, they give no date [UNDATED FAQ]. — [drip FAQ](https://dripapp.org/faq.html)
- Predictions appear only after 3 complete cycles have been entered; drip then predicts the next 3 period starts [UNDATED FAQ]. — [drip FAQ](https://dripapp.org/faq.html)
- On AlternativeTo, one user says the only thing they miss is dark mode, and another says the GUI needs to be more user-friendly (paraphrase) [UNDATED]. — [AlternativeTo](https://www.alternativeto.net/software/drip-/about/)
- Open bugs with an accessibility angle:
  - #815 (2026-07-09): the Chart tab jumps back to the main screen after the system font size is increased.
  - #788 (2025-06-21): calendar dates are cut off and overflow their cells.
  - #817 (2026-07-10): the side menu does not follow the system theme.
  - #820 (2026-08-26, closed): display dimensions were too small.
  - #738 (2024-11, closed): mucus colour contrast on the chart needed to be stronger.
  - Source: [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)
- Reliability bugs:
  - #826 (2026-10-23): the app crashes when fertility tracking is enabled.
  - #799 / #803 (2025–26): crashes after symptom options are deselected.
  - #795 (2025-10-19): Android notifications need to be delivered while the app is in the background.
  - #643 (2023-09-28): logged data does not override the predicted period.
  - Source: [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)

**(b) Neutral observations**
- drip has a large set of translation and i18n work from 2025: a language switch was added in April 2025, and #512 has been open since 2021. — [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)
- drip supports symptothermal (NFP) tracking: temperature, mucus and cervix. Issue #635 "Bug in ovulation detection" has been open since 2023-04-20. — [drip GitLab #635](https://gitlab.com/bloodyhealth/drip/-/issues/635)
- A user asked for the APK to stay available for direct install (#766, 2025-04, closed). — [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)

**(c) Improvements requested (from the issue tracker)**
- #809 (2026-03-19): skip or exclude atypical cycles from statistics (average length, standard deviation, predicted start range) so that one unusual cycle does not skew them. — [drip #809](https://gitlab.com/bloodyhealth/drip/-/issues/809)
- #804 (2026-01-11): show an approximate fertile phase without temperature data, with a warning not to use it for contraception. The reporter was passing on feedback from a friend they had moved off an "invasive" app. They argued that people work this out in their heads anyway (paraphrase). — [drip #804](https://gitlab.com/bloodyhealth/drip/-/issues/804)
- #412 (2019-12-30, 16 comments, still open) [HISTORICAL, but still open]: show ovulation in the calendar, plus small icons on calendar days for sex, mood and other entries. — [drip #412](https://gitlab.com/bloodyhealth/drip/-/issues/412)
- #430 (2020-07-21) [HISTORICAL, open]: automatic regular backups. The reporter said drip needs them to be a viable alternative to Clue, because users cannot be expected to press a backup button every few days and lose everything if the phone breaks (paraphrase). They proposed an encrypted local backup folder first and cloud second. — [drip #430](https://gitlab.com/bloodyhealth/drip/-/issues/430)
- #549 (2022-05-04) [HISTORICAL, open]: scheduled exports to Google Drive or a self-hosted Nextcloud/WebDAV server. — [drip #549](https://gitlab.com/bloodyhealth/drip/-/issues/549)
- Other UI requests:
  - #823 (2026-09-17): cycle-by-cycle navigation in the chart.
  - #786 (2025-05-17): a year overview.
  - #805 (2026-01-12): a home-screen widget.
  - #629 / #720: choose the first day of the week.
  - #825: excluded symptoms do not appear in the chart.
  - Source: [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)

**(d) Feature ideas (from the issue tracker)**
- #810 (2026-04-28): a medication tracker and reminder, covering both the pill and pain relief for heavy cramps, with a warning when the 24-hour paracetamol or ibuprofen limit is exceeded. — [drip #810](https://gitlab.com/bloodyhealth/drip/-/issues/810)
- #429 (2020-07-12) [HISTORICAL, open]: track the insertion date of long-acting contraception (implant, ring, copper IUD), expect bleeding after insertion, and get reminders when it needs changing or a check-up. — [drip #429](https://gitlab.com/bloodyhealth/drip/-/issues/429)
- #806 (2026-01-24): make the "Bleeding" field optional. The requester will never bleed and wants to track a hormonal cycle through mood and libido; having the field always present is "a constant reminder" (per issue text). They suggest predictions that do not depend on bleeding. — [drip #806](https://gitlab.com/bloodyhealth/drip/-/issues/806)
- #818 (2026-07-25): export to iCal so the user can share a calendar with a partner who does not use the app. — [drip #818](https://gitlab.com/bloodyhealth/drip/-/issues/818)
- #808 (2026-02-23): an NFP-specific view (first highest temperature each month, minus-8-day rule). — [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)

#### Periodical (Arno Welzel; F-Droid, GPL-3.0)
- **(b) Neutral:**
  - Periodical is a menstruation calendar that calculates fertile days with the Knaus-Ogino (calendar) method and lets users take notes and log symptoms. Its F-Droid listing warns against using it for contraception and points to more accurate methods such as basal temperature.
  - It requests no internet permission.
  - The latest F-Droid version is 1.96 (added 2026-04-20, per search summary).
  - Sources: [F-Droid](https://f-droid.org/en/packages/de.arnowelzel.android.periodical); [developer page](https://arnowelzel.de/en/projects/periodical)
- **(b) Neutral (backup):** Backups are saved manually to an SD card or internal storage. The changelog notes a fix for keeping storage permission after a backup folder is chosen, and support for ADB backup (per search summary). — [F-Droid](https://f-droid.org/en/packages/de.arnowelzel.android.periodical); [developer page](https://arnowelzel.de/en/projects/periodical)
- **(a) Negative (inference):** The calendar method is the least accurate prediction approach, and there is no automatic or cloud backup.
- **Gap:** The Periodical GitHub issues page returned 404 to WebFetch, so I found no user-reported negatives or feature requests for it.

#### Mensinator (F-Droid, MIT, Android)
- **(b) Neutral:**
  - Data stays on the device and no account is needed.
  - It provides statistics, a calendar, colour customisation, and JSON export and import.
  - Version 2.0 (2025-04-05) added a vertical calendar and customisable reminder text, and requires Android 8+.
  - These are the developer's claims on the listing.
  - Source: [F-Droid](https://f-droid.org/packages/com.mensinator.app)
- **(c) Improvements requested.** All are GitHub issues; the dates are those shown on the listing.
  - Privacy hardening:
    - #69 (2024-08): block the screen in "recent apps" and block screenshots (closed).
    - #185 (2024-11): encrypt the database at rest (closed).
    - #57 (2024-08): set autobackup to false so data is not copied to Google's cloud backup (closed, "High priority").
    - #186 (2024-11, open): stop the keyboard from learning symptom words as they are typed.
  - Usability:
    - #68 (2024-08, 18 comments): a bottom navigation bar for one-handed use.
    - #191: switch months with the volume keys.
    - #139 (open): show flow colours on the day numbers.
    - #208: choose a different (discreet) app icon.
  - Cycle science:
    - #22: calculate the period from the luteal phase.
    - #251: add an explanation of the luteal-phase calculation.
    - #91: show cycle phases.
    - #98 (open): an "Predict Ovulation" option.
  - Reminders:
    - #272 (2025-06): wider range for "days before" reminders, and "days after" reminders.
    - #216: reminders not sent unless scheduled from the calendar screen (bug).
  - Distribution: #43 (24 comments): ship an APK for direct download.
  - Source: [Mensinator GitHub issues](https://github.com/EmmaTellblom/Mensinator/issues?q=is%3Aissue+sort%3Acomments-desc)
- **(d) Feature ideas:**
  - #143 (2024-09, open): a medication section.
  - #234 (2025-03, open): widgets showing cycle day and a period countdown.
  - #190 (26 comments) and #44: languages and community translation.
  - Source: [Mensinator GitHub issues](https://github.com/EmmaTellblom/Mensinator/issues?q=is%3Aissue+sort%3Acomments-desc)

#### Lunar / Read Your Body (RYB)
- **(b) Neutral:**
  - RYB describes itself as a data-recording and charting tool with no algorithmic forecasts or fertility predictions.
  - By default, all charting data is stored only on the device.
  - Sources: [readyourbody.com period tracking](https://readyourbody.com/period-tracking/); [App Store](https://apps.apple.com/us/app/read-your-body/id1488117813)
- **(a) Negative / (c) Improvement:** Users miss calendar display options and period forecasts. A developer reply on the store said these are on the roadmap (paraphrase from the store listing, per search summary) [UNDATED]. — [App Store](https://apps.apple.com/us/app/read-your-body/id1488117813)
- **(b) Neutral:** Reviewers praise its customisation for charting (per search summary) [UNDATED]. — [App Store](https://apps.apple.com/au/app/read-your-body/id1488117813)

#### Bellabeat Ivy / IVY app (wearable plus app; not open source)
- **(a) Negative:** One reviewer said the app offered cycle lengths only from 18 to 40 days in a scrolling list, which left them out of regular tracking (paraphrase, per search summary) [UNDATED, likely HISTORICAL]. — [Tom's Guide](https://www.tomsguide.com/us/bellabeat,review-2121.html)
- **(a) Negative:** A user review on the App Store reported that all their data was removed after they created an account; Bellabeat replied (per search summary) [UNDATED]. — [App Store, IVY Period & Pregnancy app](https://apps.apple.com/us/app/bellabeat-period-diary/id436762566)
- **(a) Negative:** Trustpilot reviews describe syncing failures, app problems and poor hardware quality [UNDATED]. — [Trustpilot](https://www.trustpilot.com/review/www.bellabeat.com?page=2)
- **(b) Neutral:** Reviewers praise the hardware design ("prettiest fitness wearable", per search summary) and sleep tracking, but call it overpriced [likely HISTORICAL, about 2019]. — [Inverse](https://www.inverse.com/input/reviews/bellabeat-ivy-wellness-fitness-sleep-tracker-review)
- **(b) Neutral:** A 2024 review assessed Ivy for cycle syncing. — [Good Gear 2024](https://www.goodgear.com/bellabeat-ivy-review/)

#### Moody Month (hormone and mood oriented; not open source)
- **(b) Neutral / praise:**
  - The app predicts periods and ovulation and shows mood and symptom trends.
  - A Play Store reviewer said seeing symptom trends lined up with hormones was "incredibly helpful" (per search summary).
  - Store ratings are about 4.2–4.3.
  - Sources: [Google Play](https://play.google.com/store/apps/details?id=com.wearemoody.moodymonth&hl=en_US); [App Store](https://apps.apple.com/us/app/moody-month-hormone-tracker/id1414905792)
- **(a) Negative:**
  - A 2022 App Store review [HISTORICAL] said a period longer than 10 days could not be entered.
  - Play Store reviews [UNDATED] say the app's timing was weeks behind, and that it auto-started a period the user did not log.
  - Source (per search summary): [Google Play](https://play.google.com/store/apps/details?id=com.wearemoody.moodymonth&hl=en_US)

#### Cycles (cycles.app, partner-focused; not open source)
- **(b) Neutral:**
  - Cycles calls itself the first app with "partner connect".
  - Partners see cycle information, while "reminders and notes are always kept private, even from your partner" (App Store listing, per search summary).
  - It offers an optional passcode or Face ID.
  - It supports Apple Watch.
  - About 26K ratings.
  - A recent update added a "New Partner Experience".
  - Sources: [App Store](https://apps.apple.com/us/app/-/id577187307); [AppsHunter](https://appshunter.io/ios/app/cycle-tracker-and-period-cycles/id577187307)
- **(a) Negative:** One review says partner sharing needs Cycles Premium (about $30 / £22.60 a year) and that the partner must have an Apple device. It lists this as a drawback [UNDATED]. — [Woman & Home](https://womanandhome.com/health-wellbeing/best-period-tracking-apps)
- **Gap:** I found no user-review text about Cycles' partner notifications.

### Inferences
- **The core trade-off:** Users of private apps accept fewer smart features but keep asking for the convenience features of Flo and Clue: an estimated fertile window, widgets, dark mode and automatic backup. A product that pairs local-first storage with opt-in encrypted backup and conservative, clearly caveated estimates would meet the most-repeated open-source asks.
- **Privacy expectations go beyond "no server":** Mensinator's issues show users expect protection from screenshots and the recent-apps screen, encryption at rest, opt-out from OS cloud backup, an incognito keyboard, and a disguised icon. Mozilla's Euki note, that an app name alone can reveal use, supports discreet naming and icons.
- **Medication and contraception reminders** are asked for independently in both drip (#810, #429) and Mensinator (#143). Neither offers them.
- **Accessibility bugs in drip** (system font scaling, cell overflow, theme) suggest that large-text and Dynamic Type support is a real gap in volunteer-built apps.

### Gaps
- Reddit r/privacy and r/degoogle threads comparing drip, Euki and others could not be fetched (reddit.com blocked). The Privacy Guides forum thread on drip could not be fetched either (host not allowed).
- I found no user reviews with feature critiques for Euki, and no Periodical issues (404).
- Euki's own feature list (for example, contraception or abortion info pages, auto-delete) could not be verified from its site.

---

## Q2. Which partner-sharing features exist in apps like Cycles, Flo for Partners, Clue Connect and Stardust, and what do couples say they want or dislike?

### Takeaway
Partner models range from education-only to data-minimal timing to full sharing:
- **Flo for Partners:** education only; the partner reportedly does not see cycle data.
- **Clue Connect:** timing data with little else; the sharer pays and can revoke access.
- **Cycles:** cycle sharing, with notes and reminders always kept private; Premium and an Apple device are required.
- **Stardust:** reports conflict on what it offers.
- **DaysyDay:** the user chooses which data to share.

Paywalls and platform lock-in are the main documented complaints. I could not obtain first-hand couple feedback from Reddit.

### Cited Findings
- **Flo for Partners:**
  - Launched October 2023.
  - The user generates a pairing code in the Partner tab, and the partner installs Flo and chooses "I am a partner".
  - The partner receives stories, articles and tips tied to her account, and the basic tier is free.
  - Comparison blogs say the partner does not see her actual cycle data in this mode. These blogs are run by competing apps, so they may be biased.
  - Sources: [Wikipedia: Flo](https://en.wikipedia.org/wiki/Flo_(app)); [Otty 2026](https://ottyapp.com/blog/best-period-tracker-for-couples/); [PeriodBro](https://periodbro.com/flo-for-partners-review/)
- **Clue Connect:**
  - Free for the viewer; the sharer needs Clue Plus (about $39.99 a year).
  - Described as the most data-minimal option, for partners who only need timing.
  - The sharer holds the code and can revoke access.
  - Source: [Otty 2026 (competitor)](https://ottyapp.com/blog/flo-for-partners-alternatives/); [DuoSync (competitor)](https://duosync.io/flo-for-partners-alternatives-7-better-apps-for-couples/)
- **Stardust:** One comparison says partner mode is free and sends playful partner notifications; another calls its partner sharing limited. The two sources conflict. Stardust scored 2/10 on privacy in Mozilla's 2026 review. — [Otty 2026](https://ottyapp.com/blog/best-period-tracker-for-couples/) vs [DuoSync](https://duosync.io/flo-for-partners-alternatives-7-better-apps-for-couples/); [CyberInsider](https://cyberinsider.com/mozilla-study-ranks-euki-as-the-most-private-period-tracker/)
- **Cycles:**
  - Partner connect shares cycle information, while notes and reminders always stay private.
  - It needs Premium (about $30 a year) and an Apple device for the partner.
  - The review that reports these requirements lists them as a drawback.
  - Sources: [App Store](https://apps.apple.com/us/app/-/id577187307); [Woman & Home](https://womanandhome.com/health-wellbeing/best-period-tracking-apps)
- **DaysyDay:** The partner installs a separate DaysyDay Partner app, and the user chooses which data can be shared. This is per-category consent (store listing). — [App Store](https://apps.apple.com/us/app/daysyday-cycle-period-tracker/id1533071047)
- **Pocket Cycle** [likely HISTORICAL]: the partner can only view data. — [iMore](https://www.imore.com/pocket-cycle-iphone-and-ipad-review)
- **Open-source demand (drip #818, 2026-07-25):** an iCal export so the user can share a calendar with a partner who does not use the app. — [drip #818](https://gitlab.com/bloodyhealth/drip/-/issues/818)
- **Many new 2025–26 iOS apps are partner-focused** (BeKnown "Cycle Partner Support", PairCare, Flow Together, CivvyMode "Her Period Tracker"). This shows makers see demand, but it is not user evidence. — [BeKnown](https://apps.apple.com/app/id6760878130); [Flow Together](https://apps.apple.com/us/app/flow-together/id6755704426); [PairCare](https://mwm.ai/apps/paircare-shared-period-tracker/6502973731)
- **Men tracking partners' periods:** a news piece covers why men track their wives' and girlfriends' periods. I saw the headline only and did not read the content. — [Citizen Digital](https://citizen.digital/article/why-we-are-tracking-our-wives-and-girlfriends-periods-men-keen-on-menstrual-cycle-speak-n338324)

### Inferences
- **Design pattern the evidence supports:**
  - Per-category toggles (as in DaysyDay), so the user decides what is shared.
  - Notes and private logs never shared by default (as in Cycles).
  - Revocable, user-held invite codes (as in Clue Connect).
  - A "lowest common denominator" share, such as an iCal feed or a read-only link, for partners who will not install an app (drip #818).
  - Partner access should not be locked to one platform or paywalled for the viewer.
- **Content beyond data:** Flo's education-first approach suggests partners value "how to support" content alongside the data.
- **Coercion and abuse risk:** Sharing period data with a partner raises a risk of coercive control. The evidence base above does not cover this, but the stress on user-held revocation points to it. Treat this as an assumption to validate.

### Gaps
- I found no first-hand couple feedback (likes and dislikes about notifications, tips, or a per-item privacy toggle). The r/relationship_advice and r/TwoXChromosomes threads could not be fetched.
- I could not verify exactly what a Stardust partner sees, or how its notifications are worded.
- I could not confirm whether Flo for Partners now shows cycle phase or dates. Sources are competitor blogs.

---

## Q3. Which condition-specific features do the PCOS, endometriosis and perimenopause communities ask for most? (Part 2, plus postpartum, birth control and trans/non-binary)

### Takeaway
- **Endometriosis:** The only research source (a 2023 NZ survey) shows patients mostly use general trackers (Flo, Clue). They most want tracking of specific symptoms: pain, bowel symptoms and mental health. Many are willing to share data with clinicians.
- **PCOS and perimenopause:** Users need tools that cope with long or absent cycles. The tools should not force predictions, should be able to exclude atypical cycles, and should offer "days since last period" views.
- **Across all three:** symptom-trigger correlation and doctor-ready exports.
- **Postpartum and trans users:** both need tracking that does not assume regular bleeding.

### Cited Findings
#### Endometriosis
- **2023 NZ survey of endometriosis patients (Scheck et al.):**
  - The apps most often used were the general period trackers Flo, Clue and Period Tracker.
  - The most desired features were tracking of specific symptoms: periods, pain, bowel symptoms and mental-health symptoms.
  - The survey also explored willingness to share app data with clinicians.
  - Source: [Scheck et al., 2023, SAGE](https://journals.sagepub.com/doi/10.1177/22840265231193486)
- **elleFA feasibility trial:** states that no app exists for endometriosis that covers the whole spectrum of symptoms, including pain, quality of life and patient–provider communication (paraphrase) [trial date not confirmed]. — [ClinicalTrials.gov NCT06452407](https://clinicaltrials.gov/study/NCT06452407)
- **What vendor endo apps offer (2025–26 listings; vendor claims, not user evidence):**
  - a pain-flare calendar by cycle day
  - tracking of period pain, PMS, fatigue and flares
  - "Data Export for Doctors" as a premium feature
  - Sources: [Endometriosis Journey](https://apps.apple.com/us/app/-/id6754395927); [Endo45](https://apps.apple.com/in/app/endo45/id6450434398); [Phendo](https://apps.apple.com/us/app/phendo/id1145512423)
- **Patient-facing guide:** pain tracking gives "quantifiable evidence" to communicate to doctors (per search summary) [UNDATED]. — [endometriosis.net](https://endometriosis.net/living/must-have-apps)
- **Open-source user requests:** drip #810 (2026) asks for pain-medication reminders and a 24-hour dose-limit warning for people with heavy cramps. — [drip #810](https://gitlab.com/bloodyhealth/drip/-/issues/810)

#### PCOS and irregular cycles
- **Vendor positioning (2025–26):**
  - WAVS supports cycles of 21 to 120+ days without "errors" and promises "No forced predictions".
  - It also offers custom tracking of pain location and triggers, PMDD mood scales, and 100% offline data.
  - Cysterly adapts predictions to unpredictable or absent periods.
  - These are vendor claims.
  - Sources: [WAVS](https://apps.apple.com/us/app/id6505085162); [Cysterly](https://apps.apple.com/us/app/-/id6747269651)
- **A PCOS-app reviewer** said the period-tracker part was "just not helpful at all" (per search summary) [UNDATED]. — [PCOS Tracker App Store](https://apps.apple.com/us/app/-/id1462891293)
- **Long or irregular cycles in Bellabeat:** the 18–40 day cycle range left a user out of regular tracking [UNDATED/HISTORICAL]. — [Tom's Guide](https://www.tomsguide.com/us/bellabeat,review-2121.html)
- **Long periods in Moody Month:** a period longer than 10 days could not be entered [2022, HISTORICAL]. — [Google Play / App Store via search](https://apps.apple.com/us/app/moody-month-hormone-tracker/id1414905792)
- **drip #809 (2026-03-19):** exclude atypical cycles from statistics. — [drip #809](https://gitlab.com/bloodyhealth/drip/-/issues/809)

#### Perimenopause and menopause
- **Vendor features (2025–26 listings, many with few reviews, so this is weak demand evidence):**
  - MidLife designs for perimenopausal cycles of 21–60 days.
  - HotFlash drops forecasting and counts up days since the last period.
  - Menopal offers one-tap hot-flash logging with intensity, time-of-day patterns, and a correlation between triggers and hot flashes.
  - Meno identifies personal trigger patterns after 30+ entries.
  - Peri Track, HotFlash and PeriSlayer advertise doctor-ready summaries.
  - MidLife, Solace and Perilog stress on-device storage or no sign-up.
  - Sources: [MidLife](https://apps.apple.com/app/midlife/id6769793211); [Meno](https://apps.apple.com/us/app/menopause-symptom-tracker-meno/id6765791200); [Menopal](https://mwm.ai/apps/menopal-menopause-tracker/6787721695); [HotFlash](https://mwm.ai/apps/hotflash-menopause-log/6773190080); [Solace](https://apps.apple.com/app/id6781828385); [PeriSlayer](https://alternativeto.net/software/perislayer/about/)
- **Printable chart:** mySysters offers a printable chart sent by email for doctor visits (vendor). — [mySysters](https://apps.apple.com/app/id1196032521)
- **Healthline** explains how to track perimenopause periods [UNDATED]. — [Healthline](https://www.healthline.com/health/menopause/how-to-track-your-perimenopause-periods)

#### Postpartum and breastfeeding
- **Natural Cycles:**
  - After birth, it swaps the period tracker for a postpartum-bleeding tracker and shows no predictions until ovulation is detected or a period is logged.
  - The regular tracker returns after more than 6 weeks, provided no postpartum bleeding has been logged for 3 days, or ovulation has been detected.
  - Users can measure while breastfeeding.
  - Source: [Natural Cycles help](https://help.naturalcycles.com/hc/en-us/articles/360003291094-How-to-use-the-app-while-breastfeeding)
- **Clue** retired its postpartum product and points users to regular tracking. — [Clue](https://helloclue.com/articles/about-clue/important-news-about-clue-postpartum)
- **drip FAQ:** "manual pausing of tracking" (useful during pregnancy or postpartum) needs a huge rebuild [UNDATED]. — [drip FAQ](https://dripapp.org/faq.html)
- **Return of periods:** it varies widely, from 6 weeks to 3 months for people not breastfeeding and often longer for those breastfeeding. Some people have irregular cycles while breastfeeding. — [Mali](https://mali.me/en/eyfeed/are-you-tracking-your-period)

#### Birth control (pill, IUD, ring, patch)
- **drip #429** [2020, HISTORICAL, open]: log the insertion date of an implant, ring or copper IUD; expect post-insertion bleeding; remind when it needs changing or a check-up. — [drip #429](https://gitlab.com/bloodyhealth/drip/-/issues/429)
- **drip #810** (2026): pill reminders. **Mensinator #143** (2024, open): a medication section. — [drip #810](https://gitlab.com/bloodyhealth/drip/-/issues/810); [Mensinator issues](https://github.com/EmmaTellblom/Mensinator/issues?q=is%3Aissue+sort%3Acomments-desc)

#### Trans and non-binary users
- **drip #806 (2026-01-24):** a user who will never bleed wants to hide the Bleeding field and track a hormonal cycle by mood and libido. They describe the fixed field as "a constant reminder" (per issue text). — [drip #806](https://gitlab.com/bloodyhealth/drip/-/issues/806)
- **UW study** [HISTORICAL, about 2017]: users objected to pink, flowery imagery and to apps assuming all users are women with male partners, which leaves out trans and non-binary users. — [UW News](https://www.washington.edu/news/?p=53022)
- **Pratt student project** [HISTORICAL, 2019, informal]: 7 of 7 apps reviewed used "woman" or "female" in the UI. — [Shark Week project](https://jillmariexd.myportfolio.com/shark-week)
- **Brazilian peer-reviewed paper:** argues for design based on a non-binary definition of gender (year not confirmed). — [SciELO](https://scielo.br/j/sess/a/4vMQL448Qxc4qqNNjCsYL4J/?lang=en)

### Inferences
- **Most repeated condition need:** flexible cycle modelling, meaning:
  - no hard cap on cycle or period length
  - excluding atypical cycles
  - a "no predictions" or "days since last period" mode
  - a pause or "special phase" state for pregnancy, postpartum, breastfeeding and perimenopause
- **Endometriosis:** pain by body location and severity, bowel and bladder symptoms, mood, and medication taken with doses. All should be correlated with cycle day and exportable for clinicians.
- **Gender inclusion:** neutral language and optional fields (including hiding bleeding) cost little and directly address a 2026 open-source request.

### Gaps
- No Reddit voice from r/PCOS, r/endometriosis, r/Perimenopause, r/menopause or r/birthcontrol (blocked). The "most asked" ranking for PCOS and perimenopause therefore rests on vendor positioning and open-source issues, not community counts.
- I found no 2024–2026 peer-reviewed study on period-tracker needs in PCOS or perimenopause.
- I found no specific evidence for patch or ring reminder complaints.

---

## Q4. Which data-portability complaints recur (inability to export, importing history from Flo or Clue, backups lost when changing phones)? (Part 2, plus doctor reports and accessibility)

### Takeaway
Portability is a clear, repeated pain point:
- Clue cannot import data from other apps, and cannot even restore its own export.
- Flo exports exist, but the formats do not fit other apps.
- Open-source users rely on community-built converters (Flo, Clue, Natural Cycles, Fitbit and Femm to drip), and some of these raise their own privacy problems.
- Local-only apps lose data with the phone unless the user remembers to back up manually. This is the oldest open request in drip (#430, since 2020).

### Cited Findings
- **Clue Help Center:** there is no direct way to import data from other period or health apps into Clue. Clue also cannot restore its own backup file, and Apple Health sync does not import previously tracked data. Clue notes the GDPR and US state-law right to data portability and advises exporting before deleting an account. — [Clue support: import](https://support.helloclue.com/hc/en-us/articles/21540631889181-Can-I-import-my-data-to-the-Clue-app); [Clue support: current tracker data](https://support.helloclue.com/hc/en-us/articles/29049267111069-What-about-the-data-on-my-current-tracker)
- **Export formats:** most apps can export, but usually in formats other apps cannot read (per search summary) [UNDATED]. — [iTechGuides](https://www.itechguides.com/how-to-export-and-back-up-period-tracking-data-without-cloud-sync/)
- **drip migration paths:** the drip FAQ lists a Flo-to-drip converter (a third-party online service) and a Clue-to-drip route, with import under Settings. — [drip FAQ](https://bloodyhealth.gitlab.io/faq.html)
- **drip #794 (2025-09-16):** a user argued drip should not recommend the online flo-to-drip service. Someone leaving Flo for privacy reasons is told to upload their most personal data to a site with no imprint or privacy policy (paraphrase); the user suggested running it locally instead. — [drip #794](https://gitlab.com/bloodyhealth/drip/-/issues/794)
- **drip #787 (2025-06-11):** a user migrating from Femm had a JSON export but could not work out drip's expected CSV headers and format, and found no documentation or example. — [drip #787](https://gitlab.com/bloodyhealth/drip/-/issues/787)
- **Import bugs:**
  - drip #800 (2025-11): CSV import failed on iOS when the file name contained a space.
  - drip #744 (2025-01): mucus value not calculated during import.
  - Source: [drip GitLab issues](https://gitlab.com/bloodyhealth/drip/-/issues)
- **Community converters on GitHub:** "FitbitToDrip" (last updated 2026-06-10) and "NaturalCyclesToDrip" (R code, updated 2025-08-21). These show users building their own migration tools. — [pc592/FitbitToDrip](https://github.com/pc592/FitbitToDrip); [AmeliaMN/NaturalCyclesToDrip](https://github.com/AmeliaMN/NaturalCyclesToDrip)
- **Backups lost with the phone:**
  - drip #430 [2020, open]: without automatic backups, a broken device means losing all data.
  - drip #549 [2022, open]: scheduled backups to Drive or Nextcloud.
  - Sources: [drip #430](https://gitlab.com/bloodyhealth/drip/-/issues/430); [drip #549](https://gitlab.com/bloodyhealth/drip/-/issues/549)
- **Mensinator #57 (2024):** autobackup was deliberately disabled so data would not go to Google's cloud backup. Privacy can therefore conflict with backup when switching phones. — [Mensinator issues](https://github.com/EmmaTellblom/Mensinator/issues?q=is%3Aissue+sort%3Acomments-desc)
- **Bellabeat:** a user reported that all their data was removed after creating an account (per search summary) [UNDATED]. — [App Store](https://apps.apple.com/us/app/bellabeat-period-diary/id436762566)
- **drip #818 (2026):** iCal export, for portability and partner sharing. — [drip #818](https://gitlab.com/bloodyhealth/drip/-/issues/818)
- **Doctor reports:**
  - The 2023 endometriosis survey explored willingness to share data with clinicians.
  - Vendors advertise printable or PDF doctor exports, often behind premium (Endometriosis Journey "Data Export for Doctors" is premium; mySysters emails a printable chart).
  - drip, Mensinator and Periodical offer only raw CSV, JSON or backup files, based on the listings above. I found no doctor-report feature in them.
  - Sources: [Scheck et al. 2023](https://journals.sagepub.com/doi/10.1177/22840265231193486); [Endometriosis Journey](https://apps.apple.com/us/app/-/id6754395927); [mySysters](https://apps.apple.com/app/id1196032521)
- **Accessibility evidence in open-source apps:**
  - drip: #815 (system font size breaks the Chart tab, 2026), #788 (calendar dates cut off, 2025), #817 (theme), #738 (colour contrast, 2024).
  - Mensinator: #68 (one-handed bottom navigation, 18 comments, 2024), #191 (volume keys to change month).
  - Sources: [drip issues](https://gitlab.com/bloodyhealth/drip/-/issues); [Mensinator issues](https://github.com/EmmaTellblom/Mensinator/issues?q=is%3Aissue+sort%3Acomments-desc)

### Inferences
- **No common format:** There is no standard interchange format, so every app forces users to write converters or use third-party upload sites. A product that imports Flo and Clue exports locally, on the device, would remove a known barrier for privacy migrants and avoid the drip #794 concern. Publishing a documented CSV/JSON schema would avoid the drip #787 problem.
- **Backups:** Local-first apps need automatic, encrypted, user-chosen backup targets (a local folder, a WebDAV server, or the user's own cloud) to compete with Flo and Clue on "don't lose my data". Encrypted, user-held backup files sidestep the privacy-versus-OS-autobackup conflict.
- **Doctor reports:** A clinician-ready PDF (cycle lengths, period lengths, symptom and pain heat-map by cycle day, medications) is mostly paywalled or condition-specific in the market. Private open-source apps do not offer one. This is an open opportunity.

### Gaps
- I found no first-hand complaints (Reddit or app reviews) about lost data on phone change for Flo or Clue specifically, and no data on how Flo's export works in practice.
- I found no formal accessibility audits (screen reader, colour-blind safe palettes) of any period tracker.
- I could not check whether Euki or Read Your Body offer export.

---

## Feature-idea shortlist, consolidated from the evidence

This excludes community and social features; the target is one private user plus a partner. Each item names its evidence source.

1. **Optional, conservative fertile-window estimate,** with a contraception disclaimer (drip #804, #412; Mensinator #98).
2. **Exclude or flag atypical cycles from statistics;** no caps on cycle or period length; a "no predictions / days since last period" mode (drip #809; Bellabeat and Moody Month complaints; PCOS and perimenopause vendor positioning).
3. **Pause or special-phase modes** for pregnancy, postpartum, breastfeeding and perimenopause (drip FAQ; Natural Cycles' approach; Clue retiring postpartum).
4. **Medication and contraception module:** daily pill reminders, ring, patch and IUD or implant insertion and change dates, pain-relief logging with a dose-limit warning (drip #810, #429; Mensinator #143).
5. **Optional bleeding field and neutral language;** fully customisable tracked fields (drip #806; UW and Pratt studies).
6. **Endometriosis-style pain tracking** by location and severity, bowel and bladder, mood, correlated with cycle day (Scheck et al. 2023; vendor apps).
7. **Clinician PDF report,** free rather than paywalled (vendor paywalls; endometriosis survey).
8. **Automatic encrypted backups** to a local folder, WebDAV or the user's own cloud; on-device import from Flo, Clue and others; a documented export schema; iCal export (drip #430, #549, #787, #794, #818; Clue's no-import policy).
9. **Partner sharing:** per-category toggles, private notes never shared, user-held revocable codes, a no-install option (iCal or read-only link), and no paywall or platform lock for the viewer (DaysyDay, Cycles, Clue Connect, drip #818).
10. **Privacy hardening:** screenshot and recents blocking, encryption at rest, OS-backup opt-out, incognito keyboard, discreet icon, PIN, scheduled auto-delete (Mensinator #69, #185, #57, #186, #208; Mozilla on Euki).
11. **Accessibility and UX:** respect system font scaling, theme and contrast; one-handed bottom navigation; widgets; dark mode; year and cycle-by-cycle views (drip #815, #788, #817, #805, #786, #823; Mensinator #68, #234; AlternativeTo).
