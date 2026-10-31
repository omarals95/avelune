import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, addDays, buildSnapshot, decodeInvite, encodeInvite, newShareKey, openSnapshot, pregnancyStatus, sealSnapshot, snapshotKind, lmpFromDueDate, cycleDayOf, type DayLog } from '../src';

const logs: DayLog[] = [0, 1, 2, 3, 4].map((i) => ({ date: addDays('2026-10-01', i), flow: 3, symptoms: ['cramps'], moods: ['calm'], tags: ['sex:protected'] }));

describe('partner snapshot', () => {
  it('encodes the calendar window and predictions', () => {
    const s = buildSnapshot(logs, DEFAULT_SETTINGS, '2026-10-10', { name: 'Omar' });
    expect(s.cycleDay).toBe(10);
    expect(snapshotKind(s, '2026-10-02')).toBe('period');
    expect(snapshotKind(s, '2026-10-15')).toBe('ovulation');
    expect(snapshotKind(s, '2026-10-12')).toBe('fertile');
    expect(snapshotKind(s, '2026-10-30')).toBe('predicted-period');
    expect(snapshotKind(s, '2027-05-01')).toBe('none');
    expect(s.todayMoods).toBeUndefined(); // log details only when opted in
    expect(JSON.stringify(s)).not.toContain('sex:');
  });
  it('hides the fertile window when the owner turned it off', () => {
    const s = buildSnapshot(logs, { ...DEFAULT_SETTINGS, showFertileWindow: false }, '2026-10-10');
    expect(snapshotKind(s, '2026-10-12')).toBe('none');
    expect(s.fertileWindow).toBeNull();
  });
  it('encrypts, decrypts, and rejects the wrong key or id', () => {
    const k = newShareKey();
    const s = buildSnapshot(logs, DEFAULT_SETTINGS, '2026-10-10', { includeLog: true });
    const blob = sealSnapshot(k, s);
    expect(blob).not.toContain('cramps');
    expect(openSnapshot(k, blob)).toEqual(s);
    expect(() => openSnapshot(newShareKey(), blob)).toThrow();
    expect(() => openSnapshot({ ...k, id: newShareKey().id }, blob)).toThrow();
  });
  it('invite codes round-trip and reject garbage', () => {
    const k = newShareKey();
    const inv = { url: 'https://cyclo.example.com', ...k };
    expect(decodeInvite(encodeInvite(inv))).toEqual(inv);
    expect(decodeInvite(`  ${encodeInvite(inv)}\n`)).toEqual(inv);
    expect(() => decodeInvite('avelune-partner:abc')).toThrow();
    expect(encodeInvite(inv).startsWith('avelune-partner:')).toBe(true);
    expect(decodeInvite(encodeInvite(inv).replace('avelune-partner:', 'cyclo-partner:'))).toEqual(inv); // pre-rebrand codes
    expect(() => decodeInvite('hello')).toThrow();
  });
});

describe('pregnancy + cycle day', () => {
  it('computes gestational week and due date', () => {
    const p = pregnancyStatus('2026-10-01', '2026-10-31');
    expect(p).toMatchObject({ week: 4, day: 2, dueDate: '2027-07-08', trimester: 1 });
    expect(lmpFromDueDate('2027-07-08')).toBe('2026-10-01');
  });
  it('cycle day for any date', () => {
    expect(cycleDayOf('2026-10-31', logs)).toBe(31);
    expect(cycleDayOf('2026-09-01', logs)).toBeNull();
  });
});
