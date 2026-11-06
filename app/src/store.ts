import type { ThemePref } from './theme';
import type { LangPref } from './i18n';
import { TERMS_VERSION } from './legal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_SHARE_ITEMS, type ShareItems, type BackupPayload,
  DEFAULT_REMINDERS, DEFAULT_SETTINGS, MIN_PASSPHRASE, SETTINGS_ID, buildSnapshot, createKeyInfo, dayId, decodeInvite, decryptRecord,
  encryptRecord, mergeLogs, newShareKey, normalizeReminders, openSnapshot, sealSnapshot, shouldApply, today as todayFn, unlockKeys,
  type DateStr, type DayLog, type Invite, type KeyInfo, type PartnerSnapshot, type ReminderPrefs, type Settings, type SyncRecord, type SyncResponse,
} from '@avelune/core';
import { clearKeys, loadKeys, saveKeys } from './keyring';

export interface ServerConn {
  url: string;
  token: string;
  email: string;
  cursor: number;
  lastSync: number | null;
}

export interface BackupState {
  enabled: boolean;
  /** Android: folder chosen through the system picker (content:// tree URI). */
  dirUri: string | null;
  dirLabel: string | null;
  lastAt: number | null;
  lastFile: string | null;
  lastDays: number | null;
  lastError: string | null;
  verifiedAt: number | null;
  keep: number;
}
export interface SecurityPrefs {
  /** PIN lock on launch/resume (PIN hash lives in secure storage). */
  lock: boolean;
  biometrics: boolean;
  /** Seconds in the background before locking again. */
  lockAfter: number;
  /** OS secure flag: no screenshots/recordings, blank app-switcher thumbnail on Android. */
  blockScreenshots: boolean;
}
export const DEFAULT_SECURITY: SecurityPrefs = { lock: false, biometrics: true, lockAfter: 0, blockScreenshots: false };

export const DEFAULT_BACKUP: BackupState = { enabled: false, dirUri: null, dirLabel: null, lastAt: null, lastFile: null, lastDays: null, lastError: null, verifiedAt: null, keep: 10 };

