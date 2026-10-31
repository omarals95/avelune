import type { Phase } from '@cyclo/core';

/** Avelune brand palette (source of truth: docs/design-system/MASTER.md). */
export const brand = {
  deepPlum: '#482F49',
  dustyRose: '#CB8F9B', // decorative only: 2.5:1 on ivory, never for text or meaningful icons
  warmIvory: '#FCF8F5',
  softBlush: '#F3E3E7',
  quietSage: '#DDE9DF',
  mistLavender: '#E8E1F1',
  mutedMauve: '#756776',
  inkPlum: '#302632',
  white: '#FFFFFF',
};

/** Phase accents (text/fills, all ≥4.5:1 with white) and their soft backgrounds. */
export const phase = {
  period: { accent: '#A84461', soft: '#F3E3E7' },
  fertile: { accent: '#426B53', soft: '#DDE9DF' },
  ovulation: { accent: '#765399', soft: '#E8E1F1' },
  pregnancy: { accent: '#936039', soft: '#F5E8D9' },
};

/** Semantic tokens used by components. Keep raw hex out of screens. */
export const colors = {
  bg: brand.warmIvory,
  card: brand.white,
  text: brand.inkPlum,
  heading: brand.deepPlum,
  muted: brand.mutedMauve, // 5.0:1 on ivory; on tinted surfaces use `text` for small copy
  faint: '#8E808F', // 3.7:1: placeholders, disabled glyphs, decorative strokes only
  border: '#EADFE3',
  primary: brand.deepPlum,
  primaryDark: brand.inkPlum,
  primarySoft: brand.softBlush,
  accent: brand.dustyRose,
  period: phase.period.accent,
  periodSoft: phase.period.soft,
  predictedSoft: '#EBCBD3',
  fertile: phase.fertile.accent,
  fertileSoft: phase.fertile.soft,
  ovulation: phase.ovulation.accent,
  ovulationSoft: phase.ovulation.soft,
  pregnancy: phase.pregnancy.accent,
  pregnancySoft: phase.pregnancy.soft,
  today: brand.deepPlum,
  danger: '#9E2A2B',
  white: brand.white,
};

export const radius = { card: 22, chip: 999, tile: 20 };

/** Spacing rhythm (4/8dp). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Minimum touch target (iOS 44pt / Android 48dp). */
export const TOUCH = 48;

export type Mood = Phase | 'fertile' | 'late' | 'none' | 'pregnancy';

/** Background gradient per mood; animated cross-fades between them. All end in Warm Ivory. */
export const phaseGradient: Record<Mood, [string, string, string]> = {
  menstrual: ['#F3E3E7', '#F8EEF0', brand.warmIvory],
  follicular: ['#EEE7F2', '#F6F1F5', brand.warmIvory],
  fertile: ['#DDE9DF', '#ECF3ED', brand.warmIvory],
  ovulation: ['#E8E1F1', '#F2EDF7', brand.warmIvory],
  luteal: ['#F1E5E9', '#F7EFF1', brand.warmIvory],
  late: ['#ECE5EB', '#F4EFF2', brand.warmIvory],
  none: ['#F3E9EC', '#F8F2F2', brand.warmIvory],
  pregnancy: ['#F5E8D9', '#F9F0E6', brand.warmIvory],
};

export const blobColor: Record<Mood, string> = {
  menstrual: '#E9C7CF', follicular: '#DCD2E8', fertile: '#C6DCCB', ovulation: '#D6CBE8', luteal: '#E6CDD5', late: '#DCD3DC', none: '#EBD5DB', pregnancy: '#EBD3BA',
};

/** Accent used for the big status circle fill (null = translucent white with ink text). */
export const circleFill: Partial<Record<Mood, string>> = {
  fertile: phase.fertile.accent,
  ovulation: phase.ovulation.accent,
};

export const shadow = {
  shadowColor: brand.deepPlum, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3,
};

/** Type families (Soft Rounded pairing: Varela Round headings, Nunito Sans body). */
export const font = {
  heading: 'VarelaRound_400Regular',
  body: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  black: 'NunitoSans_800ExtraBold',
};

/** Motion tokens (ms). Exits are faster than entrances. */
export const motion = { press: 120, fast: 180, base: 260, enter: 420, crossfade: 700 };
