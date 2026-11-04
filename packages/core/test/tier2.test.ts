import { describe, expect, it } from 'vitest';
import {
  addDays, buildDoctorReport, buildSnapshot, contraceptionEvents, contraceptionStatus, dailyReminders, decodeInvite, DEFAULT_REMINDERS, DEFAULT_SETTINGS,
  detectOvulation, encodeInvite, inviteLink, planReminders, predict, snapshotKind, type DayLog, type Settings,
} from '../src';

const day = (date: string, p: Partial<DayLog> = {}): DayLog => ({ date, flow: 0, symptoms: [], moods: [], tags: [], ...p });
/** One cycle starting at `start`: 4 period days, temps low until `shiftDay` (cycle day, 1-based), then high. */
function cycle(start: string, len: number, shiftDay: number | null, extra: Record<number, Partial<DayLog>> = {}) {
  return Array.from({ length: len }, (_, i) => {
    const cd = i + 1;
    const bbt = shiftDay == null ? undefined : cd >= shiftDay ? 36.75 + (cd % 2) * 0.05 : 36.35 + (cd % 3) * 0.05;
    return day(addDays(start, i), { flow: cd <= 4 ? 3 : 0, bbt, ...(extra[cd] ?? {}) });
  });
}
const S = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...p });

describe('ovulation fusion', () => {
  it('confirms ovulation from a temperature shift and pins it with an LH test', () => {
    const logs = cycle('2026-10-01', 20, 16, { 14: { tags: ['tests:ovu-pos'] }, 15: { tags: ['discharge:egg-white'] }, 16: { tags: ['discharge:sticky'] } });
    const ov = detectOvulation(new Map(logs.map((l) => [l.date, l])), '2026-10-01', '2026-10-20')!;
    expect(ov.confirmed).toBe(true);
    expect(ov.date).toBe('2026-10-15'); // LH day 14 + 1
    expect(ov.sources).toEqual(['bbt', 'lh', 'mucus']);
    expect(ov.coverline).toBeCloseTo(36.45, 2);
  });
  it('LH alone gives an estimate; no shift and no tests gives nothing', () => {
    const m = new Map(cycle('2026-10-01', 20, null, { 12: { tags: ['tests:ovu-pos'] } }).map((l) => [l.date, l]));
    expect(detectOvulation(m, '2026-10-01', '2026-10-20')).toMatchObject({ date: '2026-10-13', confirmed: false, sources: ['lh'] });
    expect(detectOvulation(new Map(cycle('2026-10-01', 20, null).map((l) => [l.date, l])), '2026-10-01', '2026-10-20')).toBeNull();
  });
  it('a confirmed ovulation moves the forecast and learns the luteal phase', () => {
    // Three past cycles, ovulation on day 18 (shift on 19), 30-day cycles → next period on day 31 → luteal 13.
    const logs = [...cycle('2026-07-01', 30, 19), ...cycle('2026-07-31', 30, 19), ...cycle('2026-08-30', 30, 19),
      // current cycle: ovulation early, on day 13 (shift day 14)
      ...cycle('2026-09-29', 18, 14)];
    const p = predict(logs, S(), '2026-10-16');
    expect(p.lutealLearned).toBe(3);
    expect(p.lutealLength).toBe(13);
    expect(p.ovulation?.confirmed).toBe(true);
    expect(p.ovulationDate).toBe('2026-10-11');
    expect(p.nextPeriodStart).toBe('2026-10-24'); // 11 Oct + 13, not 29 Sep + 30 = 29 Oct
    expect(p.phase).toBe('luteal');
    expect(p.confidence).toBe('high');
    expect(p.notes[0]).toMatch(/Ovulation confirmed by your temperature rise/);
  });
});

