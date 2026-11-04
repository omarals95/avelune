import { DecodeUTF8, Unzip, UnzipInflate } from 'fflate';
import { addDays, diffDays } from './dates';
import { importRows, parseCSV, parseDateLoose, parseFlow, type ImportOptions, type ImportResult } from './csv';
import type { HealthDay } from './health';
import type { DateStr, DayLog, Flow, SyncRecord } from './types';

/**
 * Importers for other apps' exports. Everything runs on the device.
 *
 *  - drip.            CSV export (columns from drip's own schema: bleeding.value 0–3, temperature.value, mucus.*, pain.*, mood.*, sex.*)
 *  - Apple Health     export.zip / export.xml (menstrual flow, spotting, BBT, ovulation and pregnancy tests,
 *                     cervical mucus, sexual activity, cycle symptoms); streamed so very large exports fit in memory
 *  - Avelune          JSON export ({ version, records })
 *  - Flo, Clue, others  JSON exports read by shape: period start/end ranges, dated entries with a type/category and value,
 *                     symptom/mood lists. Their formats are not published, so this is best-effort and the preview shows
 *                     what was found before anything is saved.
 *  - Natural Cycles and spreadsheets  CSV (inside a .zip or on its own) through the column-synonym CSV importer.
 */

export type ImportSource = 'avelune' | 'drip' | 'apple-health' | 'clue' | 'flo' | 'natural-cycles' | 'garmin' | 'json' | 'csv';
export const SOURCE_LABEL: Record<ImportSource, string> = {
  avelune: 'Avelune export', garmin: 'Garmin Connect export', drip: 'drip.', 'apple-health': 'Apple Health', clue: 'Clue', flo: 'Flo', 'natural-cycles': 'Natural Cycles', json: 'JSON file', csv: 'Spreadsheet (CSV)',
};

/** Accumulates day logs and builds an ImportResult. */
class Collector {
  logs = new Map<DateStr, DayLog>();
  health = new Map<DateStr, HealthDay>();
  unknown = new Set<string>();
  skipped: ImportResult['skipped'] = [];
  rows = 0;
  constructor(private opts: ImportOptions) {}
  get(d: DateStr) { return this.logs.get(d) ?? this.logs.set(d, { date: d, flow: 0, symptoms: [], moods: [], tags: [] }).get(d)!; }
  flow(d: DateStr, f: Flow) { const l = this.get(d); if (f > l.flow) l.flow = f; }
  tag(d: DateStr, kind: 'symptoms' | 'moods' | 'tags', id: string) { const l = this.get(d); if (!l[kind].includes(id)) l[kind].push(id); }
  label(d: DateStr, label: string, kind: 'symptoms' | 'moods' | 'tags' = 'symptoms', report = true) {
    const clean = label.replace(/[_-]+/g, ' ').trim();
    if (!clean || clean.length > 60) return false;
    const id = this.opts.resolve(clean, kind);
    if (!id) { if (report) this.unknown.add(clean); return false; }
    // resolve() returns plain ids for symptoms/moods and namespaced ids ("sex:protected") for other categories.
    this.tag(d, id.includes(':') ? 'tags' : this.opts.classify?.(id) ?? (kind === 'tags' ? 'symptoms' : kind), id);
    return true;
  }
  bbt(d: DateStr, v: number, unit?: 'C' | 'F') {
    const c = unit === 'F' || (!unit && v > 50) ? ((v - 32) * 5) / 9 : v;
    if (c >= 34 && c <= 42) this.get(d).bbt = Math.round(c * 100) / 100;
  }
  note(d: DateStr, text: string) {
    const l = this.get(d);
    const t = text.trim().slice(0, 2000);
    if (t && !(l.notes ?? '').includes(t)) l.notes = l.notes ? `${l.notes}\n${t}` : t;
  }
  result(source: ImportSource): ImportResult {
    // Drop days that ended up empty (e.g. only unknown labels).
    const logs = [...this.logs.values()].filter((l) => l.flow || l.symptoms.length || l.moods.length || l.tags.length || l.bbt != null || l.notes || l.weight != null)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const health = [...this.health.values()];
    const all = [...logs.map((l) => l.date), ...health.map((h) => h.date)].sort();
    return {
      logs, health, columns: {}, header: [], dateOrder: 'dmy', rows: this.rows, skipped: this.skipped, unknownLabels: [...this.unknown].slice(0, 50),
      range: all.length ? [all[0], all[all.length - 1]] : null, periodDays: logs.filter((l) => l.flow >= 2).length, source: SOURCE_LABEL[source],
    };
  }
}

