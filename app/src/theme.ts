import type { Phase } from '@cyclo/core';

/**
 * Avelune design tokens, light and dark ("Cycle in Bloom").
 * `colors`, `phase`, `font`, `shadow`… are live objects: `applyScheme()` swaps their values in place,
 * and the app root remounts so every screen re-reads them. Module-level style sheets must be wrapped
 * in `themed()` so they are rebuilt for the active scheme.
 */
export type Scheme = 'light' | 'dark';
export type ThemePref = Scheme | 'system';

/** Brand constants that do not change between schemes. */
export const brand = {
  deepPlum: '#482F49',
  dustyRose: '#CB8F9B',
  warmIvory: '#FCF8F5',
  softBlush: '#F3E3E7',
  quietSage: '#DDE9DF',
  mistLavender: '#E8E1F1',
  mutedMauve: '#756776',
  inkPlum: '#302632',
  white: '#FFFFFF',
};

const lightColors = {
  bg: '#FAF4F0',
  card: '#FFFBF8',
  /** Quiet filled surface: tiles, search field, inactive controls. */
  tile: '#F3E9E4',
  tileSelected: '#FBE5E4',
  input: '#F1E6E1',
  text: '#3A2731',
  heading: '#3F2232',
  muted: '#7A6870',
  faint: '#A99AA0',
  border: '#EEE2DD',
  divider: '#ECE0DB',
  /** Deep plum-burgundy: FAB, selected day, primary buttons. */
  primary: '#7B3454',
  primaryDark: '#5E2640',
  onPrimary: '#FFFFFF',
  /** Soft blush behind active nav item / segmented selection. */
  primarySoft: '#F6DCE1',
  accent: '#B5577A',
  /** Bars and lines in charts. */
  chart: '#CF97A6',
  chartSoft: '#EED6DC',
  chartHi: '#9E4566',
  water: '#6F9CC9',
  waterSoft: '#D9E6F2',
  success: '#4E8A57',
  period: '#A84461',
  periodSoft: '#F3E3E7',
  predictedSoft: '#EBCBD3',
  fertile: '#4F7A5C',
  fertileSoft: '#DDE9DF',
  ovulation: '#7A55A0',
  ovulationSoft: '#E8E1F1',
  pregnancy: '#936039',
  pregnancySoft: '#F5E8D9',
  today: '#7B3454',
  danger: '#B03A4E',
  dangerSoft: '#F8E1E4',
  white: '#FFFFFF',
  navBg: '#FFFBF8',
  navActive: '#F6DCE1',
  navIcon: '#4A3440',
  navIconActive: '#5E2640',
  fab: '#7B3454',
  fabIcon: '#FFFFFF',
  switchOff: '#E4D9D6',
  overlay: 'rgba(48,30,40,0.35)',
  glow: 'rgba(123,52,84,0.10)',
};
export type Palette = typeof lightColors;

const darkColors: Palette = {
  bg: '#1B131C',
  card: '#241A25',
  tile: '#2B202C',
  tileSelected: '#46293C',
  input: '#251A27',
  text: '#EADFE5',
  heading: '#F8EEF2',
  muted: '#B6A6AF',
  faint: '#7E6E78',
  border: '#382A39',
  divider: '#33263A',
  primary: '#E58BAA',
  primaryDark: '#C86F90',
  onPrimary: '#2A1220',
  primarySoft: '#47283B',
  accent: '#E58BAA',
  chart: '#D9839F',
  chartSoft: '#5A3349',
  chartHi: '#F0A3BC',
  water: '#7FA6E3',
  waterSoft: '#2C3550',
  success: '#9ED7A0',
  period: '#E57D9C',
  periodSoft: '#4A2434',
  predictedSoft: '#5B2E42',
  fertile: '#9CC4A5',
  fertileSoft: '#26382D',
  ovulation: '#C09BEA',
  ovulationSoft: '#35274A',
  pregnancy: '#E0AA79',
  pregnancySoft: '#40301F',
  today: '#E58BAA',
  danger: '#F08A9C',
  dangerSoft: '#4A2230',
  white: '#FFFFFF',
  navBg: '#221824',
  navActive: '#3A2433',
  navIcon: '#B6A6AF',
  navIconActive: '#F09ABA',
  fab: '#E58BAA',
  fabIcon: '#FFFFFF',
  switchOff: '#4A3A48',
  overlay: 'rgba(0,0,0,0.55)',
  glow: 'rgba(229,139,170,0.14)',
};

export const palettes: Record<Scheme, Palette> = { light: lightColors, dark: darkColors };

/** Semantic tokens used by components (live: values follow the active scheme). */
export const colors: Palette = { ...lightColors };

/** Phase accents and their soft backgrounds (live). */
const phaseFor = (c: Palette) => ({
  period: { accent: c.period, soft: c.periodSoft },
  fertile: { accent: c.fertile, soft: c.fertileSoft },
  ovulation: { accent: c.ovulation, soft: c.ovulationSoft },
  pregnancy: { accent: c.pregnancy, soft: c.pregnancySoft },
});
export const phase = phaseFor(lightColors);

export const radius = { card: 24, chip: 999, tile: 20 };

/** Spacing rhythm (4/8dp). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Minimum touch target (iOS 44pt / Android 48dp). */
export const TOUCH = 48;

export type Mood = Phase | 'fertile' | 'late' | 'none' | 'pregnancy';