describe('contraception schedule', () => {
  it('pill pack days, breaks and new-pack events', () => {
    const pr = { contraception: 'combined-pill' as const, packStart: '2026-10-01', pillPack: '21+7' as const };
    expect(contraceptionStatus(pr, '2026-10-12')).toBe('Pill pack day 12 of 21');
    expect(contraceptionStatus(pr, '2026-10-24')).toBe('Pill-free day 3 of 7');
    const ev = contraceptionEvents(pr, '2026-10-12', 40);
    expect(ev.map((e) => [e.date, e.kind])).toEqual([['2026-10-22', 'break-start'], ['2026-10-29', 'pack-start'], ['2026-11-19', 'break-start']]);
  });
  it('IUD replacement and ring changes', () => {
    expect(contraceptionEvents({ contraception: 'copper-iud', contraceptionSince: '2017-01-10' }, '2026-11-01', 120).map((e) => e.date)).toEqual(['2026-11-11', '2027-01-10']);
    expect(contraceptionEvents({ contraception: 'ring', contraceptionSince: '2026-10-01' }, '2026-10-02', 30).map((e) => e.kind)).toEqual(['ring-out', 'ring-in']);
  });
  it('schedules contraception and medication reminders', () => {
    const settings = S({ profile: { contraception: 'combined-pill', packStart: '2026-10-01', pillPack: '24+4', contraReminders: true } });
    const r = planReminders(predict([], settings, '2026-10-10'), settings, DEFAULT_REMINDERS, new Date(2026, 9, 10, 8));
    expect(r[0]).toMatchObject({ kind: 'contraception', date: '2026-10-25' });
    const d = dailyReminders({ ...DEFAULT_REMINDERS, discreet: false }, [{ id: 'm1', name: 'Ibuprofen', kind: 'pain', dose: '400 mg', active: true, reminder: { hour: 8, minute: 15 } }]);
    expect(d).toEqual([expect.objectContaining({ kind: 'med-m1', hour: 8, minute: 15, body: 'Time for Ibuprofen (400 mg).' })]);
  });
});

describe('partner sharing choices', () => {
  const logs = [...cycle('2026-09-03', 28, null), ...cycle('2026-10-01', 10, null, { 10: { moods: ['happy'], symptoms: ['cramps'] } })];
  it('hides the fertile window and period when turned off', () => {
    const s = buildSnapshot(logs, S(), '2026-10-10', { items: { fertile: false, period: false } });
    expect(s.fertileWindow).toBeNull();
    expect(s.nextPeriodStart).toBeNull();
    expect(s.days.kinds).not.toMatch(/[fopq]/);
    expect(snapshotKind(s, '2026-10-01')).toBe('none');
  });
  it('shares moods and symptoms separately', () => {
    const s = buildSnapshot(logs, S(), '2026-10-10', { items: { moods: true } });
    expect(s.todayMoods).toEqual(['happy']);
    expect(s.todaySymptoms).toBeUndefined();
  });
  it('QR link form decodes to the same invite', () => {
    const inv = { url: 'https://avelune.example.com', id: 'A'.repeat(22), key: 'B'.repeat(43) };
    expect(decodeInvite(inviteLink(inv))).toEqual(inv);
    expect(decodeInvite(encodeInvite(inv))).toEqual(inv);
  });
});

describe('doctor report', () => {
  it('builds a self-contained report with cycles, symptoms, meds and BBT', () => {
    const logs = [...cycle('2026-07-01', 30, 19, { 1: { symptoms: ['cramps'], meds: { m1: 3 } }, 2: { symptoms: ['cramps', 'headache'], meds: { m1: 5 } } }),
      ...cycle('2026-07-31', 30, 19, { 1: { symptoms: ['cramps'] } }), ...cycle('2026-08-30', 30, 19), ...cycle('2026-09-29', 20, 14, { 3: { notes: 'Saw <GP>' } })];
    const settings = S({ profile: { conditions: ['endometriosis'], contraception: 'copper-iud', contraceptionSince: '2024-02-01' }, medications: [{ id: 'm1', name: 'Ibuprofen', kind: 'pain', dose: '200 mg', maxPerDay: 4, active: true }] });
    const html = buildDoctorReport(logs, settings, { today: '2026-10-18', months: 6, name: 'O', label: (id) => id[0].toUpperCase() + id.slice(1) });
    expect(html).toContain('<h1>Cycle report · O</h1>');
    expect(html).toContain('Endometriosis');
    expect(html).toContain('Copper IUD since 1 Feb 2024');
    expect(html).toContain('30 days (range 30–30)');
    expect(html).toContain('Cramps');
    expect(html).toMatch(/Ibuprofen.*<td>2<\/td><td>8<\/td><td>5 ⚠<\/td>/s);
    expect(html).toContain('Basal body temperature');
    expect(html).toContain('Saw &lt;GP&gt;');
    expect(html).not.toContain('<script');
  });
});
