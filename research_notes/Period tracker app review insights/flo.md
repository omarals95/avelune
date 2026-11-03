# Flo (Flo Health, flo.health; iOS id1038369065; Android org.iggymedia.periodtracker): user reviews and public feedback

**Method and sample.** Most of the evidence here comes from a primary dataset collected for these notes: **1,250 unique Apple App Store reviews**, the most recent ones from the US, GB, CA and AU storefronts. They are dated **17 Feb 2026 to 2 Nov 2026** and were pulled from Apple's public review RSS feed (`https://itunes.apple.com/{us|gb|ca|au}/rss/customerreviews/page=N/id=1038369065/sortby=mostrecent/json`). Star split: 1★ 419, 2★ 158, 3★ 140, 4★ 130, 5★ 403. That gives **577 reviews at 1–2★**, 140 at 3★ and 533 at 4–5★. Themes were counted with keyword matching, so the counts are approximate (±), but they are good enough to rank themes. All quotes are verbatim from that feed, sometimes trimmed with "…", and each is labelled [storefront, date, stars]. In the rest of these notes, "App Store RSS" means this dataset: [App Store RSS (US)](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json).

**Headline ratings, read 3 Nov 2026.**
- iOS: **4.74★ from 2,012,676 ratings**. The current version is 10.9.1, released 22 Oct 2026, and the seller is listed as "FLO HEALTH UK LIMITED" ([iTunes lookup API](https://itunes.apple.com/lookup?id=1038369065&country=us)).
- Google Play: **4.7★ from about 5.1M reviews**, last updated 23 Oct 2026. The Play Data-safety label says "No data shared with third parties… You can request that data be deleted" ([Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)).
- The recent-review sample is much more negative (46% at 1–2★) than the lifetime average. Recent sentiment is therefore far worse than the headline star rating suggests.

**Sources blocked in this session** (they could not be fetched, so they are not used directly): Trustpilot, Reddit (returned an anti-bot page), Kimola, unstar.app, TechCrunch, Consumer Reports, Mozilla's site, and the FTC site (404/403).

---

## Q1. What are the most common complaints?

### Takeaway
The complaints are about **monetisation far more than anything else**. About 65% of recent 1–2★ reviews mention pricing, Premium or subscriptions, and about 30% mention pop-up upsells and "discount" ads. Within that, the sharpest 2026-specific grievances are:
- New users reporting that **there is no free tier at all after a long onboarding questionnaire**.
- Long-time users saying that **features which used to be free are now paywalled**.
- **Charges after cancelling or after a trial**, with refunds refused.

Second-tier complaints:
- Inflexible predictions for irregular, PCOS, postpartum and perimenopause cycles.
- Unwanted AI or bot features.
- Bugs, including a 2026 calendar bug where weekdays don't match dates.
- Loss of Apple Health sync.
- Data loss on a new phone or account.
- Support that sends canned or AI replies.

### Cited Findings

**Theme frequency in the 1,250-review sample** (App Store RSS, Feb–Nov 2026; keyword-coded, approximate)

| Theme | 1–2★ (n=577) | 3★ (n=140) | 4–5★ (n=533) |
|---|---|---|---|
| Price / Premium / subscription / paywall | ~377 (65%) | ~73 | ~84 (16%) |
| Pop-ups / ads / "discount" offers | ~171 (30%) | ~25 | ~22 |
| Long onboarding questionnaire before the paywall | ~50 | 6 | 11 |
| Cancel/refund problems, charged after cancelling or trial | ~36 | 1 | 1 |
| Irregular / PCOS / peri / postpartum / IUD / BC handling | ~28 | 12 | 28 (mostly requests) |
| Prediction-accuracy complaints (keyword "predict/inaccurate/wrong/late") | ~82 (14%) | 29 | (praise in 4–5★) |
| Bugs / crash / login | ~66 (11%) | 9 | 11 |
| AI / bot complaints | ~23 | 2 | 3 |
| "No free version" (hard paywall) | ~21 | 1 | 3 |
| "Used to be free" (features moved to Premium) | ~14 | 2 | 2 |
| Privacy / lawsuit / "selling data" | ~15 | 0 | 0 |
| Apple Health sync removed | ~8 | 5 | 1 |
| Calendar weekday/date mismatch bug | 3 | 2 | 0 |
| Explicit mention of switching or deleting | ~70 (12%) | 7 | 14 |

— [App Store RSS](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)

**(a1) Hard paywall after onboarding (2026, recurring, about 25 reviews)**
- "spent 10 mins answering all the set up questions … just to find out at the end there is no free version of the app" [CA, 2026-09-06, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "after spending 10 minutes setting up the app, it wouldn't let me continue without paying for a subscription. Really disappointing that there is no free option for women's health." (user has PCOS) [GB, 2026-09-17, 1★] — [App Store RSS GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "Asks you a million questions then gives you a bill … after having me sign a disclaimer allowing them to use share and keep my data. And in the end says there's no free version. Feels like a scam" [US, 2026-10-26, 1★] — [App Store RSS US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "They trick you into answering all the questions then charge you for going any further in the app." [US, 2026-09-30, 1★] — [App Store RSS US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- **Conflicting evidence.** Some 2026 reviewers still describe a free tier, for example "you don't have to pay anything only if you want premium" [AU, 2026-09-26, 5★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json). The most likely explanation is that the hard paywall applies to new sign-ups or some cohorts and regions (A/B testing), while legacy users keep a limited free tier. This is not confirmed by Flo.
- RevenueCat describes Flo replacing its "Enable free trial" toggle with an explicit 14-day free-trial plan on a multi-plan paywall. The post is dated April 2026 ([RevenueCat blog](https://www.revenuecat.com/blog/growth/r-i-p-toggle-paywall-we-hardly-knew-ye/)).

**(a2) Free features moved behind Premium (recurring among long-time users)**
- "Wanting $25 a month for previous free features … options that were completely free 8 months ago … premium which was FREE for 8 years !!" [AU, 2026-04-23, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "most the content used to be free … but now if I want literally any insights I HAVE TO pay … goodbye all the helpful insights i used to love." [AU, 2026-03-30, 2★] — same source
- Pregnancy mode now costs extra: "Now that I'm pregnant again … I now have to pay an additional monthly fee for it. Cancelled my subscription after like 8 years" [AU, 2026-03-21, 1★] — same source
- Notifications are paywalled: "Why is every single notification blocked by a pay wall? Legit every single one." [AU, 2026-09-29, 1★] — same source
- Basic stats removed: "basic features just keep disappearing. I can't even find how long my cycle was anymore without manually counting the calendar days." [US, 2026-10-05, 1★] — [App Store RSS US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Ovulation day hidden: "the new update now means that I get zero information of what day I'm ovulating" [AU, 2026-09-09, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)

**(a3) Pricing levels quoted by users** (user-reported, unverified, and they vary by region and plan)
- "$25 a month" [AU, 2026-11-01 and 2026-05-17]
- "$99 membership" / "$99 for a year and I got charged $130" [AU, 2026-07-17]
- "$120 a year" [AU, 2026-05-11]
- "$35 every single month" [AU, 2026-07-05]
- "$49.99 a month" [AU, 2026-02-27]
- "80cad a year" [CA, 2026-09-23]
- "10 quid" a month, with the reviewer saying they would pay "2-3 quid" [GB, 2026-10-24]
- Users also ask for a **one-off purchase**: "or that it wasn't a yearly subscription … maybe a one off purchase" [AU, 2026-10-06, 4★]

All from [App Store RSS](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json). No official 2026 price list was found.

**(a4) Aggressive upsell pop-ups and dark patterns (about 30% of 1–2★)**
- "i can't even immediately close them, instead i have to tap 'unlock sale' and then press 'x' and THEN say no AGAIN when i'm prompted with an 'are you sure :( :('" [AU, 2026-10-01, 2★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "they 'hide' the exist [exit] click … the Temu style" [AU, 2026-09-14, 1★] — same source
- "have to wait 20 seconds for your ad to disappear and click IM SURE" [GB, 2026-10-01, 2★] — [App Store RSS GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "add guilt trips, like a sad character … make the user feel like 'the chosen one' for discounts" [CA, 2026-09-15, 3★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Paying users still see ads: "Why do I keep getting ads even when I've paid for premium?" [AU, 2026-10-17, 2★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Upsells via the bot: "I keep being hounded to go into a chat just for it to ask me questions and say 'oh u need premium for that'" [AU, 2026-09-14, 1★] — same source
- Google Play, same theme: "worst tracker due to the pay blockers and ad … multiple ads that make you have to pay in order to read or watch an informative video" [2★, 13 Oct 2025] — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)

**(a5) Billing, cancellation and refunds (about 36 low-star reviews)**
- The web-subscription loop: "The app tells me to cancel through the website because that's where I signed up. The website sends me to a survey I've already completed, then tells me to download the app. Around and around we go, subscription still active." [AU, 2026-10-25, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "continued to charge me $49.99 a month - even after I cancelled the subscription in the App Store. I had to follow complicated instructions via AI to figure out how to cancel" [AU, 2026-02-27, 1★] — same source
- "It's been 11 months since I cancelled !!" [CA, 2026-10-19, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- No renewal reminder: "annual subscription renewed without any reminder. I requested a refund, but it was rejected" [AU, 2026-10-24, 1★]; "charged $99 … The money … was meant to pay for my rent" [AU, 2026-08-07, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Annual price hidden in the fine print: "advertised as a monthly charge, but was sneaky to put full annual charge in fine print" [CA, 2026-09-09, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- A $1 offer from a Facebook quiz led to a web subscription that was hard to cancel because it is "pas dans l'app store mais … sur le site web de flo" [CA, 2026-09-17, 1★, French] — same source
- Web search snippets from Trustpilot pages (2025–26) show the same pattern: billing after cancellation or account deletion, and web and app subscriptions overlapping. Flo's replies point users to its web-cancellation page. These are search-snippet summaries only, because Trustpilot could not be fetched ([Trustpilot flo.health p.4](https://www.trustpilot.com/review/flo.health?page=4), [Trustpilot CA p.2](https://ca.trustpilot.com/review/flo.health?page=2)).

**(a6) Prediction accuracy, especially for non-standard cycles**
- Perimenopause: "I'm really hating the new predictions … I'm in the early stages of peri … flo was pretty intuitive and it was great to see 'Period in x many days'" [AU, 2026-09-12, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Postpartum: "when my cycle was coming back post partum it said I may have PCOS because of one or two longer cycles. There is nowhere to get it to ignore that alert." [AU, 2026-09-09, 3★] — same source
- Postpartum and breastfeeding: "trying to convince me I'm in perimenopause because it does not take into account postpartum (even though I used the same app for pregnancy updates)" [CA, 2026-10-01, 3★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- PCOS: "doesn't let me note somewhere that I have PCOS especially the app starts assuming I'm pregnant when my periods are late" [AU, 2026-09-10, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- IUD and perimenopause: "It's almost like the app forgets that I have the IUD in place so it give inaccurate information." [CA, 2026-09-03, 2★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Coming off contraception: "no way to add that you've recently come off OCs … huge gaps unless you're the most straightforward case" (endometriosis, TTC) [AU, 2026-06-03, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Ovulation tests ignored: "doesn't properly update based on ovulation test results … predictions feel generic rather than personalised" [AU, 2026-04-22, 2★] — same source
- Pregnancy and cycle data not shared: "lack of data transfer from when I was pregnant" (the cycle tracker then flags "irregular") [CA, 2026-07-06, 2★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Unhelpful alerts: "I was on my period for 31 straight days and the app only told me '⚠️ cycles may be irregular' a week after I came back from the hospital" [CA, 2026-10-29, 2★] — same source
- Unwanted diagnosis nudges: "constantly trying to diagnose me or say I need a PCOS assessment" [AU, 2026-09-29, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Pregnancy loss handling: after logging a miscarriage, the app shows "a pop up saying I'm so long overdue for my period every day" [AU, 2026-07-18, 4★] — same source

**(a7) Bugs, crashes and data loss**
- 2026 calendar bug: weekdays don't match dates. "claims that the 5th of October is a Tuesday when it is Monday" [GB, 2026-10-04, 3★]. Another reviewer says it is "glitched like this for over a month" [US, 2026-10-15, 1★], and a third says support "said they're working on it this was months ago" [GB, 2026-10-21, 1★]. Sources: [App Store RSS GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Data loss: "Flo deleted all my data since 2018" after a new phone [CA, 2026-06-29, 1★]; "it's lost all my data with no change to my phone or the app" [AU, 2026-08-31, 1★]; "Flo has deleted my data and started my account anew even though I'm paying for premium" [GB, 2026-09-02, 1★]. Sources: App Store RSS [CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json) / [AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json) / [GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Crashes and freezes: "stays on the flow start up cover page. Won't load at all" [AU, 2026-09-07, 2★]; "crashed and … i still can't even open it" [US, 2026-10-22, 1★]; layout broken on new hardware, "not compatible with IPhone 17 Pro Max, the screen is squished" [CA, 2026-09-24, 4★]
- Widget broken: "my phone still has the widget but it says not available no more" [AU, 2026-03-29, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Account switching (Android): "when you log in with the wrong account … it just doesn't let you … I've had to uninstall and reinstall twice" [3★, 14 Sep 2026] — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)

**(a8) Apple Health integration removed** (about 14 mentions, mostly 2026)
- "How can you stop syncing data to Apple Health without an announcement. I refuse to enter this information twice, so bye" [CA, 2026-08-11, 2★]
- "Please bring back feature to sync your Flo data with Apple Health" [CA, 2026-10-12, 3★]
- One reviewer links the removal to privacy tightening after the data-sharing cases: "no longer shared that data outward to your iPhone's HEALTH app and there's no way to opt back into that now" [CA, 2026-07-08, 3★]

All from [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json).

**(a9) AI, bots and content clutter (about 28 mentions)**
- "Why does my period tracker suddenly need AI to tell me something a calendar/algorithm has been doing perfectly well" [AU, 2026-09-02, 1★]
- "I wish I could actually talk to someone and not get ai answers" [AU, 2026-05-16, 3★]
- Complaints about AI-generated images and videos [AU, 2026-04-12, 1★]
- On Android, a 4★ reviewer wants to "turn off, or skip parts of, the bot chat stuff. Its programming/information is too general" [17 Mar 2025] — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)
- Unwanted sexual content on the home screen: "notifications and sex topic banners overly in your face and click bait-ish" [AU, 2026-09-29, 1★]; "I wish there was an option for me to not view those recommended posts" [AU, 2026-05-07, 3★]

App Store items from [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json).

**(a10) Notifications**
- Settings ignored: "I have my notification presets to only receive notifications regarding my upcoming period, yet I receive notifications about promotions ovulation and 50,000 other things" [AU, 2026-07-04, 1★]
- Too many: "constant notifications … feel excessive and irrelevant, like the app is more focused on engagement" [AU, 2026-04-22, 2★]
- Wrong: "my period is 90 days late but I've literally logged my last three periods" [GB, 2026-10-28, 2★]

Sources: [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json).

**(a11) Support**
- Canned replies, then silence: "They replied with the exact same copy and paste message about correcting the dates … They just stopped replying" [CA, 2026-10-13, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- No human support: "no customer service department only ai bots" [GB, 2026-09-02, 1★] — [App Store RSS GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Refunds routed to Apple and declined: several AU reviews, 2026 — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)

**(a12) Inclusivity and edge cases**
- "How can there not be an option for my partner to be a woman" [AU, 2026-06-11, 1★]
- "the sex section is just about straight people" [AU, 2026-09-02, 4★]
- Hysterectomy users can't log their situation [AU, 2026-09-18, 1★]
- Temperature charts are locked to Fahrenheit: "Please allow for the choice for data to be graphed/viewed in Celsius permanently" [AU, 2026-04-02, 2★]
- The birth-year list stops before 2013, which excludes 13-year-olds [AU, 2026-09-11, 4★]

All from [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json).

### Inferences
- The 2026 shift in complaints has been **from "too many upsells" to "no free product at all"** for new users. Combined with a long, personal onboarding questionnaire, this produces the "bait-and-switch" and "scam" framing, which is the most emotionally charged theme in the sample.
- Subscriptions bought on the web and through Facebook-quiz funnels (outside the App Store) are behind a large share of the "can't cancel / charged after cancelling" complaints. In-app cancellation and renewal reminders would remove much of this anger.
- Prediction complaints are less about the average-cycle algorithm and more about **missing context fields**: PCOS, endometriosis, IUD, coming off the pill, postpartum or breastfeeding, perimenopause, pregnancy loss, and hysterectomy. They are also about the lack of a way to **dismiss repeated diagnostic nudges**.
- Keyword counts are approximate. Some "ads" matches are upsell pop-ups rather than third-party ads, and Flo appears to show mainly self-promotional upsells.

### Gaps
- Google Play reviews could only be sampled (3 visible reviews), because the full review feed was not reachable. The Android-specific frequency of each theme is unknown.
- Trustpilot, Reddit and JustUseApp could not be fetched in this session. Reddit sentiment (r/PCOS, r/TryingForABaby and others) is therefore not represented directly.
- No official Flo pricing for 2025–2026 was found. Prices above are user-reported.
- Whether the "no free version" experience applies to all new users or is a regional A/B test is not confirmed.

---

## Q2. Privacy: FTC settlement, 2025 Meta verdict and class settlement, and user reactions

### Takeaway
Flo settled FTC charges in 2021 over sharing health data with Facebook, Google and other analytics firms in 2016–2019. In a consolidated class action (Frasco v. Flo Health), Flo ($8M), Google ($48M) and Flurry ($3.5M) settled for **$59.5M**. Meta went to trial and lost: a San Francisco federal jury found in **August 2025** that it violated California's Invasion of Privacy Act. Meta says it will appeal. In the 2026 reviews, privacy is a small but intensely negative theme (about 15 reviews, all 1★). Users often wrongly describe it as Flo currently "selling data", and it sometimes acts as the final straw for leaving.

### Cited Findings

**FTC (2021; historical)**
- The FTC alleged that Flo shared health data from millions of users with Facebook's and Google's analytics divisions, Google's Fabric, AppsFlyer and Flurry, despite promising privacy. The shared data included facts such as a user's pregnancy. The practice stopped only after a February 2019 Wall Street Journal report. Under the order, Flo must obtain affirmative consent before sharing health data, get an independent privacy review, notify affected users, and have third parties destroy the data. The proposed settlement was approved 5-0 in January 2021 and finalised by a 4-0-1 vote. Flo said the agreement was not an admission of wrongdoing. Sources: [FTC](https://www.ftc.gov/node/73903); [Healthcare IT Today, 14 Jan 2021](https://www.healthcareittoday.com/2021/01/14/ftc-settlement-with-fertility-tracking-app-maker-flo-health-over-data-disclosure-allegations/); [Becker's](https://www.beckershospitalreview.com/digital-marketing/fertility-app-company-accused-of-sharing-private-data-to-sell-ads-settles-with-ftc/). These details come via search-result summaries, because the FTC page itself returned 404/403.

**Class action (Frasco v. Flo Health) and the Meta jury verdict (2025–2026)**
- The jury found Meta violated the California Invasion of Privacy Act. Plaintiffs alleged that Meta gathered data via an SDK embedded in Flo. Flo settled during the trial, the day before the verdict, for an undisclosed sum at the time. Google and Flurry had settled earlier. EPIC counsel said the verdict "sends a message to the industry." Meta said it "vigorously" disagrees and that "the plaintiffs' claims against Meta are simply false." — [The Record](https://therecord.media/jury-verdict-meta-flo-app-data-privacy-case)
- The verdict date is reported as 1 Aug 2025 by most sources. One outlet (Green Matters) says 11 Aug 2025. Trial evidence included custom app events such as "R_SELECT_LAST_PERIOD_DATE". — [SAN](https://san.com/cc/federal-jury-finds-meta-illegally-farmed-data-from-flo-period-tracker-app/); [Labaton case page](https://www.labaton.com/cases/frasco-v-flo-health-inc)
- Settlement terms: Google $48M, Flo $8M, Flurry $3.5M, for $59.5M in total. The class is app users from **1 Nov 2016 to 28 Feb 2019**. Up to $19.3M of the fund goes to attorneys' fees. Flo must display a privacy-commitment notice on its website for one year after final approval. Preliminary approval came in 2026, and the fairness hearing was set for 29 Oct 2026. "Meta Platforms intends to file an appeal." The article also cites more than 38 million monthly users. — [HIPAA Journal, 18 Jun 2026](https://www.hipaajournal.com/flo-health-google-flurry-59-5m-settlement-privacy-lawsuit/); [Bloomberg Law](https://news.bloomberglaw.com/class-action/menstrual-tracking-app-flo-settles-privacy-case-during-trial)
- Claim deadline: 15 Oct 2026 — [Top Class Actions](https://topclassactions.com/lawsuit-settlements/open-lawsuit-settlements/59-5m-flo-data-sharing-class-action-settlement) (via search snippet)
- Damages against Meta: no amount was found. CIPA allows $5,000 per violation, but the verdict decided liability only — [Tom's Guide](https://www.tomsguide.com/computing/online-security/jury-finds-meta-illegally-collected-data-from-womens-health-app-flo-what-you-need-to-know) (via search snippet)

**Flo's privacy features and third-party assessments**
- Flo launched **Anonymous Mode** on 30 Jun 2022, after the Dobbs decision. It removes personal identifiers such as name and email. It is opt-in, not default, and users "will no longer be able to recover data when the device is lost, changed, or stolen." — [Flo newsroom](https://flo.health/newsroom/flo-launches-anonymous-mode) (via search snippet); [Campaign](https://campaignlive.com/article/period-tracker-app-flo-turns-anonymous-mode-will-ease-user-privacy-concerns/1799360)
- Mozilla *Privacy Not Included* (9 Aug 2022) gave a "Warning" label and a "Very creepy" user vote. It noted the policy left room for future data sales and recommended turning on Anonymous Mode. A later Mozilla "Privacy Review: Flo" credited Anonymous Mode as a real improvement: AppsFlyer "goes quiet" once it is enabled. However, AppsFlyer had already received the device identifier in clear text before the mode was turned on. — [Mozilla PNI](https://www.mozillafoundation.org/en/privacynotincluded/flo-ovulation-period-tracker); [Mozilla Privacy Review](https://www.mozillafoundation.org/en/nothing-personal/flo-app-privacy-review/). These details come via search-result summaries, because the pages could not be fetched.
- The current Google Play Data-safety label claims "No data shared with third parties", says data is encrypted in transit, and says deletion can be requested — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)

**User reactions (App Store RSS, 2026)**
- "I've just switched to Stardust for tracking my period after reading about the lawsuit for illegally sharing users data to third parties." [AU, 2026-02-18, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "Do not use this app they just lost a lawsuit for selling their users data to Meta." [US, 2026-09-21, 1★]. This is factually off: Meta, not Flo, lost at trial, and Flo settled. — [App Store RSS US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "There is a current class action lawsuit against Flo … I will be deleting my account." [AU, 2026-08-10, 1★]; "highly disappointed to find out data was sold to meta" [AU, 2026-07-01, 2★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- "I've used this app for years and loved it, but I've just read online that they are in a lawsuit for selling our health information to meta" [GB, 2026-10-30, 1★] — [App Store RSS GB](https://itunes.apple.com/gb/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Some users link the paywall and privacy grievances: "they already make money selling my data so why take more money from me" [CA, 2026-06-16, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Discomfort with intimate onboarding questions: "No flo, I don't want to tell you details of my sex life, so weird and invasive." [AU, 2026-08-31, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Privacy trade-off cost a feature: a user says that after the data-sharing scandal Flo stopped Apple Health sharing "and there's no way to opt back into that now" [CA, 2026-07-08, 3★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)

### Inferences
- The settlement news cycle, with claims open until October 2026, kept "Flo sold my data" in circulation through 2026. A competitor can position on verifiable privacy, for example local-first or end-to-end encrypted storage and no third-party SDKs. Users do not distinguish nuance, so the message needs to be simple.
- Anonymous Mode's trade-off (no recovery if the device is lost) collides with the "lost 8 years of data" complaints. Encrypted backup the user controls would resolve both.

### Gaps
- The amount of any damages award against Meta and the status of its appeal as of November 2026 were not found.
- The outcome of the final-approval hearing (29 Oct 2026) was not found.
- Consumer Reports' period-app privacy evaluation could not be fetched.
- No 2026 data was found on how many users use Anonymous Mode or request deletion.

---

## Q3. What do users like, or find neutral or mixed?

### Takeaway
Positive reviews (533 of 1,250 at 4–5★) praise **accuracy for regular cycles, ease of use and design, pregnancy and TTC support, and educational content**. Many 3★ reviews are "great tracker, ruined by upsells". Partner mode is valued in principle but described as thin.

### Cited Findings
- Accuracy (about 51 positive mentions at 4–5★): "gives pretty accurate predictions and lots of helpful information" [AU, 2026-10-05, 5★]; "helped me track two pregnancies and has been spot on" [AU, 2026-09-04, 5★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Ease of use and design: "From Clue to Flo … It's so much EASIER to navigate. It's accurate, doesn't harass me to buy premium" [CA, 2026-10-19, 5★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json). The same reviewer reports no harassment, which suggests upsell intensity varies between users.
- Mixed view: "The only reason I'm not scoring lower is because the UX is great" [AU, 2026-06-03, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Pregnancy and TTC (about 91 mentions at 4–5★, the largest positive theme): "I didn't know I was pregnant and the app was what made me realise I was!" [AU, 2026-07-31, 5★]; "Doctor (GP) recommended … even notified me of any abnormalities in my cycles and symptoms" [AU, 2026-08-02, 5★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Symptom logging as a health record: "tracking my symptoms has made conversations with my healthcare providers so much easier" [CA, 2026-07-15, 5★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json). Also: "enjoyed the ability to inputs many different types of data" [AU, 2026-07-09, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Content library, mixed (about 74 mentions at 4–5★ and 67 at 1–2★): praised as educational, for example "great addition to my knowledge on my menstrual cycle" [AU, 2026-07-31, 5★]. It is also criticised as generic or repetitive, for example "The same articles for 9 months" [AU, 2026-07-17, 1★], and as "not the most value adding thing in this AI era" [AU, 2026-09-10, 2★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Perimenopause mode, mixed: one reviewer finds it useful, "So useful in tracking my perimenopause symptoms" [AU, 2026-09-02, 4★]. Another finds it shallow, with "a smattering of info about menopause … certainly not worth $35 every single month", the setting buried "deep inside settings", and no way to log HRT patch or progesterone [AU, 2026-07-05, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Partner mode ("Flo for Partners"), mixed:
  - Positive: "I love that even my partner can track and understand my cycle and how I may be feeling" [AU, 2026-05-29, 5★]
  - Negative: "the partner access is extremely lacking. Almost no point to have it." [AU, 2026-07-09, 3★]
  - Request: the partner sees only period phases, not "what symptoms I be having or how I feel" [CA, 2026-10-21, 5★]
  - No same-sex partner linking [AU, 2026-04-14 and 2026-06-11]
  - Sources: App Store RSS [AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json) / [CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Partner mode on Android: "my husband can also view & track my period via this app. For some reason the other apps are giving him issues" [2★, 13 Oct 2025] — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)
- Pregnancy mode, mixed: praised as a "perfect pregnancy tracker" [AU, 2026-03-21] but now an extra fee. It has no IVF transfer-date input in the app ("The Flo website allows you to input transfer IVF date … The app goes off last cycle") [AU, 2026-03-31, 2★]. Another user says "it doesn't know im pregnant it's only suggesting unrelated topics" [AU, 2026-09-06, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Widget is liked: "I love having the widget!!!" [CA, 2026-08-05, 5★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Adapts to change: "Incredibly useful for tracking periods, as it adjusts to changes" [4★, 17 Mar 2025] — [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US)
- Typical 3★ framing: "Would be 5 stars without the same constant promotion ad" [AU, 2026-06-14, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)

### Inferences
- Flo's core strengths (clean UX, broad symptom logging, pregnancy continuity) are table stakes that users would happily take elsewhere. Loyalty rests on habit and years of history, which is why data loss and paywalling that history provoke strong reactions.

### Gaps
- No 2023–2026 independent accuracy study of Flo predictions was found in this pass.

---

## Q4. Which improvements do users explicitly request? And what feature ideas could a competing app add?

### Takeaway
The explicit requests are:
- A genuinely free core tracker, or a cheaper or one-off price.
- Upsells that are fewer and easy to dismiss.
- Condition and context fields: PCOS, endometriosis, IUD or implant, coming off the pill, postpartum or breastfeeding, IVF, hysterectomy, pregnancy loss.
- Custom symptoms.
- Notification controls that are respected.
- Restored Apple Health sync and better wearable data.
- Richer partner sharing, including same-sex couples and dark mode.
- Unit and locale settings.
- Human support and in-app feedback.

Data export was **not** mentioned in the sample: 0 hits for "export", "pdf" or "download my data".

### Cited Findings

**(c) Explicit requests (App Store RSS 2026 unless stated)**
- Free core or cheaper pricing: "I just wish you got a little more with the free version, or that it wasn't a yearly subscription … maybe a one off purchase" [AU, 2026-10-06, 4★]; "love it - wish it was cheaper" [CA, 2026-10-06, 4★]
- Opt out of upsells: "let me opt out of the ads at least, i just want to track my period" [AU, 2026-09-14, 1★]; "removing the pop ups might make the app more efficient" [CA, 2026-09-08, 2★]
- Custom symptoms: "the ability to add your own custom symptoms and mood to the current list" [AU, 2026-02-24, 4★]. On Android: "more symptom options, even just an add your own" [Play, 4★, Mar 2025]
- Condition flags: "a feature to add if you have PMOS [PCOS] or Endo so it doesn't keep promoting guessing why you have xyz symptoms when you already know" [AU, 2026-07-01, 5★]; "Needs PCOS Option" [AU, 2026-09-10, 1★]
- Contraception logging: "an option to add in contraceptives such as the rod/bar, IUD, etc into the log symptoms section" [AU, 2026-04-21, 3★]
- Postpartum and breastfeeding: "I wish there were more postpartum symptoms and info added" [AU, 2026-08-29, 5★]; the app should account for exclusive breastfeeding delaying the return of cycles [CA, 2026-10-01, 3★]
- IVF: "I'd love to see IVF-specific tracking and guidance added" [AU, 2026-08-03, 4★]; IVF transfer date in the app [AU, 2026-03-31, 2★]
- Pregnancy-loss handling: the app should retain the pregnancy-loss context and stop "overdue" reminders [AU, 2026-07-18, 4★]
- Dismiss alerts: "There is nowhere to get it to ignore that alert" (the PCOS flag) [AU, 2026-09-09, 3★]
- Notifications: users want their notification presets respected [AU, 2026-07-04, 1★]
- Apple Health and wearables: "Please bring back feature to sync your Flo data with Apple Health" [CA, 2026-10-12, 3★]; "utilised health statistics from Apple Watch more thoroughly" and "a food journal" [AU, 2026-05-28, 3★]; a user notes "My Garmin watch and ovulation tests give me the same amount of useful info as this app" [AU, 2026-06-03, 3★]
- Ovulation test results should update predictions [AU, 2026-04-22, 2★]
- Partner sharing: share symptoms and mood with the partner, not just phases [CA, 2026-10-21, 5★]; "link up accounts for like, lesbians couples" [AU, 2026-04-14, 5★]; "partner mode doesn't have the dark mode. Could Flo team please add it" [AU, 2026-06-05, 4★]
- Home-screen layout: show cycle day as its own home tile ("day 20 - what to expect"), and stop making the date number "2.5 the size of our cycle day number" [AU, 2026-07-05, 1★]
- Charts: "The chart has no time on the axis" [AU, 2026-09-10, 2★]
- Units and locale: permanent Celsius setting [AU, 2026-04-02, 2★]
- Age: allow birth year 2013 for young teens [AU, 2026-09-11, 4★]
- Content controls: hide sexual-content recommendations [AU, 2026-05-07, 3★]; inclusive sex content [AU, 2026-09-02, 4★]; a "neutral"/"not applicable" option for sex-drive questions [CA, 2026-07-16, 4★]
- Bot: make the bot chat skippable [Play, 4★, Mar 2025]
- Human help: "talk to someone and not get ai answers" [AU, 2026-05-16, 3★]
- Feedback channel: "I wish there was a way to provide this type of feedback on the app without having to write a review" [CA, 2026-10-23, 3★]
- Cancellation: "wish it was as easy as it was to take my payment to sign up" [CA, 2026-07-18, 1★]

Sources: [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json), [Google Play listing](https://play.google.com/store/apps/details?id=org.iggymedia.periodtracker&hl=en_US&gl=US).

### Inferences: (d) feature ideas for a competing private app (one user plus partner; social and community features excluded)

1. **A free core tracker and an honest paywall.** Make logging, predictions, the fertile window, ovulation day, cycle-length stats, the calendar and reminders free forever. State the price before onboarding, offer a one-time or lifetime purchase, and have no pop-ups that need several taps to dismiss. Evidence: the hard-paywall, "used to be free" and dark-pattern complaints above.
2. **Cancellation and renewal transparency.** Use App Store or Play billing only, with no web-quiz funnels. Send an in-app renewal reminder 7 days ahead. Offer one-tap cancel. Evidence: section (a5).
3. **A cycle context and conditions profile** that the prediction engine actually uses: PCOS, endometriosis, IUD (hormonal or copper), implant, coming off the pill (with date), postpartum and breastfeeding, perimenopause or HRT (patch, progesterone), hysterectomy or ablation, IVF (transfer date), and pregnancy loss.
4. **Dismissible, explainable predictions.** Show a confidence range ("period likely 3–7 Nov") instead of a single day. Explain why a prediction changed. Offer "ignore this alert" for diagnostic nudges. Use ovulation-test, BBT and wearable data as inputs.
5. **Smooth mode transitions.** Carry pregnancy into postpartum and then back to cycle tracking without flagging false irregularity. Handle pregnancy loss gently: no "overdue" alerts, plus an optional private memorial note.
6. **Custom symptoms, moods and tags**, plus custom medications and supplements.
7. **Data export** (CSV/PDF doctor summary) and a **user-controlled encrypted backup or restore**. This addresses the "lost 8 years of data" and Anonymous-Mode recovery trade-off, even though export was not explicitly requested in this sample.
8. **Two-way health integrations:** Apple Health and Health Connect read/write, Apple Watch and Garmin temperature, and Oura. Make the integration opt-in, with clear consent.
9. **Granular notification controls** that are honoured, with no promotional notifications.
10. **Richer partner mode.** The user chooses what to share (phase, symptoms, mood, a "needs" note). Support any gender pairing. Include dark mode and partner-specific tips. Keep it one-to-one, not social.
11. **Content controls:** toggle off sexual-health, fertility or TTC content for users who are not TTC; offer an inclusive sex section; and offer an "AI off" or "no chatbot" switch.
12. **Customisable home screen.** Make the cycle day prominent and add widgets (lock screen and home screen), with a working calendar widget.
13. **Locale and age settings:** Celsius or Fahrenheit, first day of week, a correct calendar, and teen mode (from age 10 to 13) with parental privacy safeguards.
14. **An in-app feedback channel and human support.**
15. **Privacy by design**, given the Flo settlement history: no third-party analytics or ad SDKs, a local-first or end-to-end encrypted store, anonymous use without an account, and a plain-language data statement.

### Gaps
- Dark mode for the main app, offline use, and data export were not explicitly requested in the 2026 App Store sample. Only "dark mode for partner mode" appeared. Their absence may reflect the sample, or Flo may already offer them; this was not verified.
- Reddit, where power-user requests such as export and BBT charting are more common, could not be accessed.

---

## Q5. What would make users switch away from Flo, and where do they go?

### Takeaway
About 12% of recent 1–2★ reviews mention deleting the app or switching. In descending order of frequency, the triggers are:
1. Upsell harassment and paywalls.
2. Billing or cancellation problems.
3. Privacy news (lawsuit or Meta).
4. Lost Apple Health sync or lost data.
5. Prediction inflexibility.

Named destinations include **Clue, Stardust, Apple Health's Cycle Tracking, the "Balance" app (for perimenopause), a plain calendar or notes, and unnamed free pregnancy apps**. One reviewer moved the other way, from Clue to Flo, for usability.

### Cited Findings
- Clue:
  - "I've been using Clue for a while now and would genuinely recommend it over Flo." [AU, 2026-09-18, 2★]
  - "I originally used clue … switched to Flo but I am going to have to switch back because of how irritating it is to constantly be asked to subscribe." [AU, 2026-04-07, 1★]
  - Source: [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Stardust (privacy-driven): "I've just switched to Stardust … after reading about the lawsuit" [AU, 2026-02-18, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Apple Health Cycle Tracking:
  - "I'll be switching back to the Apple Health app." [CA, 2026-09-29, 1★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
  - "I didn't find it any better than the services provided by Apple health." [AU, 2026-07-13, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Balance (perimenopause): "the 'Balance' app, gives all the same tools and far more useful information, and it's free. Flo appears to just be flashier and have better marketing." [AU, 2026-04-04, 2★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Calendar or notes:
  - "just use my own calendar and bye" [CA, 2026-09-23, 3★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
  - "I'd rather use my calendar at this point because it's free." [AU, 2026-03-02, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
  - "Imma just write it in my no[tes]" [AU, 2026-09-25, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Free pregnancy app: after pregnancy mode became an extra fee, the user "downloaded a free pregnancy tracking app" [AU, 2026-03-21, 1★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Garmin plus ovulation tests used as a substitute [AU, 2026-06-03, 3★] — [App Store RSS AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Final-straw framing:
  - "Uninstalling after years of using Flo." (AI plus pop-ups) [AU, 2026-09-02, 1★]
  - "I deleted this app after years of use (and for a while was a premium member)" [US, 2026-10-05, 1★]
  - "I refuse to enter this information twice, so bye" (Apple Health sync) [CA, 2026-08-11, 2★]
  - Sources: App Store RSS [AU](https://itunes.apple.com/au/rss/customerreviews/id=1038369065/sortby=mostrecent/json) / [US](https://itunes.apple.com/us/rss/customerreviews/id=1038369065/sortby=mostrecent/json) / [CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Reverse switch, Clue to Flo: "I used clue for over 9 years … It's so much EASIER to navigate." [CA, 2026-10-19, 5★] — [App Store RSS CA](https://itunes.apple.com/ca/rss/customerreviews/id=1038369065/sortby=mostrecent/json)
- Apple's Health app includes built-in Cycle Tracking, which gives users a free basic log within the iPhone ecosystem (search-result context) — [Wikipedia: Flo (app)](https://en.wikipedia.org/wiki/Flo_(app))

### Inferences
- The switching threshold is low for users whose needs are simple: they will take a free calendar over a paywalled Flo. A competitor wins them with a polished free core, **one-tap import from Flo** (and from Clue and Apple Health), and a clear "no data sharing, no pop-ups" promise.
- Users with complex needs (PCOS, perimenopause, postpartum, IVF) churn because of missing context. They are a segment willing to pay for depth if the pricing is honest.
- Many reviewers say they have years of Flo history. **Import from Flo** is therefore likely a key switching enabler. Flo's own data-export capability was not verified in this research.

### Gaps
- Reddit switching threads (r/PCOS, r/TryingForABaby, r/privacy) could not be fetched, so destinations such as Drip, Euki, Natural Cycles, Read Your Body, Period Calendar and Ovia were not observed in this sample. Their absence is not evidence that users don't switch to them.
- How well Flo's data export or "download my data" works was not verified.
