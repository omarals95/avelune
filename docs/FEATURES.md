# Avelune: features and screens

*Your rhythm. Your space.*

Avelune is a private tracker for periods, ovulation and pregnancy. It runs on Android, iPhone and the web. Everything is stored on the device. You can add sync through your own server, and sync is end-to-end encrypted. There is no chat, social feed, ads or account requirement.

---

## 1. Platforms and architecture

| Part | What it is |
|---|---|
| **Mobile app** | Expo / React Native app for Android and iPhone. It works fully offline with no account. |
| **Web app** | The same app built for the browser and served by your self-hosted server. |
| **Self-hosted server** | Fastify + SQLite. It stores only encrypted data. It handles sign-in, sync and partner shares. |
| **Core library** | Shared logic for predictions, encryption, reminders, health data, CSV import/export and partner snapshots. It has 46 unit tests. |
| **Android APK** | Built automatically by GitHub Actions (`cyclo-android-apk` artifact). |

---

## 2. Navigation

- **Floating bottom bar** (Samsung Health style): a dark plum pill with four tabs, **Today**, **Health**, **Insights** and **Partner**. A fade animation plays when you switch tabs.
- **Quick-log button (+)** next to the bar opens today's log.
- **Avatar** (top-left on Today and Health) opens **Settings**.
- Other screens open as full-height sheets:
  - Log
  - Calendar
  - Settings
  - Article
  - Pregnancy week
  - Chart
  - Health connections

---

## 3. Screens

### 3.1 Onboarding (first launch)
The animated Avelune logo, the tagline and a short privacy note.

- **Start tracking**:
  1. *When did your last period start?* Pick the date on a month calendar; future days are disabled.
  2. *Your usual cycle*: set cycle length (21–45 days) and period length (2–10 days).
- **I already use an Avelune server**: sign in and restore your encrypted data.
- **My partner shared their cycle**: paste an invite code to open the partner (view-only) mode.
- A disclaimer says Avelune is not a medical device and not contraception.

### 3.2 Today (home)
- **Header**: the avatar (your initial or the Avelune symbol), the selected date, and a calendar button.
- **Week strip**: the current week with each day coloured by type (period, predicted, fertile, ovulation). Today is marked; tap a day to select it.
- **Bloom**: a large animated flower for the current phase, with the day's status in its open centre and an orbit marker showing progress through the cycle.
  - It shows lines such as "Period · Day 2", "Period in 5 days", "Fertile window · Higher chance of getting pregnant", "Expected today" or "Late for 3 days". Before anything is logged it says "Log your period".
  - Tapping another day in the week strip shows that day's status (logged, predicted, fertile or ovulation).
  - After you edit period dates it pulses with a "Predictions updated" confirmation.
- **Action pills**: **Log period** opens the calendar editor; **Symptoms** opens the log.
- **Daily insight** card with a cropped bloom; tapping it opens the article that fits your phase.
- **Home widgets**: a grid you can customise (see §4).
- **Summary card**: next period, fertile window and average cycle length.
- **In pregnancy mode**:
  - The circle shows *Week N, Day N*, how many weeks to go and the due date, with a growth illustration.
  - Quick actions become Details, Symptoms, Sex and Weight.
  - The story cards become "Your baby at N weeks" and "Your body at N weeks".

### 3.3 Calendar (sheet)
- **Month view**: months scroll vertically, and the calendar opens on the current month.
  - Shapes and colours show day types: a filled rose circle is a logged period, a dashed rose ring is a predicted period, a green fill is fertile, and a dashed violet ring is ovulation.
  - Today is labelled.
  - Cycle day numbers can appear above dates (a setting).
- **Year view**: the whole year at a glance; tap a month to jump to it.
- **Legend** explaining every symbol.
- **Edit period dates**: tap days to add or remove period days, then **Save** or **Cancel**. Predictions recalculate afterwards.
- Tap a day (when not editing) to open that day's log.
- Shortcut to cycle settings.

