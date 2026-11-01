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
