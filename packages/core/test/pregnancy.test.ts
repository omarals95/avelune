import { describe, expect, it } from 'vitest';
import { addDays, lmpFromDueDate, pregnancyStage, pregnancyStatus, pregnancyView, PREGNANCY_STAGE_WEEKS } from '../src';

const LMP = '2026-01-05';
/** Date at `w` completed weeks + `d` days after the LMP. */
const at = (w: number, d = 0) => addDays(LMP, w * 7 + d);
const img = (w: number, d = 0) => `emb-0${pregnancyView(LMP, at(w, d))!.stage}`;

describe('pregnancy stage ↔ illustration mapping (real dates, completed weeks)', () => {
  const cases: [number, string][] = [
    [0, 'emb-01'], [4, 'emb-01'], [5, 'emb-02'], [8, 'emb-02'], [9, 'emb-03'], [13, 'emb-03'], [14, 'emb-04'], [17, 'emb-04'],
    [18, 'emb-05'], [22, 'emb-05'], [23, 'emb-06'], [27, 'emb-06'], [28, 'emb-07'], [31, 'emb-07'], [32, 'emb-08'], [35, 'emb-08'],
    [36, 'emb-09'], [40, 'emb-09'], [42, 'emb-09'],
  ];
  it.each(cases)('week %i → %s, on the first and last day of the week', (w, expected) => {
    expect(img(w, 0)).toBe(expected);
    expect(img(w, 6)).toBe(expected);
  });
  it('switches exactly when a week completes (no off-by-one)', () => {
    expect(img(4, 6)).toBe('emb-01');
    expect(img(5, 0)).toBe('emb-02');
    expect(img(35, 6)).toBe('emb-08');
    expect(img(36, 0)).toBe('emb-09');
  });
  it('keeps emb-09 after week 42 and flags post-term separately', () => {
    const v = pregnancyView(LMP, at(43, 2))!;
    expect(v.stage).toBe(9);
    expect(v.postTerm).toBe(true);
    expect(pregnancyView(LMP, at(39))!.postTerm).toBe(false);
  });
  it('covers every completed week 0–42 exactly once', () => {
    const seen = new Map<number, number>();
    for (const [stage, [lo, hi]] of Object.entries(PREGNANCY_STAGE_WEEKS)) for (let w = lo; w <= hi; w++) seen.set(w, (seen.get(w) ?? 0) + 1) && expect(pregnancyStage(w)).toBe(+stage);
    expect([...seen.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 43 }, (_, i) => i));
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });
});

describe('caption (same source as the image)', () => {
  it('formats week, month and trimester', () => {
    expect(pregnancyView(LMP, at(12, 3))!.caption).toBe('Week 12 · Month 3 · First trimester');
    expect(pregnancyView(LMP, at(24))!.caption).toBe('Week 24 · Month 6 · Second trimester');
  });
  it('trimester boundaries: 13w6d first, 14w0d second, 27w6d second, 28w0d third', () => {
    expect(pregnancyView(LMP, at(13, 6))!.caption).toMatch(/First trimester$/);
    expect(pregnancyView(LMP, at(14, 0))!.caption).toMatch(/Second trimester$/);
    expect(pregnancyView(LMP, at(27, 6))!.caption).toMatch(/Second trimester$/);
    expect(pregnancyView(LMP, at(28, 0))!.caption).toMatch(/Third trimester$/);
  });
  it('month in the caption always equals the stage of the image', () => {
    for (let d = 0; d <= 300; d++) {
      const v = pregnancyView(LMP, addDays(LMP, d))!;
      expect(v.caption).toContain(`Month ${v.stage} ·`);
    }
  });
});

describe('dating', () => {
  it('due-date entry gives the same stage as the equivalent LMP', () => {
    const due = '2026-10-12';
    const lmp = lmpFromDueDate(due);
    expect(lmp).toBe(LMP);
    expect(pregnancyView(lmp, '2026-04-01')!.stage).toBe(pregnancyView(LMP, '2026-04-01')!.stage);
  });
  it('returns null (setup state) without valid dating', () => {
    expect(pregnancyView(null, '2026-04-01')).toBeNull();
    expect(pregnancyView('', '2026-04-01')).toBeNull();
    expect(pregnancyView('not-a-date', '2026-04-01')).toBeNull();
  });
  it('uses local calendar days across a daylight-saving change', () => {
    // US spring-forward on 8 Mar 2026: a 23-hour day must still count as one day.
    const prev = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      expect(pregnancyStatus('2026-03-01', '2026-03-15')).toMatchObject({ week: 2, day: 0 });
      expect(pregnancyStatus('2026-02-15', '2026-03-22').week).toBe(5);
      expect(pregnancyView('2026-02-15', '2026-03-22')!.stage).toBe(2);
    } finally { process.env.TZ = prev; }
  });
});
