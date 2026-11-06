import type { Language } from '@avelune/core';
import { common } from './common';
import { content } from './content';
import { core } from './core';
import { logging } from './logging';
import { main } from './main';
import { settings } from './settings';

/** Arabic plural forms (CLDR): zero | one | two | few (3–10) | many (11–99) | other. */
function plural(n: number): number {
  if (!Number.isInteger(n)) return 5;
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  const m = n % 100;
  if (m >= 3 && m <= 10) return 3;
  if (m >= 11 && m <= 99) return 4;
  return 5;
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export const ar: Language = {
  code: 'ar',
  dict: { ...core, ...content, ...logging, ...settings, ...main, ...common },
  plural,
  months: MONTHS,
  monthsShort: MONTHS,
};
