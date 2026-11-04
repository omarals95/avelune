import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dropSource, mergeHealthDays, sampleHealth, today, type DateStr, type DayLog, type HealthDay, type HealthSource } from '@cyclo/core';
import { makeFitbit } from './fitbit';
import { makeOura } from './oura';
import { healthConnect } from './healthconnect';
import { healthKit } from './healthkit';
import type { Provider, ProviderId } from './types';

export type WidgetId =
  | 'cycleStats' | 'nextPeriod' | 'steps' | 'sleep' | 'heart' | 'weight' | 'temperature' | 'water' | 'activity' | 'mood' | 'symptoms' | 'oxygen';

export const DEFAULT_WIDGETS: WidgetId[] = ['cycleStats', 'steps', 'sleep', 'heart', 'water', 'temperature', 'weight'];

interface Connection { since: number; lastSync: number | null; error: string | null }

interface HealthState {
  days: Record<DateStr, HealthDay>;
  connections: Partial<Record<ProviderId, Connection>>;
  sample: boolean;
  fitbitClientId: string;
  ouraClientId: string;
  setOuraClientId: (id: string) => void;
  widgets: WidgetId[];
  syncing: boolean;
  connect: (id: ProviderId) => Promise<{ ok: boolean; reason?: string; days?: number }>;
  disconnect: (id: ProviderId) => Promise<void>;
  sync: (full?: boolean) => Promise<void>;
  setSample: (on: boolean) => void;
  setFitbitClientId: (id: string) => void;
  setWidgets: (w: WidgetId[]) => void;
  /** Health values from an imported file (steps, resting HR) count as manual entries unless a source is given. */
  importManual: (days: HealthDay[], source?: HealthSource) => void;
}

const fitbit = makeFitbit(() => useHealth.getState().fitbitClientId.trim());
const oura = makeOura(() => useHealth.getState().ouraClientId.trim());
export const PROVIDERS: Record<ProviderId, Provider> = { appleHealth: healthKit, healthConnect, fitbit, oura };

const daysAgo = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

export const useHealth = create<HealthState>()(
  persist(
    (set, get) => ({
      days: {}, connections: {}, sample: false, fitbitClientId: '', ouraClientId: '', widgets: DEFAULT_WIDGETS, syncing: false,
      setOuraClientId: (ouraClientId) => set({ ouraClientId }),

      connect: async (id) => {
        const p = PROVIDERS[id];
        const av = await p.available().catch((e: Error) => ({ ok: false, reason: e.message }));
        if (!av.ok) return av;
        let ok = false;
        try { ok = await p.connect(); } catch (e) { return { ok: false, reason: (e as Error).message }; }
        if (!ok) return { ok: false, reason: 'Permission was not granted.' };
        set((s) => ({ connections: { ...s.connections, [id]: { since: Date.now(), lastSync: null, error: null } } }));
        await get().sync(true);
        const days = Object.values(get().days).filter((d) => Object.values(d.sources ?? {}).includes(id)).length;
        const error = get().connections[id]?.error;
        return error ? { ok: false, reason: `Connected, but reading data failed: ${error}` } : { ok: true, days };
      },

      disconnect: async (id) => {
        await PROVIDERS[id].disconnect?.().catch(() => undefined);
        set((s) => {
          const connections = { ...s.connections };
          delete connections[id];
          return { connections, days: dropSource(s.days, id) };
        });
      },

      sync: async (full = false) => {
        if (get().syncing) return;
        set({ syncing: true });
        const end = new Date();
        for (const id of Object.keys(get().connections) as ProviderId[]) {
          const c = get().connections[id]!;
          const start = daysAgo(full || !c.lastSync ? 120 : 14);
          try {
            const rows = await PROVIDERS[id].fetch(start, end);
            set((s) => ({ days: mergeHealthDays(s.days, rows, id), connections: { ...s.connections, [id]: { ...c, lastSync: Date.now(), error: null } } }));
          } catch (e) {
            set((s) => ({ connections: { ...s.connections, [id]: { ...c, error: (e as Error).message } } }));
          }
        }
        set({ syncing: false });
      },

      setSample: (on) => set((s) => ({ sample: on, days: on ? mergeHealthDays(dropSource(s.days, 'sample'), sampleHealth(today()), 'sample') : dropSource(s.days, 'sample') })),
      setFitbitClientId: (fitbitClientId) => set({ fitbitClientId }),
      setWidgets: (widgets) => set({ widgets }),
      importManual: (rows, source = 'manual') => set((s) => ({ days: mergeHealthDays(s.days, rows, source) })),
    }),
    {
      name: 'avelune-health-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ days: s.days, connections: s.connections, sample: s.sample, fitbitClientId: s.fitbitClientId, ouraClientId: s.ouraClientId, widgets: s.widgets }),
    },
  ),
);

/** What you log in Avelune (water, weight, BBT, sleep, distance) counts as health data too, and wins over trackers. */
export function withManual(days: Record<DateStr, HealthDay>, logs: DayLog[]): Record<DateStr, HealthDay> {
  const manual: HealthDay[] = logs.map((l) => ({
    date: l.date,
    waterMl: l.water || undefined, weightKg: l.weight, temperatureC: l.bbt,
    sleepMin: l.sleep != null ? Math.round(l.sleep * 60) : undefined, distanceKm: l.distance,
  }));
  return mergeHealthDays(days, manual, 'manual');
}

export const PROVIDER_INFO: Record<ProviderId, { name: string; detail: string; icon: 'apple' | 'android' | 'watch-variant' | 'ring' }> = {
  oura: { name: 'Oura ring', detail: 'Sign in to Oura directly: sleep, resting heart rate, HRV, temperature deviation, SpO₂ and activity.', icon: 'ring' },
  appleHealth: { name: 'Apple Health', detail: 'iPhone and Apple Watch: steps, sleep, heart, weight, temperature, water.', icon: 'apple' },
  healthConnect: { name: 'Health Connect', detail: 'Android: also brings in Samsung Health, Fitbit, Google and most wearables that sync to Health Connect.', icon: 'android' },
  fitbit: { name: 'Fitbit account', detail: 'Sign in to Fitbit directly (any platform, including web).', icon: 'watch-variant' },
};
