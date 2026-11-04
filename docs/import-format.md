# Avelune data formats

This document describes every format Avelune reads and writes, so you (or another app) can move data in and out freely. Everything is processed on the device.

## 1. Spreadsheet import (CSV or Excel .xlsx)

You can download a ready-made template from the app: Settings › Your data › Import from file › **Download example.xlsx**.

The template has three sheets:
- **Your data**: the sheet that gets imported.
- **Example**: a filled-in sample. It is never imported.
- **How to fill**: every word Avelune recognises.

When a workbook has several sheets, Avelune imports the first sheet that has data, skipping any sheet whose name contains "example", "sample", "how to", "instructions", "help", "readme" or "guide".

Headers are matched without regard to case, spaces, `_ - ( ) . ° /`. The first matching column wins.

| Field | Accepted headers | Values |
|---|---|---|
| Date | `date`, `day`, `log date`, `entry date`, `datetime`, `timestamp`, `local date` | Any common date (`2026-10-31`, `31/10/2026`, `10/31/2026`, Excel date cells or serial numbers). Day/month order is detected, and you can override it in the preview. |
| Period start / end | `start`, `start date`, `period start`, `first day`, `from` / `end`, `end date`, `period end`, `last day`, `to` | One row per period instead of per day. Without an end date, your period length is used. |
| Flow | `flow`, `period`, `bleeding`, `menstruation`, `menstrual flow`, `period flow`, `flow intensity` | `none`, `spotting`, `light`, `medium`, `heavy`; `0–4`; `yes`/`x` (counts as medium) |
| Symptoms, Mood, Other | `symptoms`, `pain` / `mood`, `emotions`, `feelings` / `tags`, `other`, `activities` | Separate several values with commas, semicolons or a pipe (`\|`). Common synonyms are understood (for example "back pain" is read as Backache). |
| Temperature (BBT) | `bbt`, `temperature`, `temp`, `basal body temperature`, `temperature (°C)` | °C or °F (detected automatically, or chosen in the preview) |
| Weight | `weight`, `weight (kg)`, `body weight` | kg, or lb chosen in the preview |
| Water | `water`, `water (ml)`, `hydration` | ml, or litres (values under 20 are read as litres) |
| Sleep | `sleep`, `sleep (hours)`, `hours slept` | hours, or minutes (values over 24 are read as minutes) |
| Distance | `distance`, `distance (km)` | km |
| Steps / Resting HR | `steps`, `step count` / `resting hr`, `resting heart rate`, `rhr` | Stored as health data |
| Ovulation test | `lh`, `lh test`, `ovulation test`, `opk` | `positive`/`peak`/`yes` or `negative`/`no` |
| Pregnancy test | `pregnancy test`, `hcg` | `positive` or `negative` |
| Sex | `sex`, `intercourse`, `sexual activity` | `protected`, `unprotected`, `yes`, `no` |
| Cervical mucus | `mucus`, `cervical mucus`, `discharge`, `cervical fluid` | `dry`, `sticky`, `creamy`, `watery`, `egg white` |
| Notes | `notes`, `note`, `comment`, `journal` | Free text |

## 2. Other apps

| App | What to export | How Avelune reads it |
|---|---|---|
| **Apple Health** | Health › your profile › *Export All Health Data* (`export.zip`) | Streams `export.xml` from the zip, so very large exports are fine. It reads:<br>• menstrual flow (light, medium, heavy or unspecified)<br>• spotting (intermenstrual bleeding)<br>• basal body temperature (°C or °F)<br>• ovulation and pregnancy test results<br>• cervical mucus quality<br>• sexual activity, with whether protection was used<br>• cycle symptoms (cramps, acne, appetite, breast pain, bloating, constipation, diarrhoea, dizziness, fatigue, headache, lower back pain, nausea, pelvic pain, sleep changes, mood changes); symptoms marked "not present" are ignored |
| **drip.** | Settings › Data › Export (CSV) | Uses drip's own column names:<br>• `bleeding.value` (0 spotting to 3 heavy; excluded values skipped)<br>• `temperature.value`<br>• `mucus.feeling` and `mucus.texture`<br>• `pain.*`, `mood.*`, `sex.*` and `desire.value`<br>• note fields |
| **Natural Cycles** | The data request `.zip` of CSV files | Reads every CSV in the zip with the spreadsheet rules above, including temperature, menstruation, LH test, cervical mucus and sex columns, and merges the results. |
| **Flo, Clue and others** | The JSON or zip file from their data-export or data-request option | These formats are not published, so Avelune reads them by shape. It recognises:<br>• `{start, end}` period ranges inside period or cycle objects<br>• dated entries with a type or category and a value (for example `{date, type: "period", value: {option: "heavy"}}`)<br>• dated objects with symptom or mood lists<br>• objects keyed by date<br><br>The preview shows what was recognised before anything is saved. |

## 3. Avelune exports

- **Excel** (Settings › Your data › Export to Excel): a real `.xlsx` file, one row per day.
  - Sheet "Your data" uses the import template's columns: `Date, Flow, Symptoms, Mood, Other, BBT (°C), Weight (kg), Water (ml), Sleep (hours), Distance (km), Steps, Resting HR, Notes`.
  - Dates are real Excel dates; labels are human-readable; an "About" sheet notes the export date and units.
  - The file can be imported again unchanged.
- **JSON** (Export all data): `{ "version": 2, "records": SyncRecord[] }`.
  - Each record is `{ id: "day:YYYY-MM-DD" | "settings", data, updatedAt, deleted }`.
  - A day record's `data` is a `DayLog`:
    - `{ date, flow (0–4), symptoms[], moods[], tags[], bbt?, weight?, water?, sleep?, distance?, notes? }`.
    - `tags` are namespaced, for example `sex:protected` or `tests:ovu-pos`.
  - The file can be imported again.

## 4. Encrypted backup files (`.avelune`)

Created by Settings › Backups. Automatic daily backups go to a folder you choose on Android, or to Files › On My iPhone › Avelune on iOS.

```json
{ "format": "avelune-backup", "v": 1, "kdf": { "N": 16384, "r": 8, "p": 1 }, "salt": "<base64url>",
  "createdAt": 1762184340000, "data": "v1.<nonce base64url>.<ciphertext base64url>" }
```

- **Key:** `scrypt(passphrase NFKC, salt, N, r, p, 32 bytes)` gives a master key, then `HKDF-SHA256(master, info "avelune/backup/v1")` derives the encryption key.
- **Cipher:** XChaCha20-Poly1305 with a 24-byte random nonce and associated data `avelune-backup/v1`.
- **Plaintext:** gzip of `{ v: 1, createdAt, records: SyncRecord[], prefs }`, where `prefs` holds name, units, theme, reminders and partner name.
- **Header:** reveals only the format and the creation time.
- **Lost passphrase:** the file cannot be opened.