### 3.4 Daily log (sheet)
- **Header**: close button, previous/next day arrows (future days are blocked), and the date with "Cycle day N".
- **Search** across all symptoms, moods, categories and measurements.
- **What are you feeling today?**: four large quick-pick symptoms. These are your most-logged symptoms, and the order stays fixed while you tap.
- **Categories** (chips; some are single-choice, and "none" options exclude the others):
  - **Period flow**: Light, Medium, Heavy, Spotting.
  - **Sex and sex drive**: Didn't have sex, Protected, Unprotected, Masturbation, High drive, Low drive. This category is hideable.
  - **Mood**: Calm, Happy, Energetic, Playful, Mood swings, Irritated, Sad, Anxious, Low energy, Apathetic, Confused, Self-critical.
  - **Symptoms**: Everything is fine, Cramps, Tender breasts, Headache, Acne, Backache, Fatigue, Cravings, Insomnia, Abdominal pain, Bloating, Nausea, Sleepiness, Dizziness, Frequent urination, Leg cramps, Swelling, Nasal congestion, Diarrhea, Constipation.
  - **Vaginal discharge**: None, Creamy, Watery, Sticky, Egg white, Spotting, Unusual.
  - **Tests**: ovulation test +/−, pregnancy test +/−.
  - **Pill**: Took pill, Missed pill.
  - **Other**: Travel, Stress, Disease or injury, Alcohol, Medication.
  - **Physical activity**: Didn't exercise, Yoga, Gym, Aerobics & dancing, Swimming, Team sports, Running, Cycling, Walking.
- **Water**: tap glasses of 250 ml each. The total is shown against your daily target.
- **Measurements**: basal temperature (°C/°F), weight (kg/lb), sleep (hours) and distance (km). Each has Add, −/+ and clear.
- **Notes**: free text.
- In pregnancy mode, the Flow, Tests and Pill categories are hidden.
- Every change saves instantly. With sync on, it also syncs (encrypted).

### 3.5 Health tab
- **Header**: the avatar, the title "Health", and a link button that opens Health connections.
- **Tabs**: a sticky row of pill tabs, **Overview**, **Activity**, **Sleep**, **Heart**, **Body** and **Water**, plus a "Sample data" note while demo data is on.
- **Overview**:
  - A "Connect your health data" card when nothing is connected.
  - A card for each metric: steps, sleep, water, resting heart rate, weight, temperature and blood oxygen.
    - Each card shows today's value against its goal (for example "5,420 / 8,000") and a 7-day mini chart.
    - Tapping a card opens its section.
- **Section pages** (Activity, Sleep, Heart, Body, Water):
  - A day picker with previous/next arrows and a date pill.
  - A **metric card** for each metric:

    | Section | Metrics |
    |---|---|
    | Activity | Steps (8,000 goal), Distance, Active energy |
    | Sleep | Sleep time (8 h goal) |
    | Heart | Resting heart rate, Blood oxygen (SpO₂) |
    | Body | Weight, Temperature |
    | Water | Water (your daily target) |

    Each card shows:
    - an animated count-up value for the chosen day;
    - a chart (bars or a line) with a Days / Weeks / Months range (14 days, 8 weeks or 6 months);
    - a goal line where a goal exists;
    - **Compare with → Cycle phases**, which overlays period, fertile and ovulation markers on the day chart.
  - **Other data** shortcuts to the other sections.

### 3.6 Health connections (sheet; also Settings → Health connections)
- **Apple Health** (iPhone): reads steps, distance, active energy, sleep, resting/average heart rate, weight, temperature, SpO₂ and water.
- **Health Connect** (Android): brings in **Samsung Health, Google Fit, Fitbit** and most wearables that sync to Health Connect. It requests read access, including history.
  - **Open Health Connect** and **Manage Health Connect permissions** buttons.
- **Fitbit account** (any platform, including web): direct OAuth sign-in.
  - You enter your Fitbit app Client ID, and a **Copy redirect URL** helper is provided.
  - Tokens are stored in secure storage.
- For each provider:
  - Connect, Sync now and Disconnect.
  - Status ("Connected · last sync …", "Not connected", "Not available here").
  - Clear results, for example "Imported N days of data" or a specific error.
- **Show sample data**: demo values for previewing widgets. They are clearly labelled and never mixed with real data.
- Health data stays on the device. It is not uploaded to your server or shared with your partner.
- Health data syncs automatically when the app opens.
- Sources are merged in priority order: manual > Apple Health > Health Connect > Fitbit.

### 3.7 Insights tab
- **Cycle statistics**: average cycle, average period, cycles logged, and regularity (Regular / Somewhat irregular / Irregular).
- **Graphs & reports**:
  - **Cycle duration**: a bar per cycle with period days; it also offers "Add previous periods".
  - **BBT and ovulation**: a temperature chart per cycle with period columns shaded. It detects a temperature shift ("ovulation ≈ date"), and you can step to the previous or next cycle.
  - **Weight**, **Activity**, **Water** (against your target) and **Sleep** charts.
