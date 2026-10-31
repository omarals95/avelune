import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_SETTINGS, SETTINGS_ID, dayId, shouldApply,
  type DateStr, type DayLog, type Settings, type SyncRecord, type SyncResponse,
} from '@cyclo/core';

export interface ServerConn {
  url: string;
  token: string;
  email: string;
  cursor: number;
  lastSync: number | null;
}

interface State {
  records: Record<string, SyncRecord>;
  /** Record ids with local edits not yet acknowledged by the server. */
  dirty: Record<string, true>;
  onboarded: boolean;
  unit: 'C' | 'F';
  server: ServerConn | null;
  syncing: boolean;
  syncError: string | null;
  saveDay: (log: DayLog) => void;
  saveSettings: (s: Settings) => void;
  completeOnboarding: (lastPeriod: DateStr, s: Settings) => void;
  setUnit: (u: 'C' | 'F') => void;
  connect: (url: string, email: string, password: string, mode: 'login' | 'register') => Promise<void>;
  disconnect: () => Promise<void>;
  sync: () => Promise<void>;
  wipe: (deleteRemote: boolean) => Promise<void>;
}

export const isEmptyLog = (l: DayLog) =>
  l.flow === 0 && !l.symptoms.length && !l.moods.length && !l.tags.length && !l.notes?.trim() && l.bbt == null;

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, '');

async function api<T>(base: string, path: string, init: { method?: string; token?: string; body?: unknown }): Promise<T> {
  const res = await fetch(base + path, {
    method: init.method ?? 'POST',
    headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `http_${res.status}`);
  return json as T;
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const put = (r: SyncRecord) => {
        set((s) => ({ records: { ...s.records, [r.id]: r }, dirty: { ...s.dirty, [r.id]: true } }));
        // Debounced background sync after edits.
        if (get().server) {
          clearTimeout(syncTimer);
          syncTimer = setTimeout(() => void get().sync(), 1500);
        }
      };
      return {
        records: {}, dirty: {}, onboarded: false, unit: 'C', server: null, syncing: false, syncError: null,

        saveDay: (log) => {
          const deleted = isEmptyLog(log);
          put({ id: dayId(log.date), data: deleted ? null : log, updatedAt: Date.now(), deleted });
        },
        saveSettings: (s) => put({ id: SETTINGS_ID, data: s, updatedAt: Date.now(), deleted: false }),

        completeOnboarding: (lastPeriod, s) => {
          const now = Date.now();
          const recs: SyncRecord[] = [{ id: SETTINGS_ID, data: s, updatedAt: now, deleted: false }];
          for (let i = 0; i < s.periodLength; i++) {
            const d = new Date(lastPeriod + 'T00:00:00');
            d.setDate(d.getDate() + i);
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const log: DayLog = { date, flow: 3, symptoms: [], moods: [], tags: [] };
            recs.push({ id: dayId(date), data: log, updatedAt: now, deleted: false });
          }
          set((st) => {
            const records = { ...st.records };
            const dirty = { ...st.dirty };
            for (const r of recs) { records[r.id] = r; dirty[r.id] = true; }
            return { records, dirty, onboarded: true };
          });
        },

        setUnit: (unit) => set({ unit }),

        connect: async (url, email, password, mode) => {
          const base = normalizeUrl(url);
          const { token } = await api<{ token: string }>(base, `/api/auth/${mode}`, { body: { email, password } });
          // Everything already on this device is uploaded on the first sync.
          set((s) => ({
            server: { url: base, token, email, cursor: 0, lastSync: null },
            dirty: Object.fromEntries(Object.keys(s.records).map((id) => [id, true as const])),
          }));
          await get().sync();
          // A fresh device that pulled existing data skips onboarding.
          if (Object.keys(get().records).length) set({ onboarded: true });
        },

        disconnect: async () => {
          const srv = get().server;
          if (srv) await api(srv.url, '/api/auth/logout', { token: srv.token }).catch(() => undefined);
          set({ server: null, syncError: null });
        },

        sync: async () => {
          const { server, records, dirty, syncing } = get();
          if (!server || syncing) return;
          set({ syncing: true, syncError: null });
          try {
            const sent = Object.keys(dirty).map((id) => records[id]).filter(Boolean);
            const res = await api<SyncResponse>(server.url, '/api/sync', {
              token: server.token,
              body: { since: server.cursor, changes: sent },
            });
            set((s) => {
              const next = { ...s.records };
              const nd = { ...s.dirty };
              for (const r of res.records) if (shouldApply(next[r.id], r)) next[r.id] = r;
              for (const r of sent) if (next[r.id]?.updatedAt === r.updatedAt) delete nd[r.id];
              return {
                records: next, dirty: nd, syncing: false,
                server: s.server && { ...s.server, cursor: res.cursor, lastSync: Date.now() },
              };
            });
          } catch (e) {
            const msg = (e as Error).message;
            set({ syncing: false, syncError: msg });
            if (msg === 'unauthorized') set({ server: null });
          }
        },

        wipe: async (deleteRemote) => {
          const srv = get().server;
          if (srv && deleteRemote) await api(srv.url, '/api/account', { method: 'DELETE', token: srv.token });
          set({ records: {}, dirty: {}, onboarded: false, server: deleteRemote ? null : srv, syncError: null });
        },
      };
    },
    {
      name: 'cyclo-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ records: s.records, dirty: s.dirty, onboarded: s.onboarded, unit: s.unit, server: s.server }),
    },
  ),
);

export function selectLogs(records: Record<string, SyncRecord>): DayLog[] {
  return Object.values(records).filter((r) => r.id.startsWith('day:') && !r.deleted && r.data).map((r) => r.data as DayLog);
}
export function selectSettings(records: Record<string, SyncRecord>): Settings {
  const r = records[SETTINGS_ID];
  return r && !r.deleted && r.data ? { ...DEFAULT_SETTINGS, ...(r.data as Settings) } : DEFAULT_SETTINGS;
}