const isoDay = (raw: unknown): DateStr | null => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw > 1e9 ? raw * 1000 : NaN;
    if (!Number.isFinite(ms)) return null;
    const d = new Date(ms);
    return d.getFullYear() >= 1990 && d.getFullYear() <= 2100 ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
  }
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (m) return parseDateLoose(`${m[1]}-${m[2]}-${m[3]}`, 'dmy');
  return /\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(raw) ? parseDateLoose(raw, 'dmy') : null;
};

// ---------------------------------------------------------------- drip.

const DRIP_PAIN: Record<string, string> = { cramps: 'cramps', ovulationPain: 'abdominal-pain', headache: 'headache', backache: 'backache', nausea: 'nausea', tenderBreasts: 'tender-breasts', migraine: 'headache' };
const DRIP_MOOD: Record<string, string> = { happy: 'happy', sad: 'sad', stressed: 'other:stress', balanced: 'calm', fine: 'calm', anxious: 'anxious', energetic: 'energetic', fatigue: 'fatigue', angry: 'irritated' };

export const isDripCsv = (text: string) => /(^|,)bleeding\.value(,|$)/m.test(text.slice(0, 2000));

export function importDripCsv(text: string, opts: ImportOptions): ImportResult {
  const rows = parseCSV(text);
  const head = rows[0] ?? [];
  const col = (k: string) => head.indexOf(k);
  const c = new Collector(opts);
  for (const r of rows.slice(1)) {
    c.rows++;
    const at = (k: string) => { const i = col(k); return i >= 0 ? (r[i] ?? '').trim() : ''; };
    const d = isoDay(at('date'));
    if (!d) { if (r.some((x) => x.trim())) c.skipped.push({ row: c.rows + 1, reason: `Unreadable date "${at('date')}"` }); continue; }
    const b = at('bleeding.value');
    if (b !== '' && at('bleeding.exclude') !== 'true') c.flow(d, (Math.min(3, Math.max(0, +b)) + 1) as Flow);
    const t = parseFloat(at('temperature.value'));
    if (Number.isFinite(t) && at('temperature.exclude') !== 'true') c.bbt(d, t);
    const tex = at('mucus.texture'), feel = at('mucus.feeling');
    if (tex === '2' || feel === '3') c.tag(d, 'tags', 'discharge:egg-white');
    else if (tex === '1') c.tag(d, 'tags', 'discharge:creamy');
    else if (feel === '2') c.tag(d, 'tags', 'discharge:watery');
    else if (feel === '0') c.tag(d, 'tags', 'discharge:none');
    for (const [k, id] of Object.entries(DRIP_PAIN)) if (at(`pain.${k}`) === 'true') c.tag(d, 'symptoms', id);
    for (const [k, id] of Object.entries(DRIP_MOOD)) if (at(`mood.${k}`) === 'true') c.tag(d, id.includes(':') ? 'tags' : id === 'fatigue' ? 'symptoms' : 'moods', id);
    if (at('sex.partner') === 'true') c.tag(d, 'tags', at('sex.condom') === 'true' ? 'sex:protected' : 'sex:had');
    if (at('sex.solo') === 'true') c.tag(d, 'tags', 'sex:solo');
    if (at('sex.pill') === 'true') c.tag(d, 'tags', 'pill:taken');
    const desire = at('desire.value');
    if (desire === '2') c.tag(d, 'tags', 'sex:high');
    if (desire === '0') c.tag(d, 'tags', 'sex:low');
    for (const n of ['note.value', 'pain.note', 'mood.note', 'sex.note', 'temperature.note']) if (at(n)) c.note(d, at(n));
  }
  return c.result('drip');
}

// ---------------------------------------------------------------- Apple Health