- **Most logged** symptoms and moods, with counts.
- **Learn**: an article library.
  - Your cycle in four phases.
  - Understanding the fertile window.
  - Basal body temperature, explained.
  - When your period is late.
  - PMS: what can help.
  - Feeling better during your period.
  - Getting the most from a doctor visit.
  - Desire across the cycle (hideable).

### 3.8 Article (sheet)
A coloured header with a gently floating illustration, the article text fading in paragraph by paragraph, and a medical disclaimer.

### 3.9 Pregnancy week (sheet)
- A warm gradient background with an animated size-comparison illustration.
- A week picker (weeks 4–40).
- For each week: *How big is the baby?*, *Your baby* and *Your body*, followed by a disclaimer.

### 3.10 Partner tab
**For the person tracking:**
- If sync isn't set up, a **One step first** card with a **Set up sync** button.
- **Link your partner** creates an end-to-end encrypted, view-only share and an invite code (`avelune-partner:…`) to send. You can copy or share the code.
- **Share today's mood and symptoms** is optional and off by default.
- **Preview what your partner sees**.
- **Stop sharing** at any time. This revokes the share and deletes it from the server.
- Your partner never sees your notes or sex logs.
- The shared view updates automatically when your data changes.

**For the partner (viewer mode):**
- Paste the invite code during onboarding, or under Partner.
- View-only screens:
  - their daily cycle (cycle day and phase);
  - their next period (and whether it is late);
  - their fertile days and ovulation;
  - their pregnancy week and due date when pregnancy mode is on;
  - optionally, today's mood and symptoms;
  - a read-only calendar.
- **Refresh**, an "Updated N ago" time, and **Stop viewing**.

### 3.11 Settings (sheet)
- **Your name**, which is shown to your partner.
- **Appearance**: Match phone, Light or Dark.
- **Cycle and ovulation**:
  - Cycle length, period length and luteal phase (10–16 days).
  - **Chance of getting pregnant**: turn the fertile window on or off.
  - **Display cycle sequence**: cycle day numbers on the calendar, with an animated preview.
  - Daily water target (1.00–4.00 L).
- **Reminders** (§5).
- **Pregnancy mode**:
  - I'm pregnant on/off.
  - Set the first day of your last period, *or* the due date.
  - The current week and day are shown.
- **Hide content**: turn sex content off. It disappears from logging, quick actions and articles.
- **Units**: °C/°F and kg/lb.
- **Health connections**: the same screen as §3.6.
- **Health profile**: conditions and contraception (§7).
- **Backups**:
  - automatic daily encrypted backups (Android: a folder you choose; iOS: Files › On My iPhone › Avelune; web: download on demand);
  - backup passphrase;
  - last backup date;
  - **Test restore**;
  - **Restore** (merge or replace), also offered on the first screen of a fresh install.
- **Sync & encryption**:
  - Connect to your server, or show the connection status and last sync time.
  - **Sync now** and **Disconnect** (keeps the data on the device).
  - **Unlock** with your passphrase on a new device.
- **Your data**:
  - **Import from file**: Excel or CSV, with a downloadable template (§6).
  - **Export as CSV**.
  - **Export all data (JSON)**.
  - **Summary for my doctor**: a text summary with average cycle and period and the last 12 periods.
  - **Delete data on this device**.
  - **Delete my account and server data**, shown when connected. This also removes partner shares.

### 3.12 Import from file (Settings → Your data)

- Imports from **Apple Health** (`export.zip`, streamed with a progress bar), **drip.**, **Natural Cycles**, **Flo**, **Clue**, Avelune exports and spreadsheets. See `docs/import-format.md`.
- **Download example.xlsx**: a ready-made spreadsheet to fill in.
  - A *Your data* sheet with a date column, a flow drop-down and tips on every column.
  - A filled-in *Example* sheet, which is never imported.
  - A *How to fill* sheet listing every symptom, mood and tag Avelune understands.
- Choose an Excel `.xlsx` or `.csv` file (up to 5 MB) from your phone, cloud storage or computer. With `.xlsx`, the first sheet that has data is imported (skipping the example).
- **Preview before importing**:
  - number of rows and days;
  - date range;
  - period days found;
  - which columns were recognised;
  - skipped rows;
  - labels it could not match.
