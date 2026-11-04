import { describe, expect, it } from 'vitest';
import { addDays, DEFAULT_SETTINGS, derivePeriods, diffDays, predict, shouldApply, type DayLog } from '../src';

const log = (date: string, flow: DayLog['flow']): DayLog => ({ date, flow, symptoms: [], moods: [], tags: [] });
const periodDays = (start: string, n: number) => Array.from({ length: n }, (_, i) => log(addDays(start, i), 3));

describe('dates', () => {
  it('adds days across month/year/DST boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(diffDays('2026-03-01', '2026-11-01')).toBe(245);
  });
});

describe('predict', () => {
  const logs = [...periodDays('2026-07-01', 5), ...periodDays('2026-07-29', 5), ...periodDays('2026-08-26', 4), ...periodDays('2026-09-23', 5)];
  it('derives periods and 28-day cycles', () => {
    const ps = derivePeriods(logs);
    expect(ps.map((p) => p.start)).toEqual(['2026-07-01', '2026-07-29', '2026-08-26', '2026-09-23']);
    const p = predict(logs, DEFAULT_SETTINGS, '2026-10-05');
    expect(p.stats.avgCycle).toBe(28);
    expect(p.stats.regularity).toBe('regular');
    expect(p.nextPeriodStart).toBe('2026-10-21');
    expect(p.ovulationDate).toBe('2026-10-07');
    expect(p.fertileWindow).toEqual(['2026-10-02', '2026-10-08']);
    expect(p.cycleDay).toBe(13);
    expect(p.daysUntilPeriod).toBe(16);
  });
  it('returns nulls with no data', () => {
    const p = predict([], DEFAULT_SETTINGS, '2026-10-05');
    expect(p.nextPeriodStart).toBeNull();
    expect(p.cycleDay).toBeNull();
  });
  it('spotting alone does not start a period', () => {
    expect(derivePeriods([log('2026-10-01', 1)])).toEqual([]);
  });
  it('flags irregular cycles', () => {
    const irr = [...periodDays('2026-01-01', 4), ...periodDays('2026-01-25', 4), ...periodDays('2026-03-10', 4), ...periodDays('2026-04-01', 4), ...periodDays('2026-05-20', 4)];
    expect(predict(irr, DEFAULT_SETTINGS, '2026-06-01').stats.regularity).toBe('irregular');
  });
});

describe('sync merge', () => {
  it('last write wins, deletes win ties', () => {
    expect(shouldApply(undefined, { updatedAt: 1, deleted: false })).toBe(true);
    expect(shouldApply({ updatedAt: 5, deleted: false }, { updatedAt: 4, deleted: false })).toBe(false);
    expect(shouldApply({ updatedAt: 5, deleted: false }, { updatedAt: 5, deleted: true })).toBe(true);
    expect(shouldApply({ updatedAt: 5, deleted: true }, { updatedAt: 5, deleted: false })).toBe(false);
  });
});

import { classifyDay } from '../src';
describe('classifyDay', () => {
  it('marks logged, predicted, fertile and ovulation days', () => {
    const logs = [...periodDays('2026-08-26', 4), ...periodDays('2026-09-23', 5)];
    const m = new Map(logs.map((l) => [l.date, l]));
    const p = predict(logs, DEFAULT_SETTINGS, '2026-10-05');
    expect(classifyDay('2026-09-24', m, p, DEFAULT_SETTINGS)).toBe('period');
    expect(classifyDay('2026-10-07', m, p, DEFAULT_SETTINGS)).toBe('ovulation');
    expect(classifyDay('2026-10-04', m, p, DEFAULT_SETTINGS)).toBe('fertile');
    expect(classifyDay('2026-10-22', m, p, DEFAULT_SETTINGS)).toBe('predicted-period');
    expect(classifyDay('2026-10-12', m, p, DEFAULT_SETTINGS)).toBe('none');
  });
});

import { phaseOn } from '../src';
describe('phaseOn', () => {
  const logs = [...periodDays('2026-07-01', 5), ...periodDays('2026-07-29', 5), ...periodDays('2026-08-26', 4), ...periodDays('2026-09-23', 5)];
  const m = new Map(logs.map((l) => [l.date, l]));
  const p = predict(logs, DEFAULT_SETTINGS, '2026-10-05');
  const on = (d: string, s = DEFAULT_SETTINGS) => phaseOn(d, m, p, s);
  it('follows the current cycle: period, follicular, ovulation phase, luteal, predicted period', () => {
    expect(on('2026-09-23')).toBe('menstrual');
    expect(on('2026-09-27')).toBe('menstrual');
    expect(on('2026-09-28')).toBe('follicular'); // the day after the period ends is not a period day
    expect(on('2026-10-01')).toBe('follicular');
    expect(on('2026-10-02')).toBe('ovulation'); // fertile window opens
    expect(on('2026-10-07')).toBe('ovulation'); // ovulation day
    expect(on('2026-10-08')).toBe('ovulation');
    expect(on('2026-10-09')).toBe('luteal');
    expect(on('2026-10-13')).toBe('luteal'); // cycle day 21
    expect(on('2026-10-20')).toBe('luteal');
    expect(on('2026-10-21')).toBe('menstrual'); // predicted period
    expect(on('2026-10-26')).toBe('follicular'); // next cycle
  });
  it('places past cycles too, using when the next period actually started', () => {
    expect(on('2026-08-27')).toBe('menstrual');
    expect(on('2026-08-31')).toBe('follicular');
    expect(on('2026-09-09')).toBe('ovulation'); // 14 days before the 23 Sep period
    expect(on('2026-09-15')).toBe('luteal');
    expect(on('2026-09-22')).toBe('luteal');
  });
  it('never shows the ovulation phase when the fertile window is hidden', () => {
    const hidden = { ...DEFAULT_SETTINGS, showFertileWindow: false };
    expect(on('2026-10-04', hidden)).toBe('follicular');
    expect(on('2026-10-09', hidden)).toBe('luteal');
  });
  it('is null before the first period', () => {
    expect(on('2026-06-15')).toBeNull();
  });
});
