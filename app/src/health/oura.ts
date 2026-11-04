import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { HealthDay } from '@cyclo/core';
import { secure } from '../secure';
import { localDate, type Provider } from './types';

WebBrowser.maybeCompleteAuthSession();

/**
 * Oura account sign-in (Oura API v2, OAuth 2.0 client-side flow: the access token comes back in the redirect,
 * so no client secret is stored in the app). Tokens stay on this device and requests go straight from the
 * phone to Oura. Needs an Oura API application (cloud.ouraring.com › API applications) whose redirect URI
 * matches `ouraRedirectUri`. Oura access tokens last about 30 days; after that, connect again.
 *
 * Reads: steps, active calories and distance; sleep time and window, lowest/average heart rate and HRV;
 * temperature deviation from your baseline (readiness); and SpO₂.
 */
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://cloud.ouraring.com/oauth/authorize',
  tokenEndpoint: 'https://api.ouraring.com/oauth/token',
};
const SCOPES = ['personal', 'daily', 'heartrate', 'spo2'];
const KEY = 'avelune.oura.token.v1';

export const ouraRedirectUri = () => AuthSession.makeRedirectUri({ scheme: 'avelune', path: 'oura' });

interface Stored { accessToken: string; expiresAt: number | null }

async function token(): Promise<Stored | null> {
  const raw = await secure.get(KEY);
  if (!raw) return null;
  const t = JSON.parse(raw) as Stored;
  if (t.expiresAt && Date.now() > t.expiresAt) throw new Error('Oura sign-in expired. Disconnect and connect again.');
  return t;
}

interface Page<T> { data: T[]; next_token?: string | null }

async function list<T>(path: string, start: string, end: string): Promise<T[]> {
  const t = await token();
  if (!t) throw new Error('oura_not_connected');
  const out: T[] = [];
  let next: string | null | undefined;
  do {
    const q = new URLSearchParams({ start_date: start, end_date: end, ...(next ? { next_token: next } : {}) });
    const res = await fetch(`https://api.ouraring.com/v2/usercollection/${path}?${q}`, { headers: { authorization: `Bearer ${t.accessToken}` } });
    if (res.status === 401) throw new Error('Oura sign-in expired. Disconnect and connect again.');
    if (res.status === 403) throw new Error('Oura did not allow this data (check your membership and the permissions you granted).');
    if (res.status === 429) throw new Error('Oura rate limit reached; try again later.');
    if (!res.ok) throw new Error(`oura_http_${res.status}`);
    const page = (await res.json()) as Page<T>;
    out.push(...page.data);
    next = page.next_token;
  } while (next);
  return out;
}

interface Activity { day: string; steps?: number; active_calories?: number; equivalent_walking_distance?: number }
interface Sleep {
  day: string; type?: string; total_sleep_duration?: number; bedtime_start?: string; bedtime_end?: string;
  lowest_heart_rate?: number; average_heart_rate?: number; average_hrv?: number;
}
interface Readiness { day: string; temperature_deviation?: number | null }
interface Spo2 { day: string; spo2_percentage?: { average?: number } | null }

export function makeOura(clientId: () => string): Provider {
  return {
    id: 'oura',
    available: async () => (clientId() ? { ok: true } : { ok: false, reason: 'Add your Oura app Client ID first.' }),
    connect: async () => {
      const id = clientId();
      if (!id) return false;
      const req = new AuthSession.AuthRequest({ clientId: id, scopes: SCOPES, redirectUri: ouraRedirectUri(), usePKCE: false, responseType: AuthSession.ResponseType.Token });
      const res = await req.promptAsync(discovery);
      if (res.type !== 'success') return false;
      const access = res.params.access_token;
      if (!access) return false;
      const expiresIn = Number(res.params.expires_in);
      await secure.set(KEY, JSON.stringify({ accessToken: access, expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : null } satisfies Stored));
      return true;
    },
    disconnect: async () => { await secure.del(KEY); },
    fetch: async (start, end) => {
      // Oura's end_date is exclusive for some collections; ask for one extra day.
      const s = localDate(start);
      const e = localDate(new Date(end.getTime() + 86400000));
      const days = new Map<string, HealthDay>();
      const day = (d: string) => days.get(d) ?? days.set(d, { date: d }).get(d)!;
      const [act, sleep, ready, spo2] = await Promise.all([
        list<Activity>('daily_activity', s, e),
        list<Sleep>('sleep', s, e),
        list<Readiness>('daily_readiness', s, e),
        list<Spo2>('daily_spo2', s, e).catch(() => [] as Spo2[]),
      ]);
      for (const a of act) {
        const d = day(a.day);
        if (a.steps) d.steps = a.steps;
        if (a.active_calories) d.activeKcal = a.active_calories;
        if (a.equivalent_walking_distance) d.distanceKm = Math.round(a.equivalent_walking_distance / 10) / 100;
      }
      // Use the main (longest) sleep of each day.
      const main = new Map<string, Sleep>();
      for (const sl of sleep) {
        const cur = main.get(sl.day);
        if (sl.type === 'long_sleep' || !cur || (sl.total_sleep_duration ?? 0) > (cur.total_sleep_duration ?? 0)) main.set(sl.day, sl);
      }
      for (const sl of main.values()) {
        const d = day(sl.day);
        if (sl.total_sleep_duration) d.sleepMin = Math.round(sl.total_sleep_duration / 60);
        if (sl.bedtime_start && sl.bedtime_end) {
          const b = new Date(sl.bedtime_start), w = new Date(sl.bedtime_end);
          const mid = new Date(w.getFullYear(), w.getMonth(), w.getDate()).getTime();
          d.sleepStart = Math.round((b.getTime() - mid) / 60000);
          d.sleepEnd = Math.round((w.getTime() - mid) / 60000);
        }
        if (sl.lowest_heart_rate) { d.restingHr = sl.lowest_heart_rate; d.hrMin = sl.lowest_heart_rate; }
        if (sl.average_heart_rate) d.hrAvg = Math.round(sl.average_heart_rate);
        if (sl.average_hrv) d.hrv = Math.round(sl.average_hrv);
      }
      for (const r of ready) if (r.temperature_deviation != null) day(r.day).tempDeviationC = Math.round(r.temperature_deviation * 100) / 100;
      for (const o of spo2) if (o.spo2_percentage?.average) day(o.day).spo2 = Math.round(o.spo2_percentage.average * 10) / 10;
      return [...days.values()];
    },
  };
}