const gradients: Record<Scheme, Record<Mood, [string, string, string]>> = {
  light: {
    menstrual: ['#F6E6E8', '#F9EFEE', lightColors.bg],
    follicular: ['#F8EAE4', '#FAF0EB', lightColors.bg],
    fertile: ['#E9EFE4', '#F3F3EC', lightColors.bg],
    ovulation: ['#EEE6F4', '#F6F0F5', lightColors.bg],
    luteal: ['#F6E9EA', '#F9F0EE', lightColors.bg],
    late: ['#EFE7EC', '#F6EFEF', lightColors.bg],
    none: ['#F6ECEB', '#F9F2EF', lightColors.bg],
    pregnancy: ['#F5E8D9', '#F9F0E6', lightColors.bg],
  },
  dark: {
    menstrual: ['#2D1720', '#22141C', darkColors.bg],
    follicular: ['#2D1C21', '#24161E', darkColors.bg],
    fertile: ['#1F2620', '#1E1A1E', darkColors.bg],
    ovulation: ['#271C33', '#211726', darkColors.bg],
    luteal: ['#2A1820', '#22151D', darkColors.bg],
    late: ['#261B26', '#20161F', darkColors.bg],
    none: ['#271A22', '#20161E', darkColors.bg],
    pregnancy: ['#2C2119', '#22181A', darkColors.bg],
  },
};
/** Background gradient per mood (live). */
export const phaseGradient: Record<Mood, [string, string, string]> = { ...gradients.light };

const blobs: Record<Scheme, Record<Mood, string>> = {
  light: { menstrual: '#E9C7CF', follicular: '#F0D6CC', fertile: '#D3E0CF', ovulation: '#D6CBE8', luteal: '#E6CDD5', late: '#DCD3DC', none: '#EBD5DB', pregnancy: '#EBD3BA' },
  dark: { menstrual: '#4A2434', follicular: '#4A2C2E', fertile: '#2A3A2E', ovulation: '#3A2A50', luteal: '#43263A', late: '#382A39', none: '#3A2633', pregnancy: '#45331F' },
};
export const blobColor: Record<Mood, string> = { ...blobs.light };

/** Accent used for the big status circle fill. */
export const circleFill: Partial<Record<Mood, string>> = {
  fertile: lightColors.fertile,
  ovulation: lightColors.ovulation,
};

const shadows = {
  light: { shadowColor: '#5E2640', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  dark: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
};
export const shadow = { ...shadows.light };

/**
 * Type families. Light: Playfair Display headings (editorial serif) with Nunito Sans.
 * Dark: Nunito Sans throughout, as in the dark reference screens.
 */
const fonts = {
  light: { heading: 'PlayfairDisplay_500Medium', display: 'PlayfairDisplay_500Medium' },
  dark: { heading: 'NunitoSans_600SemiBold', display: 'NunitoSans_600SemiBold' },
};
export const font = {
  ...fonts.light,
  body: 'NunitoSans_400Regular',
  medium: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  black: 'NunitoSans_800ExtraBold',
};

/** Motion tokens (ms). Exits are faster than entrances. */
export const motion = { press: 120, fast: 180, base: 260, enter: 420, crossfade: 700 };

/** Flower artwork per mood: light screens use the airy blooms, dark screens the saturated ones. */
const flowerFiles = {
  light: {
    menstrual: require('../assets/flowers/rose-light.webp'),
    follicular: require('../assets/flowers/peach-light.webp'),
    fertile: require('../assets/flowers/sage-light.webp'),
    ovulation: require('../assets/flowers/lavender-light.webp'),
  },
  dark: {
    menstrual: require('../assets/flowers/rose-dark.webp'),
    follicular: require('../assets/flowers/peach-dark.webp'),
    fertile: require('../assets/flowers/sage-dark.webp'),
    ovulation: require('../assets/flowers/lavender-dark.webp'),
  },
};
export type Bloom = keyof typeof flowerFiles.light;
export const flowers: Record<Bloom, number> = { ...flowerFiles.light };
/** Which bloom represents each mood. */
export const bloomFor = (m: Mood): Bloom =>
  m === 'menstrual' ? 'menstrual' : m === 'fertile' ? 'fertile' : m === 'ovulation' ? 'ovulation' : m === 'luteal' || m === 'late' ? 'menstrual' : 'follicular';
/** Glow/orbit colour per bloom. */
export const bloomTint = (b: Bloom) => (b === 'menstrual' ? colors.period : b === 'fertile' ? colors.fertile : b === 'ovulation' ? colors.ovulation : colors.accent);

export let scheme: Scheme = 'light';
let version = 0;

/** Switch every live token object to `s`. Safe to call repeatedly. */
export function applyScheme(s: Scheme) {
  if (s === scheme) return;
  scheme = s;
  version++;
  Object.assign(colors, palettes[s]);
  Object.assign(phase, phaseFor(palettes[s]));
  Object.assign(phaseGradient, gradients[s]);
  Object.assign(blobColor, blobs[s]);
  Object.assign(circleFill, { fertile: palettes[s].fertile, ovulation: palettes[s].ovulation });
  Object.assign(shadow, shadows[s]);
  Object.assign(font, fonts[s]);
  Object.assign(flowers, flowerFiles[s]);
}

/**
 * Lazily build a style object for the active scheme. Use instead of a module-level
 * `StyleSheet.create({...})` whenever the styles read `colors`/`shadow`/`font`.
 */
export function themed<T extends object>(factory: () => T): T {
  let built: T | null = null;
  let at = -1;
  const get = () => {
    if (!built || at !== version) { built = factory(); at = version; }
    return built;
  };
  return new Proxy({} as T, {
    get: (_t, k) => (get() as Record<string | symbol, unknown>)[k],
    has: (_t, k) => k in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, k) => Object.getOwnPropertyDescriptor(get(), k),
  });
}
