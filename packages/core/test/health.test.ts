import { describe, expect, it } from 'vitest';
import { dropSource, fmtSleep, fmtThousands, latest, mergeHealthDays, sampleHealth, series } from '../src';

describe('health merge', () => {
  it('higher-priority sources win per metric; lower ones fill gaps', () => {
    let d = mergeHealthDays({}, [{ date: '2026-10-30', steps: 5000, weightKg: 60 }], 'fitbit');
    d = mergeHealthDays(d, [{ date: '2026-10-30', steps: 6200 }], 'appleHealth');
    d = mergeHealthDays(d, [{ date: '2026-10-30', steps: 1, weightKg: 1 }], 'sample');
    expect(d['2026-10-30']).toMatchObject({ steps: 6200, weightKg: 60, sources: { steps: 'appleHealth', weightKg: 'fitbit' } });
  });
  it('ignores NaN / null values', () => {
    const d = mergeHealthDays({}, [{ date: '2026-10-30', steps: NaN, restingHr: undefined }], 'fitbit');
    expect(d['2026-10-30'].steps).toBeUndefined();
  });
  it('dropSource removes only that source, and empty days disappear', () => {
    let d = mergeHealthDays({}, sampleHealth('2026-10-31', 3), 'sample');
    d = mergeHealthDays(d, [{ date: '2026-10-31', steps: 1234 }], 'healthConnect');
    const left = dropSource(d, 'sample');
    expect(Object.keys(left)).toEqual(['2026-10-31']);
    expect(left['2026-10-31']).toEqual({ date: '2026-10-31', steps: 1234, sources: { steps: 'healthConnect' } });
  });
});

describe('series + helpers', () => {
  const days = mergeHealthDays({}, [
    { date: '2026-10-29', steps: 1000, restingHr: 60 }, { date: '2026-10-30', steps: 3000 }, { date: '2026-10-31', steps: 5000, restingHr: 64 },
  ], 'manual');
  it('daily series with gaps as null', () => {
    expect(series(days, 'steps', '2026-10-31', 4).map((p) => p.value)).toEqual([null, 1000, 3000, 5000]);
    expect(series(days, 'restingHr', '2026-10-31', 3).map((p) => p.value)).toEqual([60, null, 64]);
  });
  it('weekly buckets average per day', () => {
    expect(series(days, 'steps', '2026-10-31', 1, 'week')[0].value).toBe(3000);
  });
  it('latest looks back', () => {
    expect(latest(days, 'restingHr', '2026-10-30')).toEqual({ value: 60, date: '2026-10-29' });
    expect(latest(days, 'weightKg', '2026-10-31')).toBeNull();
  });
  it('formats', () => {
    expect(fmtSleep(510)).toBe('8 h 30 m');
    expect(fmtThousands(22555)).toBe('22,555');
  });
  it('sample data is deterministic and plausible', () => {
    const a = sampleHealth('2026-10-31', 30);
    expect(a).toEqual(sampleHealth('2026-10-31', 30));
    expect(a).toHaveLength(30);
    expect(a.every((d) => d.steps! > 4000 && d.sleepMin! > 380 && d.temperatureC! > 36)).toBe(true);
  });
});
