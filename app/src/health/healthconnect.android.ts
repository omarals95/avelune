import {
  SdkAvailabilityStatus, aggregateGroupByPeriod, getSdkStatus, initialize, openHealthConnectSettings, readRecords, requestPermission, type Permission,
} from 'react-native-health-connect';
import type { HealthDay } from '@avelune/core';
import { averageByDay, localDate, sleepWindow, type Provider } from './types';

/**
 * Health Connect is Android's shared health store. Samsung Health, Fitbit, Google Fit successors and most
 * wearables write into it, so one connection here covers those apps on Android.
 */
const READ: Permission[] = (['Steps', 'Distance', 'ActiveCaloriesBurned', 'SleepSession', 'RestingHeartRate', 'HeartRate', 'Weight', 'BasalBodyTemperature', 'BodyTemperature', 'OxygenSaturation', 'Hydration'] as const)
  .map((recordType) => ({ accessType: 'read', recordType }) as Permission);

let ready = false;
async function init() { if (!ready) ready = await initialize(); return ready; }

export const healthConnect: Provider = {
  id: 'healthConnect',
  available: async () => {
    const s = await getSdkStatus();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return { ok: true };
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return { ok: false, reason: 'Update Health Connect from the Play Store, then try again.' };
    return { ok: false, reason: 'Health Connect is not installed on this phone.' };
  },
  connect: async () => {
    if (!(await init())) return false;
    const granted = await requestPermission(READ);
    // Without this, Health Connect only returns the 30 days before permission was granted.
    await requestPermission([{ accessType: 'read', recordType: 'ReadHealthDataHistory' }]).catch(() => undefined);
    return granted.length > 0;
  },
  fetch: async (start, end) => {
    await init();
    const timeRangeFilter = { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };
    const days = new Map<string, HealthDay>();
    const day = (d: string) => days.get(d) ?? days.set(d, { date: d }).get(d)!;
    const safe = async <T,>(p: Promise<T>, fallback: T) => { try { return await p; } catch { return fallback; } };
    const slicer = { period: 'DAYS' as const, length: 1 };

    const [steps, dist, kcal] = await Promise.all([
      safe(aggregateGroupByPeriod({ recordType: 'Steps', timeRangeFilter, timeRangeSlicer: slicer }), []),
      safe(aggregateGroupByPeriod({ recordType: 'Distance', timeRangeFilter, timeRangeSlicer: slicer }), []),
      safe(aggregateGroupByPeriod({ recordType: 'ActiveCaloriesBurned', timeRangeFilter, timeRangeSlicer: slicer }), []),
    ]);
    for (const g of steps) if (g.result.COUNT_TOTAL) day(localDate(new Date(g.startTime))).steps = g.result.COUNT_TOTAL;
    for (const g of dist) if (g.result.DISTANCE) day(localDate(new Date(g.startTime))).distanceKm = Math.round(g.result.DISTANCE.inKilometers * 100) / 100;
    for (const g of kcal) if (g.result.ACTIVE_CALORIES_TOTAL) day(localDate(new Date(g.startTime))).activeKcal = Math.round(g.result.ACTIVE_CALORIES_TOTAL.inKilocalories);

    const opts = { timeRangeFilter, pageSize: 5000 };
    const [sleep, rhr, hr, weight, bbt, bodyT, spo2, water] = await Promise.all([
      safe(readRecords('SleepSession', opts), { records: [] }),
      safe(readRecords('RestingHeartRate', opts), { records: [] }),
      safe(readRecords('HeartRate', opts), { records: [] }),
      safe(readRecords('Weight', opts), { records: [] }),
      safe(readRecords('BasalBodyTemperature', opts), { records: [] }),
      safe(readRecords('BodyTemperature', opts), { records: [] }),
      safe(readRecords('OxygenSaturation', opts), { records: [] }),
      safe(readRecords('Hydration', opts), { records: [] }),
    ]);
    for (const s of sleep.records) {
      const w = sleepWindow(s.startTime, s.endTime);
      const d = day(w.date);
      d.sleepMin = (d.sleepMin ?? 0) + (w.end - w.start);
      d.sleepStart = Math.min(d.sleepStart ?? w.start, w.start);
      d.sleepEnd = Math.max(d.sleepEnd ?? w.end, w.end);
    }
    for (const [d, v] of averageByDay(rhr.records, (r) => r.time, (r) => r.beatsPerMinute)) day(d).restingHr = Math.round(v);
    const hrBy = new Map<string, number[]>();
    for (const r of hr.records) for (const smp of r.samples) { const d = localDate(new Date(smp.time)); (hrBy.get(d) ?? hrBy.set(d, []).get(d)!).push(smp.beatsPerMinute); }
    for (const [d, v] of hrBy) Object.assign(day(d), { hrMin: Math.min(...v), hrMax: Math.max(...v), hrAvg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) });
    for (const [d, v] of averageByDay(weight.records, (r) => r.time, (r) => r.weight.inKilograms)) day(d).weightKg = Math.round(v * 10) / 10;
    const temps = [...bbt.records.map((r) => ({ t: r.time, c: r.temperature.inCelsius })), ...bodyT.records.map((r) => ({ t: r.time, c: r.temperature.inCelsius }))];
    for (const [d, v] of averageByDay(temps, (r) => r.t, (r) => r.c)) day(d).temperatureC = Math.round(v * 100) / 100;
    for (const [d, v] of averageByDay(spo2.records, (r) => r.time, (r) => r.percentage)) day(d).spo2 = Math.round(v);
    const wBy = new Map<string, number>();
    for (const r of water.records) { const d = localDate(new Date(r.startTime)); wBy.set(d, (wBy.get(d) ?? 0) + r.volume.inMilliliters); }
    for (const [d, v] of wBy) day(d).waterMl = Math.round(v);
    return [...days.values()];
  },
};

export const openHealthConnect = () => openHealthConnectSettings();
