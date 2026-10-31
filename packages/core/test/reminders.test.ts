import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS, DEFAULT_SETTINGS, addDays, planReminders, predict, type DayLog } from '../src';

const logs: DayLog[] = [0, 1, 2, 3, 4].map((i) => ({ date: addDays('2026-10-01', i), flow: 3, symptoms: [], moods: [], tags: [] }));
const pred = predict(logs, DEFAULT_SETTINGS, '2026-10-10'); // next period 2026-10-29
const now = new Date(2026, 9, 10, 8, 0);

describe('planReminders', () => {
  it('returns nothing when disabled or without data', () => {
    expect(planReminders(pred, DEFAULT_SETTINGS, DEFAULT_REMINDERS, now)).toEqual([]);
    expect(planReminders(predict([], DEFAULT_SETTINGS, '2026-10-10'), DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, periodSoon: true }, now)).toEqual([]);
  });
  it('schedules period reminders N days before at the chosen hour, across cycles', () => {
    const r = planReminders(pred, DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, periodSoon: true, periodDaysBefore: 2, hour: 9 }, now);
    expect(r.map((x) => x.date).slice(0, 2)).toEqual(['2026-10-27', '2026-11-24']);
    expect(r[0].at).toEqual(new Date(2026, 9, 27, 9, 0));
    expect(r).toHaveLength(4);
  });
  it('schedules fertile-window start (ovulation - 5)', () => {
    const r = planReminders(pred, DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, fertile: true }, now);
    expect(r[0].kind).toBe('fertile');
    expect(r[0].date).toBe('2026-10-10'); // next period 10-29, ovulation 10-15, window starts 10-10
  });
  it('drops reminders already in the past', () => {
    const late = new Date(2026, 9, 10, 10, 0);
    const r = planReminders(pred, DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, fertile: true }, late);
    expect(r[0].date).not.toBe('2026-10-10');
  });
  it('discreet mode reveals nothing about health; detailed mode does', () => {
    const d = planReminders(pred, DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, periodSoon: true }, now)[0];
    expect(`${d.title} ${d.body}`.toLowerCase()).not.toMatch(/period|fertile|cycle/);
    const v = planReminders(pred, DEFAULT_SETTINGS, { ...DEFAULT_REMINDERS, periodSoon: true, discreet: false }, now)[0];
    expect(v.body).toMatch(/period/i);
  });
});
