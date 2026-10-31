import { addDays, diffDays, isDateStr } from './dates';
import type { HealthDay } from './health';
import type { DateStr, DayLog, Flow } from './types';

/** RFC 4180-style CSV parser: quoted fields, escaped quotes, CRLF/LF, BOM; delimiter auto-detected (, ; tab). */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"' && field === '') q = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export type DateOrder = 'auto' | 'dmy' | 'mdy';
type Field = 'date' | 'start' | 'end' | 'flow' | 'symptoms' | 'moods' | 'tags' | 'bbt' | 'weight' | 'water' | 'sleep' | 'distance' | 'notes' | 'steps' | 'restingHr';

/** Header synonyms (lower-cased, spaces/underscores ignored). */
const SYNONYMS: Record<Field, string[]> = {
  date: ['date', 'day', 'logdate', 'entrydate', 'datetime', 'timestamp'],
  start: ['start', 'startdate', 'periodstart', 'periodstartdate', 'firstday', 'from'],
  end: ['end', 'enddate', 'periodend', 'periodenddate', 'lastday', 'to'],
  flow: ['flow', 'period', 'bleeding', 'menstruation', 'menstrualflow', 'periodflow', 'flowintensity'],
  symptoms: ['symptoms', 'symptom', 'pain', 'physical'],
  moods: ['mood', 'moods', 'emotions', 'feelings'],
  tags: ['tags', 'other', 'activities', 'activity'],
  bbt: ['bbt', 'temperature', 'basaltemperature', 'basalbodytemperature', 'temp', 'temperaturec', 'bbtc'],
  weight: ['weight', 'weightkg', 'bodyweight'],
  water: ['water', 'waterml', 'hydration'],
  sleep: ['sleep', 'sleephours', 'sleepduration', 'hoursslept'],
  distance: ['distance', 'distancekm'],
  notes: ['notes', 'note', 'comment', 'comments', 'journal'],
  steps: ['steps', 'stepcount'],
  restingHr: ['restinghr', 'restingheartrate', 'rhr'],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-().°/]/g, '');

export function detectColumns(header: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  header.forEach((h, i) => {
    const n = norm(h);
    for (const [f, syn] of Object.entries(SYNONYMS) as [Field, string[]][]) if (out[f] == null && syn.includes(n)) out[f] = i;
  });
  // "Period" alone usually means a yes/flow column; if there's also explicit start/end, treat as ranges instead.
  return out;
}

/** Parse many date spellings to YYYY-MM-DD. Numeric a/b/y dates use `order` (auto-detected beforehand). */
export function parseDateLoose(raw: string, order: 'dmy' | 'mdy'): DateStr | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return fmt(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return order === 'dmy' ? fmt(y, +m[2], +m[1]) : fmt(y, +m[1], +m[2]);
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t) && /[a-z]/i.test(s)) { const d = new Date(t); return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  return null;
}
function fmt(y: number, mo: number, d: number): DateStr | null {
  // Reject impossible dates (31 Feb) instead of letting Date roll them into the next month.
  const dt = new Date(y, mo - 1, d);
  if (y < 1900 || y > 2200 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const s = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isDateStr(s) ? s : null;
}

/** Look at every numeric date: a first part > 12 means day-first, a second part > 12 means month-first. */
export function guessDateOrder(values: string[]): 'dmy' | 'mdy' | 'ambiguous' {
  let dmy = 0, mdy = 0;
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    if (+m[2] > 12) mdy++;
  }
  return dmy && !mdy ? 'dmy' : mdy && !dmy ? 'mdy' : values.some((v) => /^\d{1,2}[-/.]\d{1,2}[-/.]/.test(v.trim())) ? 'ambiguous' : 'dmy';
}

export function parseFlow(raw: string): Flow | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^(none|no|0|false|-)$/.test(s)) return 0;
  if (/spot/.test(s) || s === '1') return 1;
  if (/light|low|^2$/.test(s)) return 2;
  if (/heavy|high|strong|^4$/.test(s)) return 4;
  if (/medium|moderate|normal|^3$|yes|true|period|bleed|^x$/.test(s)) return 3;
  return null;
}

