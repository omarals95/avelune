# Health page and widgets (overrides MASTER where they differ)

## Navigation
- **Bottom:** floating Deep Plum pill (Today · Health · Insights · Partner, ≤5 items), active item on a 18% white pill; white labels on plum 11.8:1. Separate round quick-log button. Content gets ≥150px bottom inset so nothing hides behind it.
- **Health top bar:** Samsung Health-style segmented icon bar (Overview · Activity · Sleep · Heart · Body · Water). Sticky. The selected icon sits on a Deep Plum pill that springs between positions. Every icon has a tab role and a spoken label.

## Section layout
Day navigator pill → per-metric card (title, count-up hero value, average) → Days / Weeks / Months segmented control → chart → **Compare with › Cycle phases** chip (shades period, fertile, ovulation days behind daily charts) → "Other data" tiles linking sideways.

## Widgets
- Two-column grid; `full` widgets span both columns. Tiles: radius 24, white or brand soft tint (Soft Blush, Quiet Sage, Mist Lavender, `#E3EAF3`, `#F8EBD9`).
- Catalogue: Cycle statistics (3 rings), Next period (ring), Steps, Sleep, Heart rate, Weight, Temperature & cycle, Water (filling glass), Activity, Mood this cycle, Top symptoms, Blood oxygen.
- Edit mode: move earlier, move later, remove (all 44pt), plus **Add widget** sheet and **Reset**. No drag gesture is required (WCAG 2.2 dragging-movements).
- Empty state tells the user how to get data (connect a tracker or log it).
- Charts: line for trends with ≥4 points, bars for daily totals, ring for progress. Phase bands are always labelled in a legend, never colour-only.

## Data
Providers normalise to `HealthDay` (packages/core/src/health.ts). Priority: manual (logged in Avelune) > Apple Health > Health Connect > Fitbit > sample. Sample data is opt-in, labelled, and removed cleanly. Health data stays on the device: not synced to the server, not in partner snapshots.

## Motion
- **Engine:** Reanimated (UI-thread worklets). GSAP drives DOM/CSS and cannot animate native views, so it isn't used in the app. Its presets informed the timings below. GSAP or Motion would only make sense for a future marketing website.
- **Enter:** cards fade/rise with a spring (damping 16–18), stagger 40ms, max 8 items.
- **Data:** numbers count up over 1s ease-out with thousands separators; sparklines draw left to right; bars rise with a 40ms stagger; rings sweep over 1s; the water glass fills with a spring.
- **Layout:** widgets use `LinearTransition` when reordered and `ZoomOut` (160ms, faster than enter) when removed.
- **Reduced motion:** every primitive renders its final state immediately. No new continuous decorative loops (skill guidance: continuous animation is for loading only).