const AH = 'HKCategoryTypeIdentifier';
const AH_SYMPTOM: Record<string, string> = {
  AbdominalCramps: 'cramps', Acne: 'acne', AppetiteChanges: 'cravings', BreastPain: 'tender-breasts', Bloating: 'bloating', Constipation: 'constipation',
  Diarrhea: 'diarrhea', Dizziness: 'dizziness', Fatigue: 'fatigue', Headache: 'headache', LowerBackPain: 'backache', Nausea: 'nausea',
  PelvicPain: 'abdominal-pain', SleepChanges: 'insomnia',
};
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/**
 * Streaming reader for Apple Health's export.xml. Feed text with push(); only cycle-related records are parsed,
 * so a multi-gigabyte export never has to be held in memory at once.
 */
export class AppleHealthReader {
  private buf = '';
  private c: Collector;
  records = 0;
  constructor(opts: ImportOptions) { this.c = new Collector(opts); }
  push(text: string) {
    this.buf += text;
    let pos = 0;
    for (;;) {
      const i = this.buf.indexOf('<Record ', pos);
      if (i < 0) { pos = Math.max(pos, this.buf.length - 8); break; }
      const j = this.buf.indexOf('>', i);
      if (j < 0) { pos = i; break; }
      let end = j + 1;
      if (this.buf[j - 1] !== '/') {
        const k = this.buf.indexOf('</Record>', j);
        if (k < 0) { pos = i; break; }
        end = k + 9;
      }
      const type = attr(this.buf.slice(i, j + 1), 'type') ?? '';
      if (type.startsWith(AH) || type === 'HKQuantityTypeIdentifierBasalBodyTemperature') this.record(type, this.buf.slice(i, end));
      pos = end;
    }
    this.buf = this.buf.slice(pos);
  }
  private record(type: string, xml: string) {
    const open = xml.slice(0, xml.indexOf('>') + 1);
    const start = attr(open, 'startDate');
    const d = start ? isoDay(start.slice(0, 10)) : null;
    if (!d) return;
    const v = attr(open, 'value') ?? '';
    const c = this.c;
    const t = type.slice(AH.length);
    this.records++;
    if (type === 'HKQuantityTypeIdentifierBasalBodyTemperature') { c.bbt(d, parseFloat(v), attr(open, 'unit') === 'degF' ? 'F' : 'C'); return; }
    if (t === 'MenstrualFlow') {
      const f = /Light/.test(v) ? 2 : /Medium|Unspecified/.test(v) ? 3 : /Heavy/.test(v) ? 4 : 0;
      if (f) c.flow(d, f as Flow);
    } else if (t === 'IntermenstrualBleeding') c.flow(d, 1);
    else if (t === 'OvulationTestResult') {
      if (/Positive|LuteinizingHormoneSurge/.test(v)) c.tag(d, 'tags', 'tests:ovu-pos');
      else if (/Negative/.test(v)) c.tag(d, 'tags', 'tests:ovu-neg');
    } else if (t === 'PregnancyTestResult') {
      if (/Positive/.test(v)) c.tag(d, 'tags', 'tests:preg-pos');
      else if (/Negative/.test(v)) c.tag(d, 'tags', 'tests:preg-neg');
    } else if (t === 'CervicalMucusQuality') {
      const m = /EggWhite/.test(v) ? 'egg-white' : /Watery/.test(v) ? 'watery' : /Creamy/.test(v) ? 'creamy' : /Sticky/.test(v) ? 'sticky' : /Dry/.test(v) ? 'none' : null;
      if (m) c.tag(d, 'tags', `discharge:${m}`);
    } else if (t === 'SexualActivity') {
      const prot = /key="HKSexualActivityProtectionUsed" value="(\d)"/.exec(xml)?.[1];
      c.tag(d, 'tags', prot === '1' ? 'sex:protected' : prot === '0' ? 'sex:unprotected' : 'sex:had');
    } else if (t === 'MoodChanges') {
      if (!/NotPresent/.test(v)) c.tag(d, 'moods', 'swings');
    } else if (AH_SYMPTOM[t]) {
      if (!/NotPresent/.test(v)) c.tag(d, 'symptoms', AH_SYMPTOM[t]);
    } else this.records--;
  }
  finish(): ImportResult { this.push(''); this.c.rows = this.records; return this.c.result('apple-health'); }
}

