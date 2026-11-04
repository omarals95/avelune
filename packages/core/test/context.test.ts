import { describe, expect, it } from 'vitest';
import { addDays, DEFAULT_SETTINGS, predict, type DayLog, type Settings } from '../src';

const log = (date: string, flow: DayLog['flow']): DayLog => ({ date, flow, symptoms: [], moods: [], tags: [] });
const period = (start: string, n = 4) => Array.from({ length: n }, (_, i) => log(addDays(start, i), 3));
/** Periods at the given cycle lengths starting 2026-01-01. */
function history(lengths: number[]) {
  const out: DayLog[] = [];
  let d = '2026-01-01';
  out.push(...period(d));
  for (const l of lengths) { d = addDays(d, l); out.push(...period(d)); }
  return { logs: out, last: d };
}
const S = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...p });

describe('irregular-cycle honesty', () => {
  it('leaves an unusual cycle out of averages and explains why', () => {
    const { logs, last } = history([28, 29, 27, 55, 28, 28]);
    const p = predict(logs, S(), addDays(last, 5));
    const odd = p.stats.cycles.find((c) => c.length === 55)!;
    expect(odd.excluded).toBe(true);
    expect(odd.reason).toBe('unusual');
    expect(p.stats.avgCycle).toBe(28);
    expect(p.notes.some((n) => n.includes('55-day cycle'))).toBe(true);
  });

  it('lets the user include or exclude a cycle', () => {
    const { logs, last } = history([28, 29, 27, 55, 28, 28]);
    const start = predict(logs, S(), last).stats.cycles.find((c) => c.length === 55)!.start;
    const inc = predict(logs, S({ cycleOverrides: { [start]: 'include' } }), addDays(last, 5));
    expect(inc.stats.cycles.find((c) => c.start === start)!.excluded).toBe(false);
    const ex = predict(logs, S({ cycleOverrides: { '2026-01-01': 'exclude' } }), addDays(last, 5));
    expect(ex.stats.cycles[0].excluded).toBe(true);
    expect(ex.stats.cycles[0].reason).toBe('manual');
  });

  it('accepts long cycles (no 60-day cap) and gives a wide, low-confidence range', () => {
    const { logs, last } = history([70, 65, 80]);
    const p = predict(logs, S(), addDays(last, 3));
    expect(p.stats.avgCycle).toBe(70);
    expect(p.confidence).toBe('low');
    const [a, b] = p.nextPeriodRange!;
    expect(new Date(b).getTime() - new Date(a).getTime()).toBeGreaterThan(8 * 86400000);
  });

  it('is high-confidence for six regular cycles, and late only after the window ends', () => {
    const { logs, last } = history([28, 28, 29, 28, 28, 28]);
    const p = predict(logs, S(), addDays(last, 10));
    expect(p.confidence).toBe('high');
    const end = p.nextPeriodRange![1];
    expect(predict(logs, S(), end).lateBy).toBeNull();
    const late = predict(logs, S(), addDays(end, 3));
    expect(late.lateBy).toBe(3);
    expect(late.lateDismissed).toBe(false);
    expect(predict(logs, S({ lateDismissedFor: late.nextPeriodStart }), addDays(end, 3)).lateDismissed).toBe(true);
  });
});

describe('cycle profile', () => {
  const { logs, last } = history([28, 29, 28, 28]);
  const today = addDays(last, 8);
  it('PCOS and perimenopause widen the range and cap confidence', () => {
    const plain = predict(logs, S(), today);
    const pcos = predict(logs, S({ profile: { conditions: ['pcos'] } }), today);
    const w = (p: typeof plain) => new Date(p.nextPeriodRange![1]).getTime() - new Date(p.nextPeriodRange![0]).getTime();
    expect(w(pcos)).toBeGreaterThan(w(plain));
    expect(pcos.confidence).toBe('low');
    expect(pcos.notes.join(' ')).toMatch(/PCOS/);
  });
  it('suppressing contraception hides the fertile window', () => {
    const p = predict(logs, S({ profile: { contraception: 'combined-pill' } }), today);
    expect(p.fertileHidden).toBe(true);
    expect(p.fertileWindow).toBeNull();
    expect(p.ovulationDate).toBeNull();
    expect(p.nextPeriodStart).not.toBeNull();
  });
  it('bleeds before stopping hormonal birth control are not counted', () => {
    const p = predict(logs, S({ profile: { stoppedHormonalOn: addDays(last, -20) } }), today);
    expect(p.stats.cycles.slice(0, -1).every((c) => c.excluded && c.reason === 'contraception')).toBe(true);
  });
  it('no uterus means no forecast', () => {
    const p = predict(logs, S({ profile: { conditions: ['no-uterus'] } }), today);
    expect(p.noForecast).toBe('no-uterus');
    expect(p.nextPeriodStart).toBeNull();
    expect(p.cycleDay).toBe(9);
  });
  it('forecast-off mode keeps the cycle day only', () => {
    const p = predict(logs, S({ forecastMode: 'off' }), today);
    expect(p.noForecast).toBe('user');
    expect(p.cycleDay).toBe(9);
    expect(p.fertileWindow).toBeNull();
  });
});

describe('life stages', () => {
  const { logs, last } = history([28, 28, 28]);
  it('paused stops the forecast', () => {
    expect(predict(logs, S({ stage: { kind: 'paused', since: last } }), addDays(last, 40)).noForecast).toBe('paused');
  });
  it('postpartum: no forecast until a period after six weeks, then a low-confidence forecast', () => {
    const birth = addDays(last, 280);
    const lochia = period(addDays(birth, 1), 20);
    const st = S({ stage: { kind: 'postpartum', since: birth, breastfeeding: true }, pregnancies: [{ lmp: last, end: birth, outcome: 'birth' }] });
    const early = predict([...logs, ...lochia], st, addDays(birth, 30));
    expect(early.noForecast).toBe('postpartum');
    expect(early.lateBy).toBeNull();
    const back = addDays(birth, 70);
    const p = predict([...logs, ...lochia, ...period(back)], st, addDays(back, 5));
    expect(p.noForecast).toBeNull();
    expect(p.confidence).toBe('low');
    expect(p.lastPeriodStart).toBe(back);
  });
  it('after a loss: no late warning until the next period', () => {
    const lossDay = addDays(last, 50);
    const st = S({ stage: { kind: 'loss', since: lossDay }, pregnancies: [{ lmp: last, end: lossDay, outcome: 'loss' }] });
    const before = predict(logs, st, addDays(lossDay, 40));
    expect(before.noForecast).toBe('loss');
    expect(before.lateBy).toBeNull();
    const next = addDays(lossDay, 35);
    const after = predict([...logs, ...period(next)], st, addDays(next, 3));
    expect(after.noForecast).toBeNull();
    expect(after.stats.cycles.find((c) => c.start === last)?.reason).toBe('pregnancy');
  });
});
