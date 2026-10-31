import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS, DEFAULT_SETTINGS, addDays, dailyReminders, normalizeReminders, planReminders, predict, type DayLog, type ReminderPrefs } from '../src';

const logs: DayLog[] = [0, 1, 2, 3, 4].map((i) => ({ date: addDays('2026-10-01', i), flow: 3, symptoms: [], moods: [], tags: [] }));
const pred = predict(logs, DEFAULT_SETTINGS, '2026-10-10'); // next period 2026-10-29, ovulation 10-15
const now = new Date(2026, 9, 10, 8, 0);
const on = (patch: Partial<Record<keyof ReminderPrefs, object | boolean>>): ReminderPrefs => {
  const r = structuredClone(DEFAULT_REMINDERS) as any;
  for (const [k, v] of Object.entries(patch)) r[k] = typeof v === 'object' ? { ...r[k], ...v } : v;
  return r;
};

describe('planReminders', () => {
  it('returns nothing when disabled, without data, or in pregnancy mode', () => {
    expect(planReminders(pred, DEFAULT_SETTINGS, DEFAULT_REMINDERS, now)).toEqual([]);
    expect(planReminders(predict([], DEFAULT_SETTINGS, '2026-10-10'), DEFAULT_SETTINGS, on({ periodSoon: { on: true } }), now)).toEqual([]);
    expect(planReminders(pred, { ...DEFAULT_SETTINGS, pregnancyLmp: '2026-10-01' }, on({ periodSoon: { on: true } }), now)).toEqual([]);
  });
  it('period soon: N days before at the chosen time, across cycles', () => {
    const r = planReminders(pred, DEFAULT_SETTINGS, on({ periodSoon: { on: true, daysBefore: 2, hour: 10, minute: 30 } }), now);
    expect(r.map((x) => x.date).slice(0, 2)).toEqual(['2026-10-27', '2026-11-24']);
    expect(r[0].at).toEqual(new Date(2026, 9, 27, 10, 30));
    expect(r).toHaveLength(4);
  });
  it('ovulation, fertile start, period start and end', () => {
    const r = planReminders(pred, DEFAULT_SETTINGS, on({ ovulation: { on: true }, fertile: { on: true }, periodStart: { on: true }, periodEnd: { on: true } }), now);
    const first = (k: string) => r.find((x) => x.kind === k)?.date;
    expect(first('fertile')).toBe('2026-10-10');
    expect(first('ovulation')).toBe('2026-10-15');
    expect(first('periodStart')).toBe('2026-10-29');
    expect(first('periodEnd')).toBe('2026-11-02');
  });
  it('drops reminders already in the past', () => {
    const r = planReminders(pred, DEFAULT_SETTINGS, on({ fertile: { on: true, hour: 9 } }), new Date(2026, 9, 10, 10, 0));
    expect(r[0].date).not.toBe('2026-10-10');
  });
  it('discreet mode reveals nothing about health; detailed mode does', () => {
    const d = planReminders(pred, DEFAULT_SETTINGS, on({ periodSoon: { on: true } }), now)[0];
    expect(`${d.title} ${d.body}`.toLowerCase()).not.toMatch(/period|fertile|cycle|ovulation/);
    const v = planReminders(pred, DEFAULT_SETTINGS, on({ discreet: false, periodSoon: { on: true } }), now)[0];
    expect(v.body).toMatch(/period/i);
  });
});

describe('dailyReminders', () => {
  it('expands water into repeats and respects toggles', () => {
    const r = dailyReminders(on({ discreet: false, pill: { on: true, hour: 21 }, water: { on: true, hour: 9, endHour: 18, everyHours: 3 } }));
    expect(r.filter((x) => x.kind.startsWith('water')).map((x) => x.hour)).toEqual([9, 12, 15, 18]);
    expect(r.find((x) => x.kind === 'pill')?.body).toMatch(/pill/);
    expect(dailyReminders(DEFAULT_REMINDERS)).toEqual([]);
  });
  it('normalizes old/partial prefs', () => {
    const n = normalizeReminders({ discreet: false, periodSoon: { on: true }, junk: 1, fertile: true });
    expect(n.discreet).toBe(false);
    expect(n.periodSoon).toMatchObject({ on: true, daysBefore: 2, hour: 10 });
    expect(n.fertile).toEqual(DEFAULT_REMINDERS.fertile);
  });
});
