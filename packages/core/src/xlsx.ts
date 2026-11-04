import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/**
 * Minimal .xlsx reader: enough to import a filled-in Avelune template or any simple spreadsheet.
 * Reads every worksheet into rows of strings. Date-formatted cells become YYYY-MM-DD.
 */
export interface Sheet { name: string; rows: string[][] }

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m);

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]) : undefined;
};

/** Concatenate all <t> runs (handles rich text). */
const texts = (xml: string) => {
  let out = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += decode(m[1]);
  return out;
};

const colIndex = (ref: string) => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
const isDateFormat = (code: string) => {
  const c = code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
  return /[dmy]/i.test(c) && !/^[#0.,%\s]*$/.test(c);
};

export function serialToISO(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
  return d.toISOString().slice(0, 10);
}

export function readXlsx(bytes: Uint8Array): Sheet[] {
  const files = unzipSync(bytes);
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : '');
  const shared: string[] = [];
  for (const m of read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(texts(m[1]));

  // Which style indexes are dates.
  const styles = read('xl/styles.xml');
  const custom = new Map<number, string>();
  for (const m of styles.matchAll(/<numFmt\s[^>]*>/g)) custom.set(Number(attr(m[0], 'numFmtId')), attr(m[0], 'formatCode') ?? '');
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? '';
  const dateStyle: boolean[] = [];
  for (const m of xfs.matchAll(/<xf\s[^>]*?\/?>/g)) {
    const id = Number(attr(m[0], 'numFmtId') ?? 0);
    dateStyle.push(BUILTIN_DATE.has(id) || (custom.has(id) && isDateFormat(custom.get(id)!)));
  }

  // Sheet names in workbook order → file paths.
  const rels = new Map<string, string>();
  for (const m of read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s[^>]*>/g)) {
    const id = attr(m[0], 'Id'), target = attr(m[0], 'Target');
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`);
  }
  const sheets: Sheet[] = [];
  for (const m of read('xl/workbook.xml').matchAll(/<sheet\s[^>]*>/g)) {
    const name = attr(m[0], 'name') ?? `Sheet${sheets.length + 1}`;
    const rid = attr(m[0], 'r:id');
    const path = (rid && rels.get(rid)) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
    sheets.push({ name, rows: readSheet(read(path), shared, dateStyle) });
  }
  return sheets;
}

function readSheet(xml: string, shared: string[], dateStyle: boolean[]): string[][] {
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const rAttr = rm[1] ?? rm[3] ?? '';
    const rowNum = Number(attr(`<row${rAttr}>`, 'r') ?? rows.length + 1) - 1;
    const row: string[] = [];
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = `<c${cm[1]}>`;
      const body = cm[2] ?? '';
      const ref = attr(tag, 'r');
      const idx = ref ? colIndex(ref) : row.length;
      const t = attr(tag, 't');
      const s = Number(attr(tag, 's') ?? 0);
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let val = '';
      if (t === 's') val = shared[Number(v)] ?? '';
      else if (t === 'inlineStr') val = texts(body);
      else if (t === 'str' || t === 'e') val = v != null ? decode(v) : '';
      else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else if (v != null) {
        const n = Number(v);
        val = dateStyle[s] && Number.isFinite(n) ? serialToISO(n) : String(+n.toPrecision(12));
      }
      while (row.length < idx) row.push('');
      row[idx] = val;
    }
    while (rows.length < rowNum) rows.push([]);
    rows[rowNum] = row;
  }
  return rows;
}

const SKIP = /example|sample|how to|instructions|help|readme|guide/i;

/** The sheet to import: the first non-instruction sheet that has data below its header. */
export function pickSheet(sheets: Sheet[]): Sheet | null {
  const filled = (s: Sheet) => s.rows.filter((r) => r.some((c) => c.trim() !== '')).length >= 2;
  // Never fall back to the template's example sheet: an untouched template imports nothing.
  return sheets.find((s) => !SKIP.test(s.name) && filled(s)) ?? sheets.find((s) => !SKIP.test(s.name)) ?? sheets[0] ?? null;
}

/* ------------------------------------------------------------------------------------------------ */
/* Writer                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** A cell to write: text, a number, a calendar date ({ date: 'YYYY-MM-DD' }) or empty. */
export type OutCell = string | number | { date: string } | null | undefined;
export interface OutSheet { name: string; rows: OutCell[][]; widths?: number[]; header?: boolean }

const esc = (v: string) =>
  v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i: number) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
/** Excel serial day number for a YYYY-MM-DD date (days since 1899-12-30). */
export const isoToSerial = (d: string) => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000);

/** Styles: 0 default, 1 bold header, 2 date (yyyy-mm-dd), 3 wrapped text. */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E6EA"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function sheetXml(s: OutSheet): string {
  const rows = s.rows.map((r, ri) => {
    const cells = r.map((v, ci) => {
      const ref = `${colName(ci)}${ri + 1}`;
      const head = s.header !== false && ri === 0;
      if (v == null || v === '') return '';
      if (typeof v === 'number') return Number.isFinite(v) ? `<c r="${ref}"${head ? ' s="1"' : ''}><v>${v}</v></c>` : '';
      if (typeof v === 'object') return `<c r="${ref}" s="2"><v>${isoToSerial(v.date)}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${head ? 1 : v.includes('\n') ? 3 : 0}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join('');
  const cols = s.widths?.length ? `<cols>${s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const freeze = s.header !== false ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

/** Build a real .xlsx workbook (opens in Excel, Google Sheets and Numbers; re-imports with readXlsx). */
export function writeXlsx(sheets: OutSheet[]): Uint8Array {
  const names = sheets.map((s) => esc(s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files, { level: 6 });
}
