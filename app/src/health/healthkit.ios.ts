import AppleHealthKit, { type HealthInputOptions, type HealthKitPermissions, type HealthValue } from 'react-native-health';
import type { HealthDay } from '@avelune/core';
import { t } from '../i18n';
import { averageByDay, localDate, sleepWindow, type Provider } from './types';

const P = AppleHealthKit.Constants.Permissions;
const PERMS: HealthKitPermissions = {
  permissions: {
    read: [P.Steps, P.DistanceWalkingRunning, P.ActiveEnergyBurned, P.SleepAnalysis, P.RestingHeartRate, P.HeartRate, P.Weight, P.BodyTemperature, P.OxygenSaturation, P.Water],
    write: [],
  },
};

type Fn<T> = (o: HealthInputOptions, cb: (err: string, res: T) => void) => void;
const call = <T,>(fn: Fn<T>, o: HealthInputOptions) => new Promise<T>((res) => fn(o, (err, r) => res(err ? ([] as unknown as T) : r)));

const ASLEEP = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM']);

export const healthKit: Provider = {
  id: 'appleHealth',
  available: () => new Promise((res) => AppleHealthKit.isAvailable((_e, ok) => res(ok ? { ok: true } : { ok: false, reason: t('Health data is not available on this device.') }))),
  connect: () => new Promise((res) => AppleHealthKit.initHealthKit(PERMS, (err) => res(!err))),
  fetch: async (start, end) => {
    const o: HealthInputOptions = { startDate: start.toISOString(), endDate: end.toISOString(), includeManuallyAdded: true };
    const [steps, dist, kcal, sleep, rhr, hr, weight, temp, spo2, water] = await Promise.all([
      call<HealthValue[]>(AppleHealthKit.getDailyStepCountSamples, o),
      call<HealthValue[]>(AppleHealthKit.getDailyDistanceWalkingRunningSamples, { ...o, unit: AppleHealthKit.Constants.Units.meter }),
      call<HealthValue[]>(AppleHealthKit.getActiveEnergyBurned, o),
      call<HealthValue[]>(AppleHealthKit.getSleepSamples, { ...o, limit: 2000 }),
      call<HealthValue[]>(AppleHealthKit.getRestingHeartRateSamples, o),
      call<HealthValue[]>(AppleHealthKit.getHeartRateSamples, { ...o, limit: 5000 }),
      call<HealthValue[]>(AppleHealthKit.getWeightSamples, { ...o, unit: AppleHealthKit.Constants.Units.gram }),
      call<HealthValue[]>(AppleHealthKit.getBodyTemperatureSamples, { ...o, unit: AppleHealthKit.Constants.Units.celsius }),
      call<HealthValue[]>(AppleHealthKit.getOxygenSaturationSamples, o),
      call<HealthValue[]>(AppleHealthKit.getWaterSamples, o), // litres by default
    ]);
    const days = new Map<string, HealthDay>();
    const day = (d: string) => days.get(d) ?? days.set(d, { date: d }).get(d)!;
    const sumBy = (rows: HealthValue[], set: (d: HealthDay, v: number) => void, scale = 1) => {
      const m = new Map<string, number>();
      for (const r of rows) { const d = localDate(new Date(r.startDate)); m.set(d, (m.get(d) ?? 0) + Number(r.value) * scale); }
      for (const [d, v] of m) set(day(d), v);
    };
    sumBy(steps, (d, v) => (d.steps = Math.round(v)));
    sumBy(dist, (d, v) => (d.distanceKm = Math.round(v / 10) / 100));
    sumBy(kcal, (d, v) => (d.activeKcal = Math.round(v)));
    sumBy(water, (d, v) => (d.waterMl = Math.round(v * 1000)));
    for (const s of sleep) {
      if (!ASLEEP.has(String(s.value))) continue;
      const w = sleepWindow(s.startDate, s.endDate);
      const d = day(w.date);
      d.sleepMin = (d.sleepMin ?? 0) + (w.end - w.start);
      d.sleepStart = Math.min(d.sleepStart ?? w.start, w.start);
      d.sleepEnd = Math.max(d.sleepEnd ?? w.end, w.end);
    }
    for (const [d, v] of averageByDay(rhr, (r) => r.startDate, (r) => Number(r.value))) day(d).restingHr = Math.round(v);
    const hrBy = new Map<string, number[]>();
    for (const r of hr) { const d = localDate(new Date(r.startDate)); (hrBy.get(d) ?? hrBy.set(d, []).get(d)!).push(Number(r.value)); }
    for (const [d, v] of hrBy) Object.assign(day(d), { hrMin: Math.min(...v), hrMax: Math.max(...v), hrAvg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) });
    for (const [d, v] of averageByDay(weight, (r) => r.startDate, (r) => Number(r.value) / 1000)) day(d).weightKg = Math.round(v * 10) / 10;
    for (const [d, v] of averageByDay(temp, (r) => r.startDate, (r) => Number(r.value))) day(d).temperatureC = Math.round(v * 100) / 100;
    for (const [d, v] of averageByDay(spo2, (r) => r.startDate, (r) => Number(r.value) * (Number(r.value) <= 1 ? 100 : 1))) day(d).spo2 = Math.round(v);
    return [...days.values()];
  },
};
