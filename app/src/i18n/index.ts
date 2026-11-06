import { Platform } from 'react-native';
import { languageCode, setLanguage, tr, trn, type Language } from '@avelune/core';
import { ar } from './ar';

export { tr as t, trn as tn, monthName, monthShort, dayMonth } from '@avelune/core';
export type Lang = 'en' | 'ar';
export type LangPref = Lang | 'system';

/** Languages offered in Settings → Language, each named in its own language. */
export const LANGUAGES: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
];

/** The phone's language, when it is one Avelune speaks (English otherwise). */
export function systemLang(): Lang {
  let tag = '';
  try {
    tag = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.language : Intl.DateTimeFormat().resolvedOptions().locale;
  } catch { /* no Intl: English */ }
  return /^ar\b/i.test(tag) ? 'ar' : 'en';
}

export const resolveLang = (pref: LangPref | undefined): Lang => (!pref || pref === 'system' ? systemLang() : pref);

export let lang: Lang = 'en';
/** True while the app is laid out right-to-left (Arabic). */
export let rtl = false;

/** Switch the active language. Returns true when it changed (the caller remounts the tree). */
export function applyLang(l: Lang): boolean {
  if (l === lang && languageCode() === l) return false;
  lang = l;
  rtl = l === 'ar';
  setLanguage(l === 'ar' ? ar : null);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = l;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }
  return true;
}

/** Day-of-week initials, Monday first. */
export const dowInitials = () => (lang === 'ar' ? ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']);

/** Format a number with grouping (Western digits in every language, as most Arabic apps in the Gulf do). */
export const num = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** Mirror a horizontal value (offsets, translateX) when laid out right-to-left. */
export const flipX = (x: number) => (rtl ? -x : x);

export type { Language };
