import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_REMINDERS, DEFAULT_SETTINGS, MIN_PASSPHRASE, SETTINGS_ID, buildSnapshot, createKeyInfo, dayId, decodeInvite, decryptRecord,
  encryptRecord, mergeLogs, newShareKey, normalizeReminders, openSnapshot, sealSnapshot, shouldApply, today as todayFn, unlockKeys,
  type DateStr, type DayLog, type Invite, type KeyInfo, type PartnerSnapshot, type ReminderPrefs, type Settings, type SyncRecord, type SyncResponse,
} from '@cyclo/core';
import { clearKeys, loadKeys, saveKeys } from './keyring';

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
  reminders: ReminderPrefs;
  setReminders: (r: Partial<ReminderPrefs>) => void;
  /** Local display preferences (not synced). */
  name: string;
  hideSex: boolean;
  weightUnit: 'kg' | 'lb';
  setPrefs: (p: Partial<Pick<State, 'name' | 'hideSex' | 'weightUnit' | 'unit'>>) => void;
  /** Import many day logs at once (CSV). Returns how many days changed. */
  importLogs: (logs: DayLog[], overwrite: boolean) => number;
  /** Toggle period days in bulk (calendar "Edit period dates"). */
  setPeriodDays: (on: DateStr[], off: DateStr[]) => void;
  /** Owner side of partner sharing. */
  share: { id: string; key: string; includeLog: boolean; publishedAt: number | null; error: string | null } | null;
  startShare: () => Promise<void>;
  stopShare: () => Promise<void>;
  publishShare: () => Promise<void>;
  setShareIncludeLog: (v: boolean) => void;
  /** Partner side: this device only views someone else's shared cycle. */
  partner: { invite: Invite; snapshot: PartnerSnapshot | null; fetchedAt: number | null; error: string | null } | null;
  joinAsPartner: (code: string) => Promise<void>;
  refreshPartner: () => Promise<void>;
  leavePartner: () => void;
  saveDay: (log: DayLog) => void;
  saveSettings: (s: Settings) => void;
  completeOnboarding: (lastPeriod: DateStr, s: Settings) => void;
  setUnit: (u: 'C' | 'F') => void;
  connect: (url: string, email: string, password: string, passphrase: string, mode: 'login' | 'register') => Promise<void>;
  /** Re-derive the encryption key on this device (e.g. after the keychain was cleared). */
  unlock: (passphrase: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sync: () => Promise<void>;
  wipe: (deleteRemote: boolean) => Promise<void>;
}

export const isEmptyLog = (l: DayLog) =>
  l.flow === 0 && !l.symptoms.length && !l.moods.length && !l.tags.length && !l.notes?.trim() &&
  l.bbt == null && l.weight == null && !l.water && l.sleep == null && l.distance == null;

export const emptyLog = (date: DateStr): DayLog => ({ date, flow: 0, symptoms: [], moods: [], tags: [] });

export const normalizeUrl = (u: string) => u.trim().replace(/\/+$/, '');

