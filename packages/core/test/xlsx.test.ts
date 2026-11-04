import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importRows, pickSheet, readXlsx } from '../src';

const tpl = new Uint8Array(readFileSync(new URL('../../../app/assets/avelune-import-template.xlsx', import.meta.url)));
const resolve = (l: string) => l.toLowerCase().replace(/[^a-z]/g, '') || null;

describe('xlsx import', () => {
  it('reads all sheets of the template in order', () => {
    const sheets = readXlsx(tpl);
    expect(sheets.map((s) => s.name)).toEqual(['Your data', 'Example', 'How to fill']);
    expect(sheets[0].rows[0].slice(0, 3)).toEqual(['Date', 'Flow', 'Symptoms']);
  });

  it('never imports the example sheet from an untouched template', () => {
    const s = pickSheet(readXlsx(tpl))!;
    expect(s.name).toBe('Your data');
    expect(importRows(s.rows, { resolve }).logs).toHaveLength(0);
  });

  it('turns date-formatted cells into ISO dates and imports values', () => {
    const ex = readXlsx(tpl).find((s) => s.name === 'Example')!;
    expect(ex.rows[1][0]).toBe('2026-10-01');
    const r = importRows(ex.rows, { resolve });
    expect(r.logs).toHaveLength(5);
    const first = r.logs.find((l) => l.date === '2026-10-01')!;
    expect(first.flow).toBe(3);
    expect(first.bbt).toBeCloseTo(36.4);
    expect(first.water).toBe(1750);
    expect(r.health.find((h) => h.date === '2026-10-14')?.steps).toBe(12000);
  });

  it('accepts Excel serial numbers in a CSV date column', () => {
    const r = importRows([['Date', 'Flow'], ['46296', 'Light']], { resolve });
    expect(r.logs[0].date).toBe('2026-10-01');
  });
});

import { exportRows, isoToSerial, writeXlsx, SHEET_COLUMNS } from '../src';
describe('writeXlsx / exportRows', () => {
  const logs = [
    { date: '2026-10-02', flow: 4 as const, symptoms: ['cramps', 'headache'], moods: ['calm'], tags: ['activity:yoga'], bbt: 36.35, water: 2000, notes: 'Heavy day, "ouch" & <tired>\nsecond line' },
    { date: '2026-10-01', flow: 3 as const, symptoms: [], moods: [], tags: [], weight: 61.2 },
  ];
  const label = (id: string) => ({ cramps: 'Cramps', headache: 'Headache', calm: 'Calm', 'activity:yoga': 'Yoga' } as Record<string, string>)[id] ?? id;
  it('dates use Excel serials', () => {
    expect(isoToSerial('1900-03-01')).toBe(61);
    expect(isoToSerial('2026-10-01')).toBe(46296);
  });
  it('round-trips through readXlsx with the template columns, sorted by date', () => {
    const rows = exportRows(logs, label, [{ date: '2026-10-03', steps: 8123.6, restingHr: 61 }]);
    const bytes = writeXlsx([{ name: 'Your data', rows }, { name: 'About', rows: [['Exported from Avelune']], header: false }]);
    const sheets = readXlsx(bytes);
    expect(sheets.map((s) => s.name)).toEqual(['Your data', 'About']);
    const s = pickSheet(sheets)!;
    expect(s.name).toBe('Your data');
    expect(s.rows[0]).toEqual([...SHEET_COLUMNS]);
    expect(s.rows[1].slice(0, 7)).toEqual(['2026-10-01', 'Medium', '', '', '', '', '61.2']);
    expect(s.rows[2].slice(0, 8)).toEqual(['2026-10-02', 'Heavy', 'Cramps, Headache', 'Calm', 'Yoga', '36.35', '', '2000']);
    expect(s.rows[2][12]).toBe('Heavy day, "ouch" & <tired>\nsecond line');
    expect(s.rows[3][0]).toBe('2026-10-03');
    expect(s.rows[3].slice(10, 12)).toEqual(['8124', '61']);
  });
});