interface State {
  records: Record<string, SyncRecord>;
  /** Record ids with local edits not yet acknowledged by the server. */
  dirty: Record<string, true>;
  onboarded: boolean;
  /** Version of the first-use notice (terms + privacy) the person agreed to on this device. */
  termsAccepted: string | null;
  acceptTerms: () => void;
  unit: 'C' | 'F';
  server: ServerConn | null;
  syncing: boolean;
  syncError: string | null;
  reminders: ReminderPrefs;
  setReminders: (r: Partial<ReminderPrefs>) => void;
  /** Local display preferences (not synced). */
  name: string;
  hideSex: boolean;
  /** Appearance: follow the phone, or force light/dark. */
  theme: ThemePref;
  /** Language: follow the phone, or force English/Arabic. */
  language: LangPref;
  /** Last next-period date the user has seen, to explain when the estimate moves. */
  seenForecast?: DateStr | null;
  /** Partner's display name, kept only on this device. */
  partnerName?: string;
  weightUnit: 'kg' | 'lb';
  setPrefs: (p: Partial<Pick<State, 'name' | 'hideSex' | 'weightUnit' | 'unit' | 'theme' | 'language' | 'partnerName' | 'seenForecast'>>) => void;
  /** Import many day logs at once (CSV). Returns how many days changed. */
  importLogs: (logs: DayLog[], overwrite: boolean) => number;
  /** Toggle period days in bulk (calendar "Edit period dates"). */
  setPeriodDays: (on: DateStr[], off: DateStr[]) => void;
  /** Owner side of partner sharing. */
  share: { id: string; key: string; includeLog: boolean; items?: ShareItems; publishedAt: number | null; error: string | null } | null;
  startShare: () => Promise<void>;
  stopShare: () => Promise<void>;
  publishShare: () => Promise<void>;
  setShareIncludeLog: (v: boolean) => void;
  setShareItems: (p: Partial<ShareItems>) => void;
  /** Partner side: this device only views someone else's shared cycle. */
  partner: { invite: Invite; snapshot: PartnerSnapshot | null; fetchedAt: number | null; error: string | null } | null;
  joinAsPartner: (code: string) => Promise<void>;
  refreshPartner: () => Promise<void>;
  leavePartner: () => void;
  saveDay: (log: DayLog) => void;
  saveSettings: (s: Settings) => void;
  /** Merge a patch into the synced settings record. */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Leave pregnancy mode: birth (postpartum stage), loss (gentle stage) or simply turned off. */
  endPregnancy: (outcome: 'birth' | 'loss' | 'ended', on: DateStr, breastfeeding?: boolean) => void;
  /** Encrypted local backups (see backup.ts). */
  backup: BackupState;
  setBackup: (b: Partial<BackupState>) => void;
  security: SecurityPrefs;
  setSecurity: (p: Partial<SecurityPrefs>) => void;
  /** Apply a decrypted backup: merge (newer edits win) or replace everything. Returns records written. */
  restoreBackup: (payload: BackupPayload, mode: 'merge' | 'replace') => number;
  /** Device preferences included in backups. */
  backupPrefs: () => Record<string, unknown>;
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
  l.bbt == null && l.weight == null && !l.water && l.sleep == null && l.distance == null &&
  !Object.values(l.meds ?? {}).some((n) => n > 0);

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
        records: {}, dirty: {}, onboarded: false, termsAccepted: null, unit: 'C', server: null, syncing: false, syncError: null, reminders: DEFAULT_REMINDERS,
        setReminders: (r) => set((st) => ({ reminders: { ...st.reminders, ...r } })),
        name: '', hideSex: false, theme: 'system', language: 'system', weightUnit: 'kg', share: null, partner: null,
        setPrefs: (p) => set(p),
        acceptTerms: () => set({ termsAccepted: TERMS_VERSION }),

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
          const snap = buildSnapshot(selectLogs(records), selectSettings(records), todayFn(), { name, items: { ...DEFAULT_SHARE_ITEMS, ...(share.includeLog ? { moods: true, symptoms: true } : {}), ...share.items } });
          try {
            await api(server.url, `/api/shares/${share.id}`, { method: 'PUT', token: server.token, body: { blob: sealSnapshot(share, snap) } });
            set((s) => ({ share: s.share && { ...s.share, publishedAt: Date.now(), error: null } }));
          } catch (e) {
            set((s) => ({ share: s.share && { ...s.share, error: (e as Error).message } }));
          }
        },

        setShareItems: (p) => {
          set((s) => ({ share: s.share && { ...s.share, items: { ...DEFAULT_SHARE_ITEMS, ...(s.share.includeLog ? { moods: true, symptoms: true } : {}), ...s.share.items, ...p } } }));
          void get().publishShare();
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
        updateSettings: (patch) => get().saveSettings({ ...selectSettings(get().records), ...patch }),
        endPregnancy: (outcome, on, breastfeeding) => {
          const st = selectSettings(get().records);
          const pregnancies = [...(st.pregnancies ?? [])];
          if (st.pregnancyLmp) pregnancies.push({ lmp: st.pregnancyLmp, end: on, outcome });
          get().saveSettings({
            ...st, pregnancyLmp: null, pregnancies, lateDismissedFor: null,
            stage: outcome === 'birth' ? { kind: 'postpartum', since: on, breastfeeding: !!breastfeeding, returnedOn: null } : outcome === 'loss' ? { kind: 'loss', since: on } : { kind: 'cycling' },
          });
        },

        security: DEFAULT_SECURITY,
        setSecurity: (p) => set((s) => ({ security: { ...s.security, ...p } })),
        backup: DEFAULT_BACKUP,
        setBackup: (b) => set((s) => ({ backup: { ...s.backup, ...b } })),
        backupPrefs: () => {
          const s = get();
          return { name: s.name, unit: s.unit, weightUnit: s.weightUnit, hideSex: s.hideSex, theme: s.theme, language: s.language, partnerName: s.partnerName, reminders: s.reminders };
        },
        restoreBackup: (payload, mode) => {
          const now = Date.now();
          let n = 0;
          set((s) => {
            const records = mode === 'replace' ? {} as Record<string, SyncRecord> : { ...s.records };
            const dirty = { ...s.dirty };
            if (mode === 'replace') for (const id of Object.keys(s.records)) { records[id] = { ...s.records[id], data: null, deleted: true, updatedAt: now }; dirty[id] = true; }
            for (const r of payload.records) {
              const cur = s.records[r.id];
              if (mode === 'merge' && cur && cur.updatedAt >= r.updatedAt) continue;
              // Re-stamp so the restored version wins on any synced devices too.
              records[r.id] = { ...r, updatedAt: mode === 'replace' ? now + 1 : r.updatedAt };
              dirty[r.id] = true;
              n++;
            }
            const p = (payload.prefs ?? {}) as Partial<State>;
            const prefs = mode === 'replace' || !s.onboarded
              ? { name: p.name ?? s.name, unit: p.unit ?? s.unit, weightUnit: p.weightUnit ?? s.weightUnit, hideSex: p.hideSex ?? s.hideSex, theme: p.theme ?? s.theme, language: p.language ?? s.language, partnerName: p.partnerName ?? s.partnerName, reminders: normalizeReminders(p.reminders ?? s.reminders) }
              : {};
            return { records, dirty, onboarded: true, ...prefs };
          });
          if (get().server) { clearTimeout(syncTimer); syncTimer = setTimeout(() => void get().sync(), 1500); }
          return n;
        },

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
      name: 'avelune-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        records: s.records, dirty: s.dirty, onboarded: s.onboarded, termsAccepted: s.termsAccepted, unit: s.unit, server: s.server, reminders: s.reminders,
        name: s.name, hideSex: s.hideSex, theme: s.theme, language: s.language, partnerName: s.partnerName, seenForecast: s.seenForecast, weightUnit: s.weightUnit, share: s.share, partner: s.partner, backup: s.backup, security: s.security,
      }),
      // Older installs stored a flatter reminders shape; fill in anything missing.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, reminders: normalizeReminders(p.reminders), backup: { ...DEFAULT_BACKUP, ...(p.backup ?? {}) }, security: { ...DEFAULT_SECURITY, ...(p.security ?? {}) } };
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