// ---------------------------------------------------------------- generic JSON (Clue, Flo, others)

const DATE_KEY = /^(date|day|local_?date|logged_?(on|date)|entry_?date|calendar_?date)$/i;
const TS_KEY = /^(timestamp|time|date_?time|start_?time)$/i;
const START_KEY = /^(period_?)?start(_?date|ed_?at|_?day)?$|^(first_?day|from)$/i;
const END_KEY = /^(period_?)?end(_?date|ed_?at|_?day)?$|^(last_?day|to|until)$/i;
const PERIODISH = /period|menstru|bleed|flow|cycle/i;
const LABEL_KEY = /^(type|category|sub_?category|kind|name|label|value|option|options|tags?|symptoms?|moods?|emotions?|feelings?|pain|energy|mind|activities?|selected)$/i;
const NOTE_KEY = /^(note|notes|comment|comments|text|journal|diary)$/i;
const SKIP_KEY = /^(id|_id|uuid|user_?id|created(_at)?|updated(_at)?|modified|version|source|timezone|tz|offset)$/i;

function guessSource(name: string, v: unknown): ImportSource {
  const s = JSON.stringify(v).slice(0, 4000).toLowerCase();
  if (/clue/.test(name.toLowerCase()) || /cluedata|"clue/.test(s)) return 'clue';
  if (/flo/.test(name.toLowerCase()) || /"flo|iggymedia|point_events|operationaldata/.test(s)) return 'flo';
  return 'json';
}

/** Read any JSON export by shape. */
export function importJsonAny(value: unknown, opts: ImportOptions, name = ''): ImportResult {
  // Avelune's own JSON export.
  const av = value as { version?: number; records?: SyncRecord[] };
  if (av && Array.isArray(av.records) && av.records.some((r) => typeof r?.id === 'string' && r.id.startsWith('day:'))) {
    const c = new Collector(opts);
    for (const r of av.records) {
      const l = r.data as DayLog | null;
      if (!r.id.startsWith('day:') || r.deleted || !l?.date) continue;
      c.rows++;
      c.logs.set(l.date, { ...l, symptoms: [...l.symptoms], moods: [...l.moods], tags: [...l.tags] });
    }
    return c.result('avelune');
  }
  const c = new Collector(opts);
  const seen = new Set<unknown>();
  const visit = (node: unknown, path: string, depth: number) => {
    if (depth > 12 || node == null || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const x of node) visit(x, path, depth + 1); return; }
    const o = node as Record<string, unknown>;
    const keys = Object.keys(o);
    const ctx = `${path} ${keys.join(' ')}`;
    // 1) Period ranges: { start, end } inside something about periods/cycles.
    const sk = keys.find((k) => START_KEY.test(k) && isoDay(o[k]));
    const ek = keys.find((k) => END_KEY.test(k) && isoDay(o[k]));
    if (sk && PERIODISH.test(ctx)) {
      const s = isoDay(o[sk])!;
      const e = ek ? isoDay(o[ek])! : addDays(s, (opts.periodLength ?? 5) - 1);
      const len = diffDays(s, e);
      if (len >= 0 && len <= 15) { c.rows++; for (let i = 0; i <= len; i++) c.flow(addDays(s, i), 3); }
      // Ranges usually sit inside a cycle object; keep walking for nested data but skip label parsing here.
      for (const k of keys) if (typeof o[k] === 'object') visit(o[k], `${path}.${k}`, depth + 1);
      return;
    }
    // 2) Dated entries.
    const dk = keys.find((k) => DATE_KEY.test(k) && isoDay(o[k])) ?? keys.find((k) => TS_KEY.test(k) && isoDay(o[k]));
    if (dk) {
      const d = isoDay(o[dk])!;
      c.rows++;
      readEntry(c, d, o, path, keys.filter((k) => k !== dk));
      for (const k of keys) if (k !== dk && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && Object.values(o[k] as object).some((x) => typeof x === 'object')) visit(o[k], `${path}.${k}`, depth + 1);
      return;
    }
    // 3) Objects keyed by date: { "2024-01-02": {...} }
    for (const k of keys) {
      const d = /^\d{4}-\d{2}-\d{2}/.test(k) ? isoDay(k) : null;
      if (d && o[k] && typeof o[k] === 'object') { c.rows++; const inner = o[k] as Record<string, unknown>; readEntry(c, d, inner, `${path}.${k}`, Object.keys(inner)); }
      else visit(o[k], `${path}.${k}`, depth + 1);
    }
  };
  visit(value, '', 0);
  return c.result(guessSource(name, value));
}

/** Pull flow, temperature, notes and labels out of one dated object (flattening one level of nesting). */
function readEntry(c: Collector, d: DateStr, o: Record<string, unknown>, path: string, keys: string[]) {
  const flat: [string, unknown][] = [];
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v as object)) flat.push([`${k}.${k2}`, v2]);
    else flat.push([k, v]);
  }
  const strings = flat.filter(([, v]) => typeof v === 'string') as [string, string][];
  // A "type"/"category" naming the period means the other values describe the flow.
  const typeIsPeriod = strings.some(([k, v]) => /(^|\.)(type|category|kind|name)$/i.test(k) && /^(period|menstruation|bleeding|flow|menstrual_?flow)$/i.test(v.trim()));
  let gotFlow = false;
  for (const [k, v] of flat) {
    const last = k.split('.').pop()!;
    if (SKIP_KEY.test(last)) continue;
    const kctx = `${path} ${k}`;
    if (typeof v === 'number') {
      if (/temp|bbt/i.test(k)) c.bbt(d, v);
      else if (/weight/i.test(k) && v > 20 && v < 400) c.get(d).weight = Math.round(v * 10) / 10;
      else if (PERIODISH.test(k) && v >= 0 && v <= 4 && !gotFlow) { c.flow(d, Math.round(v) as Flow); gotFlow = true; }
      continue;
    }
    if (typeof v === 'boolean') {
      if (v && PERIODISH.test(last)) { c.flow(d, 3); gotFlow = true; } else if (v) c.label(d, last, 'symptoms', false);
      continue;
    }
    const values = typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    for (const s of values) {
      if (NOTE_KEY.test(last)) { c.note(d, s); continue; }
      if (/^(type|category|kind)$/i.test(last) && /^(period|menstruation|bleeding|flow|menstrual_?flow|symptom|symptoms|mood|moods|emotion|note|notes)$/i.test(s.trim())) continue;
      if (typeIsPeriod || PERIODISH.test(kctx)) {
        const f = parseFlow(s);
        if (f != null) { c.flow(d, f); gotFlow = true; continue; }
      }
      if (/temp|bbt/i.test(k)) { const n = parseFloat(s); if (Number.isFinite(n)) { c.bbt(d, n); continue; } }
      if (LABEL_KEY.test(last) || Array.isArray(v)) {
        const kind = /mood|emotion|feeling|mind/i.test(kctx) ? 'moods' : /activit|sex|test|pill|discharge|fluid|mucus/i.test(kctx) ? 'tags' : 'symptoms';
        c.label(d, s, kind, s.length <= 40 && !/^[0-9a-f-]{16,}$/i.test(s));
      }
    }
  }
}

