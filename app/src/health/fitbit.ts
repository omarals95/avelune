import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { HealthDay } from '@avelune/core';
import { secure } from '../secure';
import { localDate, sleepWindow, type Provider } from './types';

WebBrowser.maybeCompleteAuthSession();

/**
 * Fitbit account sign-in (OAuth 2.0 + PKCE, no client secret). Tokens stay on this device; requests go
 * straight from the phone to Fitbit, never through the Avelune server. Requires a Fitbit developer app
 * ("Client" type) whose redirect URL matches `fitbitRedirectUri`.
 */
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://www.fitbit.com/oauth2/authorize',
  tokenEndpoint: 'https://api.fitbit.com/oauth2/token',
  revocationEndpoint: 'https://api.fitbit.com/oauth2/revoke',
};
const SCOPES = ['activity', 'sleep', 'heartrate', 'weight', 'nutrition', 'oxygen_saturation'];
const KEY = 'avelune.fitbit.token.v1';

export const fitbitRedirectUri = () => AuthSession.makeRedirectUri({ scheme: 'avelune', path: 'fitbit' });

interface Stored { clientId: string; accessToken: string; refreshToken?: string; issuedAt: number; expiresIn?: number }

async function token(): Promise<Stored | null> {
  const raw = await secure.get(KEY);
  if (!raw) return null;
  const t = JSON.parse(raw) as Stored;
  if (t.expiresIn && t.refreshToken && Date.now() / 1000 > t.issuedAt + t.expiresIn - 120) {
    const r = await AuthSession.refreshAsync({ clientId: t.clientId, refreshToken: t.refreshToken }, discovery);
    const next: Stored = { clientId: t.clientId, accessToken: r.accessToken, refreshToken: r.refreshToken ?? t.refreshToken, issuedAt: r.issuedAt, expiresIn: r.expiresIn };
    await secure.set(KEY, JSON.stringify(next));
    return next;
  }
  return t;
}

async function get<T>(path: string): Promise<T> {
  const t = await token();
  if (!t) throw new Error('fitbit_not_connected');
  const res = await fetch(`https://api.fitbit.com${path}`, { headers: { authorization: `Bearer ${t.accessToken}` } });
  if (res.status === 401) throw new Error('fitbit_unauthorized');
  if (res.status === 429) throw new Error('fitbit_rate_limited');
  if (!res.ok) throw new Error(`fitbit_http_${res.status}`);
  return res.json() as Promise<T>;
}

export function makeFitbit(clientId: () => string): Provider {
  return {
    id: 'fitbit',
    available: async () => (clientId() ? { ok: true } : { ok: false, reason: 'Add your Fitbit app Client ID first.' }),
    connect: async () => {
      const id = clientId();
      if (!id) return false;
      const redirectUri = fitbitRedirectUri();
      const req = new AuthSession.AuthRequest({ clientId: id, scopes: SCOPES, redirectUri, usePKCE: true, responseType: AuthSession.ResponseType.Code });
      const res = await req.promptAsync(discovery);
      if (res.type !== 'success' || !res.params.code) return false;
      const t = await AuthSession.exchangeCodeAsync({ clientId: id, code: res.params.code, redirectUri, extraParams: { code_verifier: req.codeVerifier ?? '' } }, discovery);
      await secure.set(KEY, JSON.stringify({ clientId: id, accessToken: t.accessToken, refreshToken: t.refreshToken, issuedAt: t.issuedAt, expiresIn: t.expiresIn } satisfies Stored));
      return true;
    },
    disconnect: async () => {
      const t = await token().catch(() => null);
      if (t) await AuthSession.revokeAsync({ token: t.accessToken, clientId: t.clientId }, discovery).catch(() => undefined);
      await secure.del(KEY);
    },
    fetch: async (start, end) => {
      const s = localDate(start), e = localDate(end);
      const days = new Map<string, HealthDay>();
      const day = (d: string) => days.get(d) ?? days.set(d, { date: d }).get(d)!;
      // Fitbit caps most time-series at 30–100 days per call; fetch in 30-day windows.
      const windows: [string, string][] = [];
      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 30)) {
        const we = new Date(cur); we.setDate(we.getDate() + 29);
        windows.push([localDate(cur), localDate(we > end ? end : we)]);
      }
      for (const [a, b] of windows) {
        const [steps, dist, cal, heart, sleep, weight, water] = await Promise.all([
          get<{ 'activities-steps': { dateTime: string; value: string }[] }>(`/1/user/-/activities/steps/date/${a}/${b}.json`),
          get<{ 'activities-distance': { dateTime: string; value: string }[] }>(`/1/user/-/activities/distance/date/${a}/${b}.json`),
          get<{ 'activities-activityCalories': { dateTime: string; value: string }[] }>(`/1/user/-/activities/activityCalories/date/${a}/${b}.json`).catch(() => ({ 'activities-activityCalories': [] })),
          get<{ 'activities-heart': { dateTime: string; value: { restingHeartRate?: number } }[] }>(`/1/user/-/activities/heart/date/${a}/${b}.json`),
          get<{ sleep: { dateOfSleep: string; minutesAsleep: number; startTime: string; endTime: string; isMainSleep: boolean }[] }>(`/1.2/user/-/sleep/date/${a}/${b}.json`),
          get<{ weight: { date: string; weight: number }[] }>(`/1/user/-/body/log/weight/date/${a}/${b}.json`).catch(() => ({ weight: [] })),
          get<{ 'foods-log-water': { dateTime: string; value: string }[] }>(`/1/user/-/foods/log/water/date/${a}/${b}.json`).catch(() => ({ 'foods-log-water': [] })),
        ]);
        for (const r of steps['activities-steps']) if (+r.value) day(r.dateTime).steps = +r.value;
        for (const r of dist['activities-distance']) if (+r.value) day(r.dateTime).distanceKm = Math.round(+r.value * 100) / 100;
        for (const r of cal['activities-activityCalories']) if (+r.value) day(r.dateTime).activeKcal = +r.value;
        for (const r of heart['activities-heart']) if (r.value.restingHeartRate) day(r.dateTime).restingHr = r.value.restingHeartRate;
        for (const r of sleep.sleep.filter((x) => x.isMainSleep)) {
          const w = sleepWindow(r.startTime, r.endTime);
          Object.assign(day(r.dateOfSleep), { sleepMin: r.minutesAsleep, sleepStart: w.start, sleepEnd: w.end });
        }
        for (const r of weight.weight) day(r.date).weightKg = Math.round(r.weight * 10) / 10;
        for (const r of water['foods-log-water']) if (+r.value) day(r.dateTime).waterMl = Math.round(+r.value);
      }
      void s; void e;
      return [...days.values()];
    },
  };
}
