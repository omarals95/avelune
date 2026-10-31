import { describe, expect, it } from 'vitest';
import { exportCSV, guessDateOrder, importCSV, mergeLogs, parseCSV, parseDateLoose, parseFlow } from '../src';

const LABELS: Record<string, string> = { cramps: 'cramps', headache: 'headache', 'tender breasts': 'tender-breasts', happy: 'happy', calm: 'calm', yoga: 'activity:yoga' };
const resolve = (l: string) => LABELS[l.toLowerCase()] ?? null;

describe('parseCSV', () => {
  it('handles quotes, escaped quotes, CRLF, BOM and blank lines', () => {
    expect(parseCSV('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n1,2')).toEqual([['a', 'b'], ['x, y', 'he said "hi"'], ['1', '2']]);
  });
  it('auto-detects ; and tab delimiters', () => {
    expect(parseCSV('date;flow\n2026-10-01;heavy')).toEqual([['date', 'flow'], ['2026-10-01', 'heavy']]);
    expect(parseCSV('date\tflow\n2026-10-01\tlight')[1]).toEqual(['2026-10-01', 'light']);
  });
});

describe('dates & flow', () => {
  it('parses ISO, day-first, month-first, 2-digit years and month names', () => {
    expect(parseDateLoose('2026-10-01', 'dmy')).toBe('2026-10-01');
    expect(parseDateLoose('2026/10/01 08:00', 'dmy')).toBe('2026-10-01');
    expect(parseDateLoose('01/10/2026', 'dmy')).toBe('2026-10-01');
    expect(parseDateLoose('10/01/2026', 'mdy')).toBe('2026-10-01');
    expect(parseDateLoose('1.10.26', 'dmy')).toBe('2026-10-01');
    expect(parseDateLoose('Oct 1, 2026', 'dmy')).toBe('2026-10-01');
    expect(parseDateLoose('31/02/2026', 'dmy')).toBeNull();
    expect(parseDateLoose('nonsense', 'dmy')).toBeNull();
  });
  it('guesses date order from the data', () => {
    expect(guessDateOrder(['13/10/2026', '01/11/2026'])).toBe('dmy');
    expect(guessDateOrder(['10/13/2026'])).toBe('mdy');
    expect(guessDateOrder(['01/02/2026'])).toBe('ambiguous');
    expect(guessDateOrder(['2026-10-01'])).toBe('dmy');
  });
  it('maps flow words and numbers', () => {
    expect(['heavy', 'Light', 'spotting', 'yes', 'none', '3', '', 'banana'].map(parseFlow)).toEqual([4, 2, 1, 3, 0, 3, null, null]);
  });
});

describe('importCSV', () => {
  it('imports one-row-per-day files with symptoms, moods, units and notes', () => {
    const csv = [
      'Date,Flow,Symptoms,Mood,BBT,Weight,Water,Sleep,Notes,Steps',
      '13/10/2026,heavy,"Cramps; Headache",Happy,97.7,62.5,1.5,7.5,"felt ""ok""",8000',
      '14/10/2026,light,Tender breasts|Unicorn,,98.6,,1800,450,,',
      'garbage,heavy,,,,,,,,',
    ].join('\n');
    const r = importCSV(csv, { resolve });
    expect(r.dateOrder).toBe('dmy');
    expect(r.logs).toHaveLength(2);
    expect(r.logs[0]).toMatchObject({ date: '2026-10-13', flow: 4, symptoms: ['cramps', 'headache'], moods: ['happy'], weight: 62.5, water: 1500, sleep: 7.5, notes: 'felt "ok"' });
    expect(r.logs[0].bbt).toBeCloseTo(36.5, 1); // °F auto-detected and converted
    expect(r.logs[1]).toMatchObject({ flow: 2, symptoms: ['tender-breasts'], water: 1800, sleep: 7.5 }); // ml and minutes handled
    expect(r.unknownLabels).toEqual(['Unicorn']);
    expect(r.skipped).toEqual([{ row: 4, reason: 'Unreadable date "garbage"' }]);
    expect(r.health).toEqual([{ date: '2026-10-13', steps: 8000, restingHr: undefined }]);
    expect(r.range).toEqual(['2026-10-13', '2026-10-14']);
  });
  it('imports period ranges (start/end) and fills start-only rows with the usual length', () => {
    const r = importCSV('Period start,Period end\n2026-09-03,2026-09-07\n2026-10-01,', { resolve, periodLength: 4 });
    expect(r.periodDays).toBe(9);
    expect(r.logs.map((l) => l.date)).toContain('2026-10-04');
    expect(r.logs.map((l) => l.date)).not.toContain('2026-10-05');
  });
  it('rejects files without a date column', () => {
    expect(importCSV('foo,bar\n1,2', { resolve }).skipped[0].reason).toMatch(/No date column/);
  });
  it('round-trips through exportCSV', () => {
    const logs = importCSV('date,flow,symptoms,notes\n2026-10-01,medium,"Cramps; Headache","a, b"', { resolve }).logs;
    const back = importCSV(exportCSV(logs, (id) => Object.keys(LABELS).find((k) => LABELS[k] === id) ?? id), { resolve }).logs;
    expect(back).toEqual(logs);
  });
});

describe('mergeLogs', () => {
  const base = { date: '2026-10-01', flow: 0 as const, symptoms: ['cramps'], moods: [], tags: [], notes: 'mine' };
  it('keeps existing values and unions lists by default', () => {
    expect(mergeLogs(base, { ...base, flow: 3, symptoms: ['headache'], notes: 'theirs' }, false)).toMatchObject({ flow: 3, symptoms: ['cramps', 'headache'], notes: 'mine' });
  });
  it('overwrites when asked', () => {
    expect(mergeLogs(base, { ...base, flow: 3, symptoms: ['headache'], notes: 'theirs' }, true)).toMatchObject({ symptoms: ['headache'], notes: 'theirs' });
  });
});