- **Date order** (DD/MM or MM/DD): picked automatically, and you are asked when the file is ambiguous.
- **Temperature unit** (°C/°F): detected automatically and can be overridden.
- **Replace my existing entries**: when off, it keeps what you logged and only fills gaps or adds symptoms; when on, imported values win.
- At the end it confirms "Imported N days".

---

## 4. Home widgets

On Today you can **add, remove and reorder** widgets. Reordering uses arrow buttons, so dragging isn't needed. Your layout is saved.

| Widget | Size | Shows |
|---|---|---|
| Cycle statistics | Full | Period length, cycle variation and cycle length |
| Next period | Half | Countdown ring to your next period |
| Steps | Half | Today's steps and a 7-day sparkline |
| Sleep | Half | Last night and the past week |
| Heart rate | Half | 14-day trend |
| Weight | Half | 30-day trend |
| Temperature & cycle | Full | BBT or skin temperature with phase colours |
| Water | Half | An animated glass filling up to your target |
| Activity | Half | Distance and active calories |
| Mood this cycle | Half | Your most-logged moods |
| Top symptoms | Half | Your most-logged symptoms (bars) |
| Blood oxygen | Half | Latest SpO₂ reading |

Health widgets open their Health section; cycle widgets open the cycle chart.

---

## 5. Reminders

Reminders are local notifications scheduled on the device from your own data. They don't use a push service. Each one has an on/off switch and a time.

| Group | Reminders |
|---|---|
| Cycle | Period in a couple of days (0–5 days before), Period start, Period end, Ovulation, Fertile window starts |
| Medication & contraception | Pill reminder |
| Lifestyle | Log weight, Log sleep, Drink water (from/until, every 1–6 h), Log temperature, Daily check-in |
| Privacy | **Discreet notifications**: the lock screen only says "You have a reminder" |

Cycle reminders pause in pregnancy mode. On the web, reminders are set up from the phone apps.

---

## 6. CSV import and export

- **Import** reads files from spreadsheets, other apps or Avelune exports.
  - It auto-detects the delimiter (comma, semicolon or tab), quotes and a BOM.
  - Headers are matched by synonym:

    | Field | Header names it accepts |
    |---|---|
    | Date | date, day, timestamp |
    | Period range | start/end, first/last day |
    | Flow | flow, period, bleeding, menstruation |
    | Symptoms | symptoms, pain |
    | Mood | mood, emotions, feelings |
    | Tags | tags, activities |
    | BBT | bbt, temperature, temp |
    | Weight | weight |
    | Water | water, hydration |
    | Sleep | sleep, hours slept |
    | Distance | distance |
    | Notes | notes, comments, journal |
    | Steps | steps |
    | Resting heart rate | resting HR, rhr |

  - It accepts one row per day *or* one row per period (start/end).
  - Labels are matched to Avelune's categories, including synonyms such as "back pain" → Backache.
  - Impossible dates (for example 31 February) are rejected.
- **Export as CSV** writes one row per day with readable labels.
- **Export as JSON** writes a full backup of every record.

---

## 7. Predictions that fit your life

- **What it predicts**:
  - next period, shown as a **likely window** (for example 11–17 Nov, most likely 14 Nov) with a **confidence level** (high, medium or low);
  - fertile window and ovulation day;
  - current phase and cycle day.
- **Why this estimate**: a list on the Today screen explains each forecast:
  - how many cycles it is based on;
  - how much your cycles vary;
  - which cycles were left out and why;
  - how your health profile changes it.

  When the estimate moves by two or more days, Today says so.
- **Honest irregular-cycle handling**:
  - It uses the median of your last six counted cycles, so one odd month doesn't skew the average.
  - Unusual cycles (likely a missed log or a one-off) are left out automatically. On Insights › Recent cycle length you can count or leave out any cycle.
  - There is no 60-day cap on cycle length: cycles of 10–120 days count, and the setting accepts 15–90 days.
  - "Late" only starts after the likely window ends. It is worded neutrally, and you can hide it for the current cycle.