async function api<T>(base: string, path: string, init: { method?: string; token?: string; body?: unknown }): Promise<T> {
  const res = await fetch(base + path, {
    method: init.method ?? 'POST',
    headers: { ...(init.body === undefined ? {} : { 'content-type': 'application/json' }), ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
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
        records: {}, dirty: {}, onboarded: false, unit: 'C', server: null, syncing: false, syncError: null, reminders: DEFAULT_REMINDERS,
        setReminders: (r) => set((st) => ({ reminders: { ...st.reminders, ...r } })),
        name: '', hideSex: false, weightUnit: 'kg', share: null, partner: null,
        setPrefs: (p) => set(p),

        importLogs: (incoming, overwrite) => {
          const now = Date.now();
          let changed = 0;
          set((s) => {
            const records = { ...s.records };
            const dirty = { ...s.dirty };
            for (const l of incoming) {
              const id = dayId(l.date);
              const cur = records[id];
              const existing = cur && !cur.deleted ? (cur.data as DayLog) : undefined;
              const merged = mergeLogs(existing, l, overwrite);
              if (existing && JSON.stringify(existing) === JSON.stringify(merged)) continue;
              const empty = isEmptyLog(merged);
              if (empty && !existing) continue;
              records[id] = { id, data: empty ? null : merged, updatedAt: now, deleted: empty };
              dirty[id] = true;
              changed++;
            }
            return { records, dirty };
          });
          if (changed && get().server) { clearTimeout(syncTimer); syncTimer = setTimeout(() => void get().sync(), 1500); }
          return changed;
        },

        setPeriodDays: (on, off) => {
          const logs = new Map(selectLogs(get().records).map((l) => [l.date, l]));
          for (const d of on) {
            const l = logs.get(d) ?? emptyLog(d);
            if (l.flow < 2) get().saveDay({ ...l, flow: 3 });
          }
          for (const d of off) {
            const l = logs.get(d);
            if (l && l.flow >= 1) get().saveDay({ ...l, flow: 0 });
          }
        },

        startShare: async () => {
          if (!get().server) throw new Error('needs_server');
          set({ share: { ...newShareKey(), includeLog: false, publishedAt: null, error: null } });
          await get().publishShare();
          if (get().share?.error) { const e = get().share!.error!; set({ share: null }); throw new Error(e); }
        },

        stopShare: async () => {
          const { share, server } = get();
          if (share && server) await api(server.url, `/api/shares/${share.id}`, { method: 'DELETE', token: server.token }).catch(() => undefined);
          set({ share: null });
        },

        publishShare: async () => {
          const { share, server, records, name } = get();
          if (!share || !server) return;
          const snap = buildSnapshot(selectLogs(records), selectSettings(records), todayFn(), { name, includeLog: share.includeLog });
          try {
            await api(server.url, `/api/shares/${share.id}`, { method: 'PUT', token: server.token, body: { blob: sealSnapshot(share, snap) } });
            set((s) => ({ share: s.share && { ...s.share, publishedAt: Date.now(), error: null } }));
          } catch (e) {
            set((s) => ({ share: s.share && { ...s.share, error: (e as Error).message } }));
          }
        },

        setShareIncludeLog: (v) => {
          set((s) => ({ share: s.share && { ...s.share, includeLog: v } }));
          void get().publishShare();
        },

        joinAsPartner: async (code) => {
          const invite = decodeInvite(code);
          set({ partner: { invite, snapshot: null, fetchedAt: null, error: null } });
          await get().refreshPartner();
          const p = get().partner;
          if (p?.error) { set({ partner: null }); throw new Error(p.error); }
        },

        refreshPartner: async () => {
          const p = get().partner;
          if (!p) return;
          try {
            const res = await fetch(`${p.invite.url}/api/shares/${p.invite.id}`);
            if (res.status === 404) throw new Error('share_revoked');
            if (!res.ok) throw new Error(`http_${res.status}`);
            const { blob } = (await res.json()) as { blob: string };
            const snapshot = openSnapshot(p.invite, blob);
            set((s) => ({ partner: s.partner && { ...s.partner, snapshot, fetchedAt: Date.now(), error: null } }));
          } catch (e) {
            const msg = (e as Error).message;
            set((s) => ({ partner: s.partner && { ...s.partner, error: /fetch|network/i.test(msg) ? 'offline' : msg } }));
          }
        },

        leavePartner: () => set({ partner: null }),

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

        connect: async (url, email, password, passphrase, mode) => {
          const base = normalizeUrl(url);
          if (passphrase.length < MIN_PASSPHRASE) throw new Error('weak_passphrase');
          if (passphrase === password) throw new Error('same_passphrase');
          const { token } = await api<{ token: string }>(base, `/api/auth/${mode}`, { body: { email, password } });
          try {
            // The passphrase never leaves this device; only the public salt and a key-check blob are stored.
            const { info } = await api<{ info: KeyInfo | null }>(base, '/api/e2ee', { method: 'GET', token });
            let keys;
            if (info) keys = await unlockKeys(passphrase, info);
            else {
              const made = await createKeyInfo(passphrase);
              await api(base, '/api/e2ee', { method: 'PUT', token, body: { info: made.info } });
              keys = made.keys;
            }
            await saveKeys(keys);
          } catch (e) {
            await api(base, '/api/auth/logout', { token }).catch(() => undefined);
            throw e;
          }
          // Everything already on this device is uploaded (encrypted) on the first sync.
          set((s) => ({
            server: { url: base, token, email, cursor: 0, lastSync: null },
            dirty: Object.fromEntries(Object.keys(s.records).map((id) => [id, true as const])),
          }));
          await get().sync();
          // A fresh device that pulled existing data skips onboarding.
          if (Object.keys(get().records).length) set({ onboarded: true });
        },

        unlock: async (passphrase) => {
          const srv = get().server;
          if (!srv) return;
          const { info } = await api<{ info: KeyInfo | null }>(srv.url, '/api/e2ee', { method: 'GET', token: srv.token });
          if (!info) throw new Error('no_key_info');
          await saveKeys(await unlockKeys(passphrase, info));
          set({ syncError: null });
          await get().sync();
        },

        disconnect: async () => {
          const srv = get().server;
          if (srv) await api(srv.url, '/api/auth/logout', { token: srv.token }).catch(() => undefined);
          await clearKeys();
          set({ server: null, syncError: null });
        },

        sync: async () => {
          const { server, records, dirty, syncing } = get();
          if (!server || syncing) return;
          const keys = await loadKeys();
          if (!keys) return void set({ syncError: 'locked' });
          set({ syncing: true, syncError: null });
          try {
            const sent = Object.keys(dirty).map((id) => records[id]).filter(Boolean);
            const res = await api<SyncResponse>(server.url, '/api/sync', {
              token: server.token,
              body: { since: server.cursor, changes: sent.map((r) => encryptRecord(keys, r)) },
            });
            const decoded: SyncRecord[] = [];
            let failed = 0;
            for (const w of res.records) {
              try { decoded.push(decryptRecord(keys, w)); } catch { failed++; }
            }
            set((s) => {
              const next = { ...s.records };
              const nd = { ...s.dirty };
              for (const r of decoded) if (shouldApply(next[r.id], r)) next[r.id] = r;
              for (const r of sent) if (next[r.id]?.updatedAt === r.updatedAt) delete nd[r.id];
              return {
                records: next, dirty: nd, syncing: false,
                // Records that fail authentication are never applied; surface it instead of hiding it.
                syncError: failed ? `${failed} record(s) could not be decrypted` : null,
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
          if (deleteRemote) await clearKeys();
          if (deleteRemote) set({ share: null });
          set({ records: {}, dirty: {}, onboarded: false, server: deleteRemote ? null : srv, syncError: null });
        },
      };
    },
    {
      name: 'cyclo-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        records: s.records, dirty: s.dirty, onboarded: s.onboarded, unit: s.unit, server: s.server, reminders: s.reminders,
        name: s.name, hideSex: s.hideSex, weightUnit: s.weightUnit, share: s.share, partner: s.partner,
      }),
      // Older installs stored a flatter reminders shape; fill in anything missing.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, reminders: normalizeReminders(p.reminders) };
      },
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

export const kgToDisplay = (kg: number, u: 'kg' | 'lb') => (u === 'kg' ? kg : kg * 2.20462);
export const displayToKg = (v: number, u: 'kg' | 'lb') => (u === 'kg' ? v : v / 2.20462);
export const cToDisplay = (c: number, u: 'C' | 'F') => (u === 'C' ? c : (c * 9) / 5 + 32);
export const displayToC = (v: number, u: 'C' | 'F') => (u === 'C' ? v : ((v - 32) * 5) / 9);
