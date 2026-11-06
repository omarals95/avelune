import { addDays, diffDays } from './dates';
import { dayMonth, languageCode, monthShort, tr, trn } from './i18n';
import { detectOvulation } from './ovulation';
import { derivePeriods, predict } from './predict';
import type { DateStr, DayLog, Settings } from './types';

/**
 * Doctor report: a self-contained, print-ready HTML page (A4) that the app turns into a PDF.
 * Covers cycle and period lengths, a cycle-length chart, symptoms by cycle day, ovulation and
 * luteal phase, spotting, pain medication and the health profile. Pure function, no I/O.
 */
export interface ReportOptions {
  today: DateStr;
  months: number;
  name?: string;
  /** Option id → readable label ("cramps" → "Cramps"). */
  label: (id: string) => string;
  unit?: 'C' | 'F';
}

const fmt = (d: DateStr) => `${dayMonth(d, true)} ${d.slice(0, 4)}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
// Label tables are functions so they are translated when the report is built, not at import time.
const FLOW = () => ['', tr('Spotting'), tr('Light'), tr('Medium'), tr('Heavy')];
const CONDITION = (): Record<string, string> => ({ pcos: tr('PCOS'), endometriosis: tr('Endometriosis'), thyroid: tr('Thyroid condition'), perimenopause: tr('Perimenopause'), 'no-uterus': tr('No uterus / ablation') });
const METHOD = (): Record<string, string> => ({
  none: tr('None'), 'combined-pill': tr('Combined pill'), 'mini-pill': tr('Progestogen-only pill'), 'hormonal-iud': tr('Hormonal IUD'), 'copper-iud': tr('Copper IUD'),
  implant: tr('Implant'), ring: tr('Vaginal ring'), patch: tr('Patch'), injection: tr('Injection'), barrier: tr('Barrier method'), fam: tr('Fertility awareness'),
});
const WHY = (): Record<string, string> => ({ unusual: tr('unusual length'), pregnancy: tr('pregnancy'), contraception: tr('before stopping hormonal contraception'), postpartum: tr('postpartum'), manual: tr('left out by user') });
const REGULARITY = (): Record<string, string> => ({ regular: tr('regular'), 'somewhat-irregular': tr('somewhat irregular'), irregular: tr('irregular'), unknown: tr('unknown') });

export function buildDoctorReport(logs: DayLog[], settings: Settings, o: ReportOptions): string {
  const from = addDays(o.today, -Math.round(o.months * 30.44));
  const map = new Map(logs.map((l) => [l.date, l]));
  const inRange = logs.filter((l) => l.date >= from && l.date <= o.today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const p = predict(logs, settings, o.today);
  const periods = derivePeriods(logs);
  const cycles = p.stats.cycles.filter((c) => addDays(c.start, c.length) > from);
  const counted = cycles.filter((c) => !c.excluded);
  const lens = counted.map((c) => c.length);
  const toTemp = (c: number) => (o.unit === 'F' ? (c * 9) / 5 + 32 : c);
  const tUnit = o.unit === 'F' ? '°F' : '°C';
  const rtl = languageCode() === 'ar';
  const FLOWS = FLOW(), WHYS = WHY();

  // ---- summary
  const avgP = Math.round(periods.filter((x) => x.start >= from).reduce((a, x) => a + x.length, 0) / Math.max(1, periods.filter((x) => x.start >= from).length));
  const summary: [string, string][] = [
    [tr('Typical cycle length'), lens.length ? trn(p.stats.avgCycle, '{n} days (range {min}–{max})|{n} days (range {min}–{max})', { min: Math.min(...lens), max: Math.max(...lens) }) : tr('Not enough cycles logged')],
    [tr('Cycle variation'), lens.length >= 3 ? tr('±{n} days ({regularity})', { n: p.stats.variability.toFixed(1), regularity: REGULARITY()[p.stats.regularity] ?? p.stats.regularity.replace('-', ' ') }) : '—'],
    [tr('Typical period length'), periods.some((x) => x.start >= from) ? trn(avgP, '{n} days|{n} days') : '—'],
    [tr('Cycles in this report'), cycles.length !== counted.length ? tr('{total} ({n} not counted in averages)', { total: cycles.length, n: cycles.length - counted.length }) : `${cycles.length}`],
    [tr('Last period started'), p.lastPeriodStart ? fmt(p.lastPeriodStart) : '—'],
  ];
  if (p.lutealLearned >= 2) summary.push([tr('Luteal phase'), trn(p.lutealLength, '{n} days (from {cycles} cycles with detected ovulation)|{n} days (from {cycles} cycles with detected ovulation)', { cycles: p.lutealLearned })]);
  const spotting = inRange.filter((l) => l.flow === 1).length;
  if (spotting) summary.push([tr('Spotting days'), `${spotting}`]);

  // ---- profile
  const pr = settings.profile ?? {};
  const profile: [string, string][] = [];
  if (pr.conditions?.length) {
    const conds = pr.conditions.map((c) => CONDITION()[c] ?? c).join(tr(', '));
    profile.push([tr('Conditions'), pr.hrt ? tr('{conditions} (on HRT)', { conditions: conds }) : conds]);
  }
  if (pr.contraception && pr.contraception !== 'none') {
    const method = METHOD()[pr.contraception] ?? pr.contraception;
    profile.push([tr('Contraception'), pr.contraceptionSince ? tr('{method} since {date}', { method, date: fmt(pr.contraceptionSince) }) : method]);
  }
  if (pr.stoppedHormonalOn) profile.push([tr('Stopped hormonal contraception'), fmt(pr.stoppedHormonalOn)]);
  if (pr.fertilityTreatment) profile.push([tr('Fertility treatment'), tr('Yes')]);
  for (const pg of settings.pregnancies ?? []) {
    if (pg.end < from) continue;
    const date = fmt(pg.end);
    profile.push([tr('Pregnancy'), pg.outcome === 'birth' ? tr('Birth on {date}', { date }) : pg.outcome === 'loss' ? tr('Pregnancy loss on {date}', { date }) : tr('Ended on {date}', { date })]);
  }
  if (settings.pregnancyLmp) profile.push([tr('Currently pregnant'), tr('LMP {date}', { date: fmt(settings.pregnancyLmp) })]);

  // ---- cycle table
  const rows = [...cycles].reverse().map((c) => {
    const days = Array.from({ length: c.length }, (_, i) => map.get(addDays(c.start, i)));
    const heaviest = Math.max(0, ...days.map((l) => l?.flow ?? 0));
    const ov = detectOvulation(map, c.start, addDays(c.start, c.length - 1));
    const pain = days.filter((l) => l?.symptoms.some((s) => /cramp|pain|ache/.test(s))).length;
    return `<tr${c.excluded ? ' class="muted"' : ''}><td>${fmt(c.start)}</td><td>${c.length}</td><td>${c.periodLength}</td><td>${FLOWS[heaviest] || '—'}</td><td>${ov ? (ov.confirmed ? tr('Day {n}', { n: diffDays(c.start, ov.date) + 1 }) : tr('Day {n} (est.)', { n: diffDays(c.start, ov.date) + 1 })) : '—'}</td><td>${pain || '—'}</td><td>${c.excluded ? esc(WHYS[c.reason ?? 'manual'] ?? '') : ''}</td></tr>`;
  });

  // ---- cycle length chart (SVG)
  const W = 680, H = 170, L = 34, B = 26;
  const maxLen = Math.max(40, ...cycles.map((c) => c.length));
  const bw = cycles.length ? Math.min(46, (W - L - 10) / cycles.length - 8) : 0;
  const bars = cycles.map((c, i) => {
    const x = L + 8 + i * ((W - L - 10) / Math.max(1, cycles.length));
    const h = ((H - B - 10) * c.length) / maxLen;
    return `<rect x="${x.toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${c.excluded ? '#d9cfd3' : '#9E4566'}"/>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${(H - B - h - 4).toFixed(1)}" text-anchor="middle" font-size="10">${c.length}</text>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="9" fill="#6b5a62">${monthShort(+c.start.slice(5, 7) - 1)}</text>`;
  }).join('');
  const grid = [0, 10, 20, 30, 40].filter((v) => v <= maxLen).map((v) => {
    const y = H - B - ((H - B - 10) * v) / maxLen;
    return `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#eee"/><text x="${L - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#6b5a62">${v}</text>`;
  }).join('');
  const chart = cycles.length ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}${bars}</svg>` : `<p class="muted">${tr('No completed cycles in this period.')}</p>`;

  // ---- symptoms by cycle day (heat map)
  const DAYS = 35;
  const starts = periods.map((x) => x.start);
  const cdOf = (d: DateStr) => { const s = starts.filter((x) => x <= d).pop(); return s ? diffDays(s, d) + 1 : null; };
  const symCount = new Map<string, number[]>();
  const nCycles = Math.max(1, cycles.length + (p.lastPeriodStart && p.lastPeriodStart >= from ? 1 : 0));
  for (const l of inRange) {
    const cd = cdOf(l.date);
    if (!cd || cd > DAYS) continue;
    for (const s of l.symptoms) {
      if (s === 'fine') continue;
      const arr = symCount.get(s) ?? symCount.set(s, Array(DAYS).fill(0)).get(s)!;
      arr[cd - 1]++;
    }
  }
  const topSym = [...symCount.entries()].sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0)).slice(0, 10);
  const heat = topSym.length ? `<table class="heat"><tr><th></th>${Array.from({ length: DAYS }, (_, i) => `<th>${(i + 1) % 5 === 1 || i === 0 ? i + 1 : ''}</th>`).join('')}<th>${tr('Days')}</th></tr>${topSym.map(([s, arr]) => `<tr><td class="lbl">${esc(o.label(s))}</td>${arr.map((v) => { const a = Math.min(1, v / nCycles); return `<td style="background:rgba(158,69,102,${(a * 0.9).toFixed(2)})" title="${v}"></td>`; }).join('')}<td class="num">${arr.reduce((x, y) => x + y, 0)}</td></tr>`).join('')}</table><p class="note">${tr('Shading shows how often each symptom was logged on that cycle day (darker = in more cycles).')}</p>` : `<p class="muted">${tr('No symptoms logged in this period.')}</p>`;

  // ---- medication
  const meds = settings.medications ?? [];
  const medRows = meds.map((m) => {
    const days = inRange.filter((l) => (l.meds?.[m.id] ?? 0) > 0);
    if (!days.length) return '';
    const doses = days.reduce((a, l) => a + (l.meds![m.id] ?? 0), 0);
    const maxDay = Math.max(...days.map((l) => l.meds![m.id] ?? 0));
    const period = days.filter((l) => (map.get(l.date)?.flow ?? 0) >= 2).length;
    return `<tr><td>${esc(m.name)}${m.dose ? ` <span class="muted">${esc(m.dose)}</span>` : ''}</td><td>${days.length}</td><td>${doses}</td><td>${maxDay}${m.maxPerDay && maxDay > m.maxPerDay ? ' ⚠' : ''}</td><td>${period}</td></tr>`;
  }).filter(Boolean);

  // ---- BBT of the most recent cycle with temperatures
  const lastTempCycle = [...cycles, ...(p.lastPeriodStart ? [{ start: p.lastPeriodStart, length: diffDays(p.lastPeriodStart, o.today) + 1 }] : [])]
    .reverse().find((c) => Array.from({ length: c.length }, (_, i) => map.get(addDays(c.start, i))?.bbt).filter((t) => t != null).length >= 6);
  let bbt = '';
  if (lastTempCycle) {
    const temps = Array.from({ length: lastTempCycle.length }, (_, i) => map.get(addDays(lastTempCycle.start, i))?.bbt);
    const vals = temps.filter((t): t is number => t != null).map(toTemp);
    const lo = Math.min(...vals) - 0.1, hi = Math.max(...vals) + 0.1;
    const x = (i: number) => L + 4 + (i * (W - L - 10)) / Math.max(1, temps.length - 1);
    const y = (t: number) => 10 + ((hi - toTemp(t)) * (H - B - 10)) / (hi - lo || 1);
    const pts = temps.map((t, i) => (t == null ? null : `${x(i).toFixed(1)},${y(t).toFixed(1)}`)).filter(Boolean);
    const ov = detectOvulation(map, lastTempCycle.start, addDays(lastTempCycle.start, lastTempCycle.length - 1));
    const ovX = ov ? x(diffDays(lastTempCycle.start, ov.date)) : null;
    bbt = `<h2>${esc(tr('Basal body temperature · cycle from {date}', { date: fmt(lastTempCycle.start) }))}</h2><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
      + `<text x="${L - 6}" y="14" text-anchor="end" font-size="9" fill="#6b5a62">${hi.toFixed(1)}</text><text x="${L - 6}" y="${H - B}" text-anchor="end" font-size="9" fill="#6b5a62">${lo.toFixed(1)}</text>`
      + (ov?.coverline ? `<line x1="${L}" x2="${W}" y1="${y(ov.coverline)}" y2="${y(ov.coverline)}" stroke="#c0b4ba" stroke-dasharray="4 4"/>` : '')
      + (ovX != null ? `<line x1="${ovX}" x2="${ovX}" y1="8" y2="${H - B}" stroke="#7A55A0" stroke-dasharray="3 3"/><text x="${ovX + 4}" y="18" font-size="9" fill="#7A55A0">${ov!.confirmed ? tr('ovulation') : tr('ovulation (est.)')}</text>` : '')
      + `<polyline points="${pts.join(' ')}" fill="none" stroke="#9E4566" stroke-width="1.6"/>${pts.map((q) => `<circle cx="${q!.split(',')[0]}" cy="${q!.split(',')[1]}" r="2.4" fill="#9E4566"/>`).join('')}`
      + `<text x="${L + 4}" y="${H - 8}" font-size="9" fill="#6b5a62">${tr('Cycle day 1')}</text><text x="${W}" y="${H - 8}" text-anchor="end" font-size="9" fill="#6b5a62">${tr('Day {n}', { n: temps.length })}</text></svg>`
      + `<p class="note">${tr('{unit}. Dashed horizontal line: cover line (highest of the six readings before the rise).', { unit: tUnit })}</p>`;
  }

  const notes = inRange.filter((l) => l.notes).slice(-12).map((l) => `<tr><td>${fmt(l.date)}</td><td>${esc(l.notes!.slice(0, 300))}</td></tr>`);
  const kv = (rows2: [string, string][]) => `<table class="kv">${rows2.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;

  // Right-to-left (Arabic): mirror text alignment and side padding; charts (SVG) stay left to right.
  const start = rtl ? 'right' : 'left', end = rtl ? 'left' : 'right';
  const font = rtl ? `"IBM Plex Sans Arabic", "Noto Naskh Arabic", "Geeza Pro", Tahoma, sans-serif` : `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
  return `<!doctype html><html${rtl ? ' dir="rtl" lang="ar"' : ''}><head><meta charset="utf-8"><title>${esc(tr('Cycle report'))}</title><style>
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; } body { font-family: ${font}; color: #2b1f26; font-size: 11pt; margin: 0; }${rtl ? ' svg { direction: ltr; }' : ''}
h1 { font-size: 20pt; margin: 0 0 2px; color: #5E2640; } h2 { font-size: 12.5pt; margin: 18px 0 6px; color: #5E2640; border-bottom: 1px solid #eadfe3; padding-bottom: 3px; }
.sub { color: #6b5a62; margin-bottom: 8px; } .muted { color: #8b7b83; } .note { color: #6b5a62; font-size: 8.5pt; margin: 4px 0 0; }
table { border-collapse: collapse; width: 100%; } td, th { padding: 4px 6px; text-align: ${start}; vertical-align: top; font-size: 9.5pt; }
table.data th { background: #f6eef0; font-weight: 600; } table.data td { border-bottom: 1px solid #f0e8ea; } tr.muted td { color: #9c8c94; }
table.kv th { width: 38%; color: #6b5a62; font-weight: 500; } table.kv td { font-weight: 600; }
table.heat td, table.heat th { padding: 0; height: 13px; font-size: 7pt; font-weight: 400; text-align: center; border: 1px solid #fff; } table.heat td.lbl { text-align: ${end}; padding-${end}: 6px; font-size: 8.5pt; white-space: nowrap; width: 1%; } table.heat td.num { font-size: 8pt; padding-${start}: 4px; }
.cols { display: flex; gap: 18px; } .cols > div { flex: 1; } .foot { margin-top: 18px; font-size: 8pt; color: #8b7b83; }
</style></head><body>
<h1>${esc(tr('Cycle report'))}${o.name ? ` · ${esc(o.name)}` : ''}</h1>
<div class="sub">${esc(tr('{from} – {to} · generated {date} with Avelune', { from: fmt(from), to: fmt(o.today), date: fmt(o.today) }))}</div>
<div class="cols"><div><h2>${tr('Summary')}</h2>${kv(summary)}</div>${profile.length ? `<div><h2>${tr('Health profile')}</h2>${kv(profile)}</div>` : ''}</div>
<h2>${tr('Cycle length')}</h2>${chart}
${rows.length ? `<h2>${tr('Cycles')}</h2><table class="data"><tr><th>${tr('Started')}</th><th>${tr('Cycle (days)')}</th><th>${tr('Period (days)')}</th><th>${tr('Heaviest flow')}</th><th>${tr('Ovulation')}</th><th>${tr('Pain days')}</th><th>${tr('Note')}</th></tr>${rows.join('')}</table>` : ''}
<h2>${tr('Symptoms by cycle day')}</h2>${heat}
${medRows.length ? `<h2>${tr('Medication')}</h2><table class="data"><tr><th>${tr('Medication')}</th><th>${tr('Days taken')}</th><th>${tr('Total doses')}</th><th>${tr('Most in one day')}</th><th>${tr('Days during period')}</th></tr>${medRows.join('')}</table>` : ''}
${bbt}
${notes.length ? `<h2>${tr('Recent notes')}</h2><table class="data">${notes.join('')}</table>` : ''}
<div class="foot">${tr('Self-reported data recorded in the Avelune app. Ovulation marked "(est.)" is estimated from an LH test or cervical mucus; other ovulation dates are confirmed by a basal temperature rise. This report is not a diagnosis.')}</div>
</body></html>`;
}
