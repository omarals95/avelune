/**
 * Tiny translation layer shared by the engine and the app.
 *
 * Keys are the English text itself, with `{name}` placeholders:
 *   tr('Ovulation in {n} days', { n: 3 })
 * Plurals put every English form in one key, separated by `|` (one|other):
 *   trn(n, '{n} day|{n} days')
 * A translation of a plural key lists that language's forms, also separated by `|`
 * (Arabic: zero|one|two|few|many|other).
 *
 * With no dictionary installed (tests, the server) the English text is returned unchanged.
 */
export type Vars = Record<string, string | number>;

export interface Language {
  code: string;
  /** Translations keyed by the English text. */
  dict: Record<string, string>;
  /** Index into a plural translation's `|`-separated forms for the count n. */
  plural: (n: number) => number;
  /** 12 month names and 12 short names. */
  months: string[];
  monthsShort: string[];
}

const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const english: Language = {
  code: 'en',
  dict: {},
  plural: (n) => (n === 1 ? 0 : 1),
  months: EN_MONTHS,
  monthsShort: EN_MONTHS.map((m) => m.slice(0, 3)),
};
let active: Language = english;

/** Install a language (or pass null for English). */
export function setLanguage(lang: Language | null) { active = lang ?? english; }
export const languageCode = () => active.code;

const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m)) : s);

/** Translate an English string. */
export function tr(key: string, vars?: Vars): string {
  return fill(active.dict[key] ?? key, vars);
}

/**
 * Translate a short word whose meaning depends on context (e.g. 'Light' flow vs 'Light' theme).
 * Looks up `context::key` first, then the plain key; English shows the key itself.
 */
export function trc(context: string, key: string, vars?: Vars): string {
  return fill(active.dict[`${context}::${key}`] ?? active.dict[key] ?? key, vars);
}

/** Translate a plural key (`'{n} day|{n} days'`) for the count n. `{n}` is filled automatically. */
export function trn(n: number, key: string, vars?: Vars): string {
  const own = active.dict[key];
  const forms = (own ?? key).split('|');
  const i = own ? active.plural(n) : english.plural(n);
  return fill(forms[Math.min(i, forms.length - 1)], { n, ...vars });
}

/** Month name (0-based month). */
export const monthName = (m: number) => active.months[m];
export const monthShort = (m: number) => active.monthsShort[m];
/** "4 November" / "4 نوفمبر" from an ISO date. */
export const dayMonth = (d: string, short = false) => `${+d.slice(8)} ${(short ? active.monthsShort : active.months)[+d.slice(5, 7) - 1]}`;
