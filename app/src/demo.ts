import { Platform } from 'react-native';

/**
 * Web demo (GitHub Pages): opening the app with ?demo fills a fresh browser with made-up sample data, so people can
 * explore the calendar, insights and graphs straight away. It never touches a browser that already has Avelune data,
 * and the data stays in that browser only. The first-use notice is still shown.
 */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const add = (s: string, n: number) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const days = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 864e5);

export function sampleState(): string {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const today = iso(new Date());
  const lens = [29, 27, 28, 30, 28, 27, 29];
  let start = add(today, -12);
  const starts = [start];
  for (const l of lens) { start = add(start, -l); starts.unshift(start); }
  const records: Record<string, unknown> = {};
  for (let d = starts[0]; d <= today; d = add(d, 1)) {
    const s = starts.filter((x) => x <= d).pop()!;
    const cd = days(s, d);
    const next = starts[starts.indexOf(s) + 1];
    const len = next ? days(s, next) : 28;
    const ov = len - 14;
    const log: Record<string, unknown> & { symptoms: string[]; moods: string[]; tags: string[] } = { date: d, flow: 0, symptoms: [], moods: [], tags: [] };
    if (cd < 5) {
      log.flow = [2, 3, 3, 2, 1][cd];
      if (cd < 3) log.symptoms.push('cramps');
      if (cd < 2) log.symptoms.push('fatigue');
      if (cd === 1) log.symptoms.push('backache');
      log.moods.push(cd < 2 ? 'low-energy' : 'calm');
    } else if (Math.abs(cd - ov) <= 1) { log.tags.push('discharge:egg-white'); log.moods.push('energetic'); }
    else if (cd > len - 4) { log.symptoms.push(rnd() < 0.5 ? 'bloating' : 'tender-breasts'); if (rnd() < 0.5) log.moods.push('swings'); }
    else if (rnd() < 0.35) log.moods.push(rnd() < 0.5 ? 'happy' : 'calm');
    if (rnd() < 0.25) log.tags.push('activity:yoga');
    log.bbt = +(cd > ov ? 36.68 + rnd() * 0.16 : 36.28 + rnd() * 0.16).toFixed(2);
    log.weight = +(61.6 + rnd() * 0.8 + (cd > len - 5 ? 0.4 : 0)).toFixed(1);
    log.water = 250 * Math.round(6 + rnd() * 4);
    log.sleep = +(6.4 + rnd() * 1.9).toFixed(1);
    records[`day:${d}`] = { id: `day:${d}`, updatedAt: 1, deleted: false, data: log };
  }
  records.settings = { id: 'settings', updatedAt: 1, deleted: false, data: { cycleLength: 28, periodLength: 5, lutealLength: 14, showFertileWindow: true, waterTarget: 2250 } };
  return JSON.stringify({ state: { onboarded: true, records }, version: 0 });
}

/** Runs on import, before the store module loads. */
export function seedDemo() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('demo')) return;
    if (!window.localStorage.getItem('avelune-v1')) window.localStorage.setItem('avelune-v1', sampleState());
    url.searchParams.delete('demo');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch { /* storage blocked: start empty */ }
}

seedDemo();