// ---------------------------------------------------------------- files and zips

export interface ImportFile { name: string; text?: string }

/** Import a non-zip file whose text is already loaded. */
export function importText(name: string, text: string, opts: ImportOptions): ImportResult {
  const t = text.replace(/^﻿/, '');
  const lower = name.toLowerCase();
  if (lower.endsWith('.xml') || t.slice(0, 600).includes('<HealthData')) { const r = new AppleHealthReader(opts); r.push(t); return r.finish(); }
  if (/^\s*[[{]/.test(t)) {
    try { return importJsonAny(JSON.parse(t), opts, name); } catch { /* not JSON after all; fall through to CSV */ }
  }
  if (isDripCsv(t)) return importDripCsv(t, opts);
  const r = importRows(parseCSV(t), opts);
  r.source = /natural|nc_|daily_?entries/i.test(lower) ? SOURCE_LABEL['natural-cycles'] : SOURCE_LABEL.csv;
  return r;
}

/** Merge several partial results (e.g. the CSV files inside a Natural Cycles zip). */
export function mergeResults(parts: ImportResult[]): ImportResult {
  const useful = parts.filter((p) => p.logs.length || p.health.length);
  if (useful.length <= 1) return useful[0] ?? parts[0];
  const logs = new Map<DateStr, DayLog>();
  for (const p of useful) for (const l of p.logs) {
    const e = logs.get(l.date);
    if (!e) { logs.set(l.date, { ...l }); continue; }
    e.flow = Math.max(e.flow, l.flow) as Flow;
    for (const k of ['symptoms', 'moods', 'tags'] as const) e[k] = [...new Set([...e[k], ...l[k]])];
    e.bbt ??= l.bbt; e.weight ??= l.weight; e.notes ??= l.notes;
  }
  const merged = [...logs.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const health = useful.flatMap((p) => p.health);
  const all = [...merged.map((l) => l.date), ...health.map((h) => h.date)].sort();
  return {
    ...useful[0], logs: merged, health, rows: useful.reduce((a, p) => a + p.rows, 0),
    skipped: useful.flatMap((p) => p.skipped).slice(0, 50), unknownLabels: [...new Set(useful.flatMap((p) => p.unknownLabels))].slice(0, 50),
    range: all.length ? [all[0], all[all.length - 1]] : null, periodDays: merged.filter((l) => l.flow >= 2).length,
  };
}

function textOf(chunks: Uint8Array[]) {
  let text = '';
  const dec = new DecodeUTF8((s) => { text += s; });
  chunks.forEach((ch, i) => dec.push(ch, i === chunks.length - 1));
  if (!chunks.length) dec.push(new Uint8Array(0), true);
  return text;
}

/**
 * Stream a .zip: Apple Health's export.xml is parsed chunk by chunk; small CSV/JSON files inside are read whole.
 * `read(offset, length)` returns the next bytes of the file; `onProgress` gets 0..1.
 */
export async function importZip(
  size: number, read: (offset: number, length: number) => Promise<Uint8Array>, opts: ImportOptions, onProgress?: (p: number) => void,
): Promise<ImportResult> {
  const apple = new AppleHealthReader(opts);
  let sawApple = false;
  const small: { name: string; chunks: Uint8Array[]; done: boolean }[] = [];
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    const n = f.name.toLowerCase();
    if (/(^|\/)export\.xml$/.test(n)) {
      sawApple = true;
      const dec = new DecodeUTF8((s) => apple.push(s));
      f.ondata = (err, chunk, final) => { if (err) throw err; dec.push(chunk, final); };
      f.start();
    } else if (/\.(csv|json|cluedata|txt)$/.test(n) && !n.includes('__macosx')) {
      const entry = { name: f.name, chunks: [] as Uint8Array[], done: false };
      small.push(entry);
      f.ondata = (err, chunk, final) => { if (err) throw err; entry.chunks.push(chunk); entry.done = final; };
      f.start();
    }
  };
  const CHUNK = 2 * 1024 * 1024;
  for (let off = 0; off < size; off += CHUNK) {
    const len = Math.min(CHUNK, size - off);
    uz.push(await read(off, len), off + len >= size);
    onProgress?.(Math.min(1, (off + len) / size));
  }
  if (sawApple) return apple.finish();
  const garmin = small.filter((e) => /\.json$/i.test(e.name) && isGarminFile(e.name));
  if (garmin.length && garmin.length >= small.filter((e) => /\.json$/i.test(e.name)).length / 2) {
    const days = new Map<DateStr, HealthDay>();
    for (const e of garmin) {
      try { importGarminJson(JSON.parse(textOf(e.chunks)), days); } catch { /* skip unreadable file */ }
    }
    const c = new Collector(opts);
    c.rows = days.size;
    for (const h of days.values()) if (Object.keys(h).length > 1) c.health.set(h.date, h);
    return { ...c.result('garmin'), healthSource: 'garmin' };
  }
  const parts = small.map((e) => {
    const total = e.chunks.reduce((a, b) => a + b.length, 0);
    const buf = new Uint8Array(total);
    let o = 0;
    for (const ch of e.chunks) { buf.set(ch, o); o += ch.length; }
    let text = '';
    new DecodeUTF8((s) => { text += s; }).push(buf, true);
    return importText(e.name, text, opts);
  });
  const r = mergeResults(parts.length ? parts : [new Collector(opts).result('csv')]);
  if (small.some((e) => /natural|nc_|daily/i.test(e.name))) r.source = SOURCE_LABEL['natural-cycles'];
  return r;
}

/** Stream a bare Apple Health export.xml (already unzipped). */
export async function importXmlStream(
  size: number, read: (offset: number, length: number) => Promise<Uint8Array>, opts: ImportOptions, onProgress?: (p: number) => void,
): Promise<ImportResult> {
  const apple = new AppleHealthReader(opts);
  const dec = new DecodeUTF8((s) => apple.push(s));
  const CHUNK = 2 * 1024 * 1024;
  for (let off = 0; off < size; off += CHUNK) {
    const len = Math.min(CHUNK, size - off);
    dec.push(await read(off, len), off + len >= size);
    onProgress?.(Math.min(1, (off + len) / size));
  }
  return apple.finish();
}

// ---------------------------------------------------------------- Garmin Connect data export

/**
 * Garmin's "Export your data" archive (DI_CONNECT/…) holds daily summaries as JSON arrays keyed by
 * `calendarDate`. Field names are matched loosely because Garmin does not document them.
 */
const G: [RegExp, keyof HealthDay, (v: number) => number][] = [
  [/^(total)?steps$/i, 'steps', (v) => v],
  [/^(total)?distance(in)?meters$/i, 'distanceKm', (v) => Math.round(v / 10) / 100],
  [/^active(kilo)?calories$/i, 'activeKcal', (v) => Math.round(v)],
  [/^(current|wellness)?restingheartrate$/i, 'restingHr', (v) => v],
  [/^(min|lowest)heartrate$/i, 'hrMin', (v) => v],
  [/^(max|highest)heartrate$/i, 'hrMax', (v) => v],
  [/^(avg|average)(spo2|pulseox|oxygensaturation)/i, 'spo2', (v) => v],
  [/^(last)?(night)?(avg|average)?(overnight)?hrv(value)?$|^(weekly|lastnight)avg$/i, 'hrv', (v) => v],
  [/skin.*temp.*dev|temp.*deviation/i, 'tempDeviationC', (v) => v],
];

export function isGarminFile(name: string) { return /di[-_]connect|udsfile|sleepdata|garmin/i.test(name); }

export function importGarminJson(value: unknown, into: Map<DateStr, HealthDay> = new Map()): Map<DateStr, HealthDay> {
  const walk = (node: unknown, depth: number) => {
    if (depth > 6 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const x of node) walk(x, depth + 1); return; }
    const o = node as Record<string, unknown>;
    const d = isoDay(o.calendarDate ?? o.summaryDate ?? (typeof o.date === 'string' ? o.date : undefined));
    if (d) {
      const h = into.get(d) ?? into.set(d, { date: d }).get(d)!;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v !== 'number' || !Number.isFinite(v)) continue;
        for (const [re, field, conv] of G) if (re.test(k) && (h as unknown as Record<string, unknown>)[field] == null) (h as unknown as Record<string, number>)[field] = conv(v);
      }
      const sec = ['deepSleepSeconds', 'lightSleepSeconds', 'remSleepSeconds'].map((k) => o[k]).filter((v): v is number => typeof v === 'number');
      const total = typeof o.sleepTimeSeconds === 'number' ? o.sleepTimeSeconds : sec.length ? sec.reduce((a, b) => a + b, 0) : null;
      if (total && total > 3600 && h.sleepMin == null) h.sleepMin = Math.round(total / 60);
      if (typeof o.weight === 'number' && o.weight > 20000 && h.weightKg == null) h.weightKg = Math.round(o.weight / 100) / 10; // grams
    }
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, depth + 1);
  };
  walk(value, 0);
  return into;
}
