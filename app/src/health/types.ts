import type { HealthDay, HealthSource } from '@cyclo/core';

export type ProviderId = 'appleHealth' | 'healthConnect' | 'fitbit';

export interface Provider {
  id: ProviderId & HealthSource;
  /** Whether this provider can work on the current device at all. */
  available: () => Promise<{ ok: boolean; reason?: string }>;
  /** Ask the user for read permission. Resolves false if they decline. */
  connect: () => Promise<boolean>;
  /** Daily aggregates for [start, end] (local dates, inclusive). */
  fetch: (start: Date, end: Date) => Promise<HealthDay[]>;
  disconnect?: () => Promise<void>;
}

export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Minutes from local midnight of the wake-up day (negative = previous evening). */
export function sleepWindow(startIso: string, endIso: string) {
  const s = new Date(startIso), e = new Date(endIso);
  const midnight = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
  return { date: localDate(e), start: Math.round((s.getTime() - midnight) / 60000), end: Math.round((e.getTime() - midnight) / 60000) };
}

/** Group instantaneous samples per local day and average them. */
export function averageByDay<T>(rows: T[], at: (r: T) => string, val: (r: T) => number | undefined) {
  const m = new Map<string, number[]>();
  for (const r of rows) { const v = val(r); if (v == null || !Number.isFinite(v)) continue; const d = localDate(new Date(at(r))); (m.get(d) ?? m.set(d, []).get(d)!).push(v); }
  return new Map([...m].map(([d, vs]) => [d, vs.reduce((a, b) => a + b, 0) / vs.length]));
}
