# Avelune — Design System (MASTER)

> Source of truth for all screens. Page-specific overrides go in `pages/<page>.md`.
> Brand values come from the Avelune brand brief; the UI UX Pro Max skill supplied typography,
> accessibility and React Native guidance. Implemented in `app/src/theme.ts`, `text.tsx`, `icons.tsx`, `ui.tsx`.

**Name:** Avelune · **Tagline:** Your rhythm. Your space.
**Product:** private period, fertility and pregnancy tracker (iOS / Android / web, React Native + Expo).
**Style:** Soft UI: warm ivory canvas, white elevated cards, generous radii (20–24), gentle plum-tinted shadows, calm motion.

## Logo
- Lockup `app/assets/logo-full.png` (symbol + wordmark, transparent). Use unaltered with clear space ≥ the height of the "a" bowl.
- Symbol `app/assets/symbol.png` stands alone as app icon (`icon.png` on Warm Ivory, Android `adaptive-icon.png` inside the 66% safe zone), splash and avatar fallback.
- Never recolour, stretch or place on Dusty Rose / Deep Plum fills.

## Colour tokens
| Token | Hex | Role | Contrast notes |
|---|---|---|---|
| `primary` / Deep Plum | `#482F49` | Primary buttons, headings, logo, selected day, active tab | White on plum 11.8:1 |
| `accent` / Dusty Rose | `#CB8F9B` | Decoration only: story-card rings, illustrations, tab indicator, chart highlights | **2.5:1 on ivory: never text or meaningful icons** |
| `bg` / Warm Ivory | `#FCF8F5` | App background | |
| `primarySoft` / Soft Blush | `#F3E3E7` | Ghost buttons, search, steppers, period soft background | Plum on blush 9.5:1 |
| Quiet Sage | `#DDE9DF` | Fertile-window backgrounds | |
| Mist Lavender | `#E8E1F1` | Ovulation backgrounds, insights | |
| `muted` / Muted Mauve | `#756776` | Secondary text on ivory/white | 5.0:1 on ivory; **4.2:1 on tinted cards → use `text` there** |
| `text` / Ink Plum | `#302632` | Body text, values | 13.7:1 on ivory |
| `faint` | `#8E808F` | Placeholders, disabled glyphs, outline strokes | 3.7:1 (non-text only) |
| `danger` | `#9E2A2B` | Destructive actions | |

### Cycle phases
| Phase | Accent (text/fill) | Soft | Shape on calendar / week strip |
|---|---|---|---|
| Period (logged) | `#A84461` | `#F3E3E7` | Filled circle, white numeral (5.7:1) |
| Period (predicted) | `#A84461` | — | Dashed ring, accent numeral |
| Fertile window | `#426B53` | `#DDE9DF` | Soft filled circle, accent numeral (4.9:1) |
| Ovulation | `#765399` | `#E8E1F1` | Soft fill + dashed ring (4.8:1) |
| Pregnancy | `#936039` | `#F5E8D9` | Progress ring; accent on soft is 4.4:1 → large text only |

Status-circle fills: fertile → fertile accent, ovulation day → ovulation accent (white text ≥6:1); other phases → 72% white over the phase gradient with Ink/Plum text.

### Category chips (log)
Every category uses an accent that passes ≥4.5:1 with white (selected) and on its own tint (unselected):
flow `#A84461`/`#F3E3E7`, sex `#8E3B5A`/`#F6E4EA`, mood `#7E5418`/`#F8EBD9`, symptoms `#7A4A86`/`#F1E4F3`,
discharge `#3D5F8A`/`#E3EAF3`, tests `#2F6A66`/`#DCEDEB`, pill `#5A4E99`/`#E7E4F5`, other `#8C4E2B`/`#F7E6DA`, activity `#426B53`/`#DDE9DF`.

## Typography (skill match: "Soft Rounded")
- Headings: **Varela Round** (single weight; echoes the rounded wordmark). Used automatically for text ≥20px at weight ≥700.
- Body/UI: **Nunito Sans** 400 / 600 / 700 / 800.
- Scale: 13 caption · 15–16 body · 17–18 emphasis · 20–22 section · 26–30 title · 44 status.
- Line height ≈1.45 for paragraphs. Minimum 11px only for calendar micro-labels; body never <14px.
- Dynamic Type: honoured, capped at 1.6× (`maxFontSizeMultiplier`) to protect layouts.

## Spacing, shape, elevation
- 4/8 rhythm: 4 · 8 · 12 · 16 · 24 · 32. Screen gutter 20; section gap 24.
- Radii: cards 22, tiles 20, chips/buttons pill.
- Shadow: plum `#482F49` at 8% opacity, 18 blur, y 6.

## Interaction & accessibility rules
- Touch targets ≥44pt (iOS) / 48dp (Android); buttons min-height 52; small glyphs get `hitSlop`.
- Press feedback: spring scale to 0.94–0.97 within ~120ms; colour transitions 180ms; no layout shift.
- Icons: MaterialCommunityIcons only (single family), hidden from screen readers; the control carries the label.
- No emoji as icons. Pregnancy sizes use the vector `GrowthMark`, always paired with text.
- Meaning never by colour alone: calendar uses shape (filled / dashed / soft fill) + legend + spoken labels.
- Reduced motion: all loops, pops, fades and chart growth become static.

## Motion tokens (ms)
press 120 · fast 180 · base 260 · enter 420 · crossfade 700. Exits are faster than entrances.

## Anti-patterns to avoid
Dusty Rose text · Mauve small text on tinted cards · emoji icons · icon-only controls without labels · placeholder-only labels · colour-only status · animating layout properties.