- **Health profile** (Settings › Health profile) changes the predictions:
  - **Conditions:**
    - PCOS, perimenopause (with or without HRT), thyroid conditions and fertility treatment give wider ranges and lower confidence.
    - Endometriosis adds a note only.
    - No uterus or ablation turns the period forecast off.
  - **Contraception:**
    - Combined pill, ring, patch, implant and injection hide the fertile window.
    - Mini pill and hormonal IUD give wider ranges.
    - Copper IUD adds a note only.
  - **Stopped hormonal birth control:** bleeds before that date don't count as cycles, and ranges are wider for the next six months.
- **Forecast off**: show only days since your last period, with no dates or late notices.
- **Pause tracking**: stops predictions and cycle reminders. Logs are still saved.
- **Life stages** (Settings › Pregnancy & after):
  - **Pregnancy mode**: week and day, due date, and weeks to go.
  - **"My baby was born"** starts the postpartum stage. Bleeding in the first six weeks isn't counted as a period, and there are no predictions until your period returns (tap *Period started*). A breastfeeding switch is included.
  - **"My pregnancy ended (loss)"** starts a gentle mode:
    - pregnancy content is hidden;
    - there are no late notices;
    - predictions resume after your next period;
    - the cycle that included the pregnancy is never counted.
- **Statistics**: typical cycle and period length, and a regularity rating.
- **BBT**: temperature-shift ovulation detection on the chart.

---

## 8. Privacy and security

- **No account needed.** Data stays on the device unless you connect your own server.
- **End-to-end encryption**:
  - Keys are derived from your passphrase: scrypt, then HKDF.
  - Records are encrypted with XChaCha20-Poly1305.
  - Record IDs are HMAC-hashed.
  - The server stores only ciphertext.
  - The passphrase never leaves the device and cannot be recovered.
- **Partner shares** are encrypted with a separate random key carried in the invite code. Notes and sex logs are never shared.
- **Health data** stays on the device.
- **Discreet notifications** are available.
- **Full export** and **full deletion** (device and server).

---

## 9. Self-hosted server

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Server status and whether registration is open |
| `POST /api/auth/register`, `/login`, `/logout` | Accounts (rate-limited) |
| `GET/PUT /api/e2ee` | Encryption key info (set once) |
| `POST /api/sync` | Two-way encrypted record sync |
| `GET/PUT/DELETE /api/shares/:id` | Encrypted partner share (public read, owner write) |
| `DELETE /api/account` | Delete the account and all data |

- It also serves the **web app**.
- Configuration settings:

  | Setting | Purpose |
  |---|---|
  | `PORT` (default 8787) | Port the server listens on |
  | `HOST` | Address the server binds to |
  | `DB_PATH` | Location of the SQLite database |
  | `ALLOW_REGISTRATION` | Whether new accounts can be created |
  | `WEB_ROOT` | Folder of the web app to serve |

- It has 15 server tests.

---

## 10. Design and motion ("Cycle in Bloom")

- **Light and dark themes**, switchable in Settings → Appearance (Match phone, Light or Dark). The phone's status bar and navigation bar colours follow the theme.
  - Light: warm ivory surfaces, deep plum-burgundy accents and Playfair Display serif headings.
  - Dark: deep plum surfaces, rose-pink accents and Nunito Sans headings.
- **Bloom artwork**: eight hand-painted flowers, a light-mode and a dark-mode version for each phase.

  | Flower | Shown for |
  |---|---|
  | Burgundy rose | Period, and the days leading up to it |
  | Peach blush | After your period, and pregnancy |
  | Cream and sage | Fertile window |
  | Lavender | Ovulation |

- **Icons**: every icon comes from the Phosphor icon set, filled for active tabs and selected items.
- **Fonts**: Playfair Display for light-theme headings and Nunito Sans for everything else.
- **Animations** (Reanimated, run off the JavaScript thread):
  - The bloom unfurls when it appears: it scales up, counter-rotates and fades in.
  - It then turns slowly, breathes and sways its petals.
  - When the phase changes, the old flower fades out as the new one opens.
  - An orbit marker glides around the ring to show how far you are through your cycle.
  - Other motion:
    - count-up numbers;
    - sparklines that draw in;
    - rising bars;
    - progress rings;
    - press-scale feedback;
    - staggered fade-ins;
    - sheet transitions;
    - smooth reflow when widgets are added or removed.
- **Accessibility**:
  - Every control has a screen-reader label, and decorative art is hidden from screen readers.
  - Day types use shape as well as colour: a filled dot, a ring or a soft dot.
  - There are no emoji icons.
  - Font scaling is limited so layouts don't break.
  - Reduced-motion settings stop the flower animation.