const num = (raw: string) => { const n = parseFloat(raw.replace(',', '.').replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null; };
const list = (raw: string) => raw.split(/[;|,]/).map((x) => x.trim()).filter(Boolean);

export interface ImportOptions {
  dateOrder?: DateOrder;
  /** Map a user label/id to an Avelune option id for a category, or null if unknown. */
  resolve: (label: string, kind: 'symptoms' | 'moods' | 'tags') => string | null;
  /** Units of the file (values are converted to °C / kg / ml / hours / km). */
  tempUnit?: 'C' | 'F' | 'auto';
  weightUnit?: 'kg' | 'lb';
  /** Length used to fill periods that only have a start date. */
  periodLength?: number;
}

export interface ImportResult {
  logs: DayLog[];
  health: HealthDay[];
  columns: Partial<Record<Field, number>>;
  header: string[];
  dateOrder: 'dmy' | 'mdy' | 'ambiguous';
  rows: number;
  skipped: { row: number; reason: string }[];
  unknownLabels: string[];
  range: [DateStr, DateStr] | null;
  periodDays: number;
}

/**
 * Turn a CSV into day logs. Two shapes are supported:
 *  - one row per day (date + any of flow/symptoms/moods/bbt/weight/…)
 *  - one row per period (start [+ end]); each day in the range becomes a period day.
 */
export function importCSV(text: string, opts: ImportOptions): ImportResult {
  const rows = parseCSV(text);
  const header = rows[0] ?? [];
  const cols = detectColumns(header);
  const body = rows.slice(1);
  const dateCol = cols.date ?? cols.start;
  const guessed = guessDateOrder(body.map((r) => (dateCol != null ? r[dateCol] ?? '' : '')).concat(cols.end != null ? body.map((r) => r[cols.end!] ?? '') : []));
  const order: 'dmy' | 'mdy' = opts.dateOrder && opts.dateOrder !== 'auto' ? opts.dateOrder : guessed === 'mdy' ? 'mdy' : 'dmy';
  const result: ImportResult = { logs: [], health: [], columns: cols, header, dateOrder: guessed, rows: body.length, skipped: [], unknownLabels: [], range: null, periodDays: 0 };
  if (cols.date == null && cols.start == null) {
    result.skipped.push({ row: 1, reason: 'No date column found (expected a header like "date" or "start date").' });
    return result;
  }
  const logs = new Map<DateStr, DayLog>();
  const health = new Map<DateStr, HealthDay>();
  const unknown = new Set<string>();
  const get = (d: DateStr) => logs.get(d) ?? logs.set(d, { date: d, flow: 0, symptoms: [], moods: [], tags: [] }).get(d)!;
  const temps = cols.bbt != null ? body.map((r) => num(r[cols.bbt!] ?? '')).filter((x): x is number => x != null) : [];
  const fahrenheit = opts.tempUnit === 'F' || (opts.tempUnit !== 'C' && temps.length > 0 && temps.reduce((a, b) => a + b, 0) / temps.length > 50);
  const rangeMode = cols.start != null && cols.date == null;

  body.forEach((r, i) => {
    const rowNo = i + 2;
    const cell = (f: Field) => (cols[f] != null ? (r[cols[f]!] ?? '').trim() : '');
    if (rangeMode) {
      const s = parseDateLoose(cell('start'), order);
      if (!s) return void result.skipped.push({ row: rowNo, reason: `Unreadable start date "${cell('start')}"` });
      const e = cell('end') ? parseDateLoose(cell('end'), order) : addDays(s, (opts.periodLength ?? 5) - 1);
      if (!e || diffDays(s, e) < 0 || diffDays(s, e) > 15) return void result.skipped.push({ row: rowNo, reason: `Unreadable or implausible end date "${cell('end')}"` });
      const f = parseFlow(cell('flow')) ?? 3;
      for (let k = 0; k <= diffDays(s, e); k++) { const l = get(addDays(s, k)); l.flow = Math.max(l.flow, f || 3) as Flow; }
      return;
    }
    const d = parseDateLoose(cell('date'), order);
    if (!d) return void result.skipped.push({ row: rowNo, reason: `Unreadable date "${cell('date')}"` });
    const l = get(d);
    const flow = parseFlow(cell('flow'));
    if (flow != null) l.flow = flow;
    for (const kind of ['symptoms', 'moods', 'tags'] as const) {
      for (const label of list(cell(kind))) {
        const id = opts.resolve(label, kind);
        if (id) { if (!l[kind].includes(id)) l[kind].push(id); } else unknown.add(label);
      }
    }
    const bbt = num(cell('bbt'));
    if (bbt != null) { const c = fahrenheit ? ((bbt - 32) * 5) / 9 : bbt; if (c >= 34 && c <= 42) l.bbt = Math.round(c * 100) / 100; }
    const w = num(cell('weight'));
    if (w != null && w > 0) l.weight = Math.round((opts.weightUnit === 'lb' ? w / 2.20462 : w) * 10) / 10;
    const water = num(cell('water'));
    if (water != null && water > 0) l.water = Math.round(water < 20 ? water * 1000 : water); // litres or ml
    const sleep = num(cell('sleep'));
    if (sleep != null && sleep > 0) l.sleep = sleep > 24 ? Math.round((sleep / 60) * 10) / 10 : sleep; // minutes or hours
    const dist = num(cell('distance'));
    if (dist != null && dist >= 0) l.distance = dist;
    if (cell('notes')) l.notes = cell('notes').slice(0, 2000);
    const steps = num(cell('steps')), rhr = num(cell('restingHr'));
    if (steps != null || rhr != null) health.set(d, { date: d, steps: steps ?? undefined, restingHr: rhr ?? undefined });
  });

  result.logs = [...logs.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  result.health = [...health.values()];
  result.unknownLabels = [...unknown].slice(0, 50);
  result.periodDays = result.logs.filter((l) => l.flow >= 2).length;
  const all = [...result.logs.map((l) => l.date), ...result.health.map((h) => h.date)].sort();
  result.range = all.length ? [all[0], all[all.length - 1]] : null;
  return result;
}

/** Merge imported logs into existing ones: imported values fill gaps, existing values win (unless overwrite). */
export function mergeLogs(existing: DayLog | undefined, incoming: DayLog, overwrite: boolean): DayLog {
  if (!existing) return incoming;
  if (overwrite) return { ...existing, ...incoming };
  const u = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  return {
    ...incoming, ...existing,
    flow: existing.flow || incoming.flow,
    symptoms: u(existing.symptoms, incoming.symptoms), moods: u(existing.moods, incoming.moods), tags: u(existing.tags, incoming.tags),
    notes: existing.notes || incoming.notes,
  };
}

const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Avelune CSV export (re-importable). Lists use ";" inside a quoted cell. */
export function exportCSV(logs: DayLog[], label: (id: string) => string): string {
  const head = ['date', 'flow', 'symptoms', 'moods', 'tags', 'bbt_c', 'weight_kg', 'water_ml', 'sleep_hours', 'distance_km', 'notes'];
  const flowName = ['', 'spotting', 'light', 'medium', 'heavy'];
  const lines = [...logs].sort((a, b) => (a.date < b.date ? -1 : 1)).map((l) => [
    l.date, flowName[l.flow], l.symptoms.map(label).join('; '), l.moods.map(label).join('; '), l.tags.map(label).join('; '),
    l.bbt ?? '', l.weight ?? '', l.water ?? '', l.sleep ?? '', l.distance ?? '', l.notes ?? '',
  ].map(esc).join(','));
  return [head.join(','), ...lines].join('\n') + '\n';
}
