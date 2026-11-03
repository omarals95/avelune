import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { AppleHealthReader, importDripCsv, importJsonAny, importText, importZip, isDripCsv, type ImportOptions } from '../src';

const KNOWN: Record<string, string> = {
  cramps: 'cramps', headache: 'headache', bloating: 'bloating', happy: 'happy', sad: 'sad', anxious: 'anxious', tired: 'fatigue', fatigue: 'fatigue',
  'tender breasts': 'tender-breasts', acne: 'acne', 'egg white': 'discharge:egg-white', yoga: 'activity:yoga',
};
const MOODS = new Set(['happy', 'sad', 'anxious']);
const opts: ImportOptions = { resolve: (l) => KNOWN[l.toLowerCase()] ?? null, classify: (id) => (MOODS.has(id) ? 'moods' : 'symptoms') };

describe('drip. CSV', () => {
  const csv = [
    'date,temperature.value,temperature.exclude,temperature.time,temperature.note,bleeding.value,bleeding.exclude,mucus.feeling,mucus.texture,mucus.value,mucus.exclude,note.value,desire.value,sex.solo,sex.partner,sex.condom,pain.cramps,pain.headache,mood.happy,mood.anxious',
    '2026-10-01,36.45,false,07:00,,2,false,,,,,"first day, heavy-ish",,,,,true,,,true',
    '2026-10-02,36.4,false,,,0,false,,,,,,,,true,true,,true,true,',
    '2026-10-14,36.7,false,,,,,3,2,4,false,,2,,,,,,,',
  ].join('\n');
  it('is detected and mapped', () => {
    expect(isDripCsv(csv)).toBe(true);
    const r = importDripCsv(csv, opts);
    expect(r.source).toBe('drip.');
    const d1 = r.logs.find((l) => l.date === '2026-10-01')!;
    expect(d1.flow).toBe(3);
    expect(d1.bbt).toBe(36.45);
    expect(d1.symptoms).toContain('cramps');
    expect(d1.moods).toContain('anxious');
    expect(d1.notes).toContain('first day');
    const d2 = r.logs.find((l) => l.date === '2026-10-02')!;
    expect(d2.flow).toBe(1);
    expect(d2.tags).toContain('sex:protected');
    expect(d2.moods).toContain('happy');
    const d14 = r.logs.find((l) => l.date === '2026-10-14')!;
    expect(d14.tags).toEqual(expect.arrayContaining(['discharge:egg-white', 'sex:high']));
  });
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_GB">
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-10-01 08:00:00 +0100" endDate="2026-10-01 08:10:00 +0100" value="120"/>
 <Record type="HKCategoryTypeIdentifierMenstrualFlow" sourceName="Health" startDate="2026-10-01 00:00:00 +0100" endDate="2026-10-01 00:00:00 +0100" value="HKCategoryValueVaginalBleedingHeavy">
  <MetadataEntry key="HKMenstrualCycleStart" value="1"/>
 </Record>
 <Record type="HKCategoryTypeIdentifierMenstrualFlow" sourceName="Health" startDate="2026-10-02 00:00:00 +0100" endDate="2026-10-02 00:00:00 +0100" value="HKCategoryValueMenstrualFlowLight"/>
 <Record type="HKCategoryTypeIdentifierIntermenstrualBleeding" sourceName="Health" startDate="2026-10-12 00:00:00 +0100" endDate="2026-10-12 00:00:00 +0100" value="HKCategoryValueNotApplicable"/>
 <Record type="HKQuantityTypeIdentifierBasalBodyTemperature" sourceName="Health" unit="degF" startDate="2026-10-03 06:30:00 +0100" endDate="2026-10-03 06:30:00 +0100" value="97.7"/>
 <Record type="HKCategoryTypeIdentifierOvulationTestResult" sourceName="Health" startDate="2026-10-13 09:00:00 +0100" endDate="2026-10-13 09:00:00 +0100" value="HKCategoryValueOvulationTestResultLuteinizingHormoneSurge"/>
 <Record type="HKCategoryTypeIdentifierSexualActivity" sourceName="Health" startDate="2026-10-13 22:00:00 +0100" endDate="2026-10-13 22:00:00 +0100" value="HKCategoryValueNotApplicable">
  <MetadataEntry key="HKSexualActivityProtectionUsed" value="0"/>
 </Record>
 <Record type="HKCategoryTypeIdentifierAbdominalCramps" sourceName="Health" startDate="2026-10-01 09:00:00 +0100" endDate="2026-10-01 09:00:00 +0100" value="HKCategoryValueSeverityModerate"/>
 <Record type="HKCategoryTypeIdentifierHeadache" sourceName="Health" startDate="2026-10-05 09:00:00 +0100" endDate="2026-10-05 09:00:00 +0100" value="HKCategoryValueSeverityNotPresent"/>
</HealthData>`;

describe('Apple Health', () => {
  it('parses cycle records even when split across chunks', () => {
    const r = new AppleHealthReader(opts);
    for (let i = 0; i < xml.length; i += 37) r.push(xml.slice(i, i + 37));
    const res = r.finish();
    expect(res.source).toBe('Apple Health');
    const by = Object.fromEntries(res.logs.map((l) => [l.date, l]));
    expect(by['2026-10-01'].flow).toBe(4);
    expect(by['2026-10-01'].symptoms).toEqual(['cramps']);
    expect(by['2026-10-02'].flow).toBe(2);
    expect(by['2026-10-12'].flow).toBe(1);
    expect(by['2026-10-03'].bbt).toBeCloseTo(36.5, 1);
    expect(by['2026-10-13'].tags).toEqual(expect.arrayContaining(['tests:ovu-pos', 'sex:unprotected']));
    expect(by['2026-10-05']).toBeUndefined();
    expect(res.periodDays).toBe(2);
  });
  it('streams export.xml out of export.zip', async () => {
    const zip = zipSync({ 'apple_health_export/export.xml': strToU8(xml), 'apple_health_export/export_cda.xml': strToU8('<x/>') });
    let last = 0;
    const res = await importZip(zip.length, async (o, l) => zip.slice(o, o + l), opts, (p) => { last = p; });
    expect(last).toBe(1);
    expect(res.logs.find((l) => l.date === '2026-10-01')?.flow).toBe(4);
  });
});

describe('JSON exports read by shape', () => {
  it('Clue-style list of measurements', () => {
    const data = [
      { date: '2026-09-03', type: 'period', value: { option: 'heavy' } },
      { date: '2026-09-04', type: 'period', value: { option: 'light' } },
      { date: '2026-09-03', type: 'pain', value: [{ option: 'cramps' }] },
      { date: '2026-09-05', type: 'feelings', value: { option: 'happy' } },
    ];
    const r = importJsonAny(data, opts, 'measurements.json');
    const by = Object.fromEntries(r.logs.map((l) => [l.date, l]));
    expect(by['2026-09-03'].flow).toBe(4);
    expect(by['2026-09-04'].flow).toBe(2);
    expect(by['2026-09-05'].moods).toContain('happy');
  });
  it('old Clue backup ({ data: [{ day, period, pain: [...] }] })', () => {
    const r = importJsonAny({ data: [{ day: '2019-01-01T00:00:00Z', period: 'medium', pain: ['cramps', 'headache'], emotion: ['sad'] }] }, opts, 'ClueBackup.cluedata');
    expect(r.source).toBe('Clue');
    expect(r.logs[0]).toMatchObject({ date: '2019-01-01', flow: 3 });
    expect(r.logs[0].symptoms).toEqual(['cramps', 'headache']);
    expect(r.logs[0].moods).toEqual(['sad']);
  });
  it('Flo-style cycles with period start/end and point events', () => {
    const r = importJsonAny({
      operationalData: {
        cycles: [{ period_start_date: '2026-08-01', period_end_date: '2026-08-05', id: 'x' }, { period_start_date: '2026-08-29', period_end_date: '2026-09-02' }],
        point_events_manual_v2: [{ date: '2026-08-02T10:00:00', category: 'Symptom', subcategory: 'Bloating' }, { date: '2026-08-03', category: 'Mood', subcategory: 'Happy' }],
      },
    }, opts, 'flo-export.json');
    expect(r.source).toBe('Flo');
    expect(r.periodDays).toBe(10);
    const by = Object.fromEntries(r.logs.map((l) => [l.date, l]));
    expect(by['2026-08-02'].symptoms).toContain('bloating');
    expect(by['2026-08-03'].moods).toContain('happy');
  });
  it('Avelune JSON export round-trips', () => {
    const r = importText('avelune-export.json', JSON.stringify({ version: 2, records: [{ id: 'day:2026-10-01', data: { date: '2026-10-01', flow: 3, symptoms: ['cramps'], moods: [], tags: [] }, updatedAt: 1, deleted: false }, { id: 'settings', data: { cycleLength: 28 }, updatedAt: 1, deleted: false }] }), opts);
    expect(r.source).toBe('Avelune export');
    expect(r.logs).toHaveLength(1);
  });
});

describe('zip with CSVs (e.g. Natural Cycles)', () => {
  it('imports the daily-entries CSV with LH and mucus columns', async () => {
    const csv = 'Date,Temperature,Menstruation,LH Test,Cervical Mucus,Sex\n2026-10-01,36.42,MENSTRUATION,,,\n2026-10-02,36.40,SPOTTING,,,\n2026-10-14,36.65,,POSITIVE,egg white,PROTECTED\n';
    const zip = zipSync({ 'nc_export/daily_entries.csv': strToU8(csv), 'nc_export/account.csv': strToU8('Email,Country\nx@y.z,SE\n') });
    const r = await importZip(zip.length, async (o, l) => zip.slice(o, o + l), opts);
    expect(r.source).toBe('Natural Cycles');
    const by = Object.fromEntries(r.logs.map((l) => [l.date, l]));
    expect(by['2026-10-01'].flow).toBe(3);
    expect(by['2026-10-02'].flow).toBe(1);
    expect(by['2026-10-14'].tags).toEqual(expect.arrayContaining(['tests:ovu-pos', 'discharge:egg-white', 'sex:protected']));
  });
});
