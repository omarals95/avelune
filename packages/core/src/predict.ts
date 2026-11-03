import { addDays, diffDays } from './dates';
import type { Condition, Contraception, DateStr, DayLog, Settings } from './types';

export interface Period {
  start: DateStr;
  end: DateStr;
  length: number;
}

/** A day counts toward a period when flow is light or heavier (spotting alone does not). */
const PERIOD_FLOW = 2;

/** Group consecutive flow days (allowing a 1-day gap) into periods. */
export function derivePeriods(logs: DayLog[]): Period[] {
  const days = logs
    .filter((l) => l.flow >= PERIOD_FLOW)
    .map((l) => l.date)
    .sort();
  const periods: Period[] = [];
  for (const d of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, d) <= 2) {
      last.end = d;
      last.length = diffDays(last.start, d) + 1;
    } else {
      periods.push({ start: d, end: d, length: 1 });
    }
  }
  return periods;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (d: DateStr) => `${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`;

export type ExcludeReason = 'manual' | 'unusual' | 'pregnancy' | 'contraception' | 'postpartum';

/** One completed cycle: from a period start to the next period start. */
export interface CycleInfo {
  start: DateStr;
  length: number;
  periodLength: number;
  excluded: boolean;
  /** Why it is left out of averages (also set on included cycles that would be auto-excluded but were overridden). */
  reason: ExcludeReason | null;
}

export interface CycleStats {
  /** Lengths of the cycles that count toward averages (oldest first). */
  cycleLengths: number[];
  /** Every completed cycle with its include/exclude decision. */
  cycles: CycleInfo[];
  avgCycle: number;
  avgPeriod: number;
  /** Std-dev of counted cycle lengths in days; 0 when not enough data. */
  variability: number;
  regularity: 'unknown' | 'regular' | 'somewhat-irregular' | 'irregular';
}

/** Windows during which bleeding is not a menstrual period (pregnancy, postpartum bleeding). */
function blockedWindows(settings: Settings): [DateStr, DateStr, ExcludeReason][] {
  const out: [DateStr, DateStr, ExcludeReason][] = [];
  for (const p of settings.pregnancies ?? []) out.push([p.lmp, addDays(p.end, p.outcome === 'birth' ? 42 : 0), 'pregnancy']);
  if (settings.pregnancyLmp) out.push([settings.pregnancyLmp, '9999-12-31', 'pregnancy']);
  const st = settings.stage;
  if (st?.kind === 'postpartum') {
    const back = st.returnedOn ?? null;
    out.push([st.since, back ? addDays(back, -1) : addDays(st.since, 42), 'postpartum']);
  }
  return out;
}

/** Hormonal methods during which bleeding is a withdrawal bleed, not an ovulatory cycle. */
const SUPPRESSING: Contraception[] = ['combined-pill', 'ring', 'patch', 'injection', 'implant'];

export function computeStats(periodsIn: Period[], settings: Settings): CycleStats {
  const overrides = settings.cycleOverrides ?? {};
  const blocked = blockedWindows(settings);
  // Bleeding inside postpartum windows never starts a cycle.
  const periods = periodsIn.filter((p) => !blocked.some(([a, b, r]) => r === 'postpartum' && p.start >= a && p.start <= b));
  const stopped = settings.profile?.stoppedHormonalOn ?? null;
  const cycles: CycleInfo[] = [];
  for (let i = 1; i < periods.length; i++) {
    const start = periods[i - 1].start;
    const end = periods[i].start;
    const length = diffDays(start, end);
    let reason: ExcludeReason | null = null;
    if (blocked.some(([a, b]) => start <= b && end > a)) reason = 'pregnancy';
    else if (stopped && start < stopped) reason = 'contraception';
    cycles.push({ start, length, periodLength: periods[i - 1].length, excluded: false, reason });
  }
  // Flag unusual cycles (likely missed logs or one-offs) against the median of the rest.
  const candidates = cycles.filter((c) => !c.reason);
  const lens = candidates.map((c) => c.length);
  if (lens.length) {
    const med = median(lens);
    const mad = median(lens.map((l) => Math.abs(l - med))) * 1.4826;
    const limit = Math.max(10, 3 * mad);
    for (const c of candidates) {
      if (c.length < 10) c.reason = 'unusual';
      else if (lens.length >= 4 && Math.abs(c.length - med) > limit) c.reason = 'unusual';
      else if (lens.length >= 2 && lens.length < 4 && c.length > med * 2.5) c.reason = 'unusual';
    }
  }
  for (const c of cycles) {
    const o = overrides[c.start];
    c.excluded = o === 'exclude' ? true : o === 'include' ? false : !!c.reason;
    if (o === 'exclude' && !c.reason) c.reason = 'manual';
  }
  const counted = cycles.filter((c) => !c.excluded);
  const recent = counted.slice(-6).map((c) => c.length);
  const avgCycle = recent.length ? Math.round(median(recent)) : settings.cycleLength;
  const countedStarts = new Set(counted.map((c) => c.start));
  const usablePeriods = periods.filter((p, i) => i === periods.length - 1 || countedStarts.has(p.start));
  const recentPeriods = usablePeriods.slice(-6).map((p) => p.length);
  const avgPeriod = recentPeriods.length ? Math.round(median(recentPeriods)) : settings.periodLength;
  const variability = recent.length >= 3 ? stdev(recent) : 0;
  const regularity: CycleStats['regularity'] =
    recent.length < 3 ? 'unknown' : variability <= 2 ? 'regular' : variability <= 5 ? 'somewhat-irregular' : 'irregular';
  return {
    cycleLengths: counted.map((c) => c.length), cycles,
    avgCycle: clamp(avgCycle, 10, 120), avgPeriod: clamp(avgPeriod, 1, 14), variability, regularity,
  };
}

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
export type Confidence = 'high' | 'medium' | 'low';
/** Why there is no forecast right now. */
export type NoForecast = 'no-data' | 'paused' | 'postpartum' | 'loss' | 'no-uterus' | 'user' | 'pregnant';

export interface Prediction {
  stats: CycleStats;
  lastPeriodStart: DateStr | null;
  /** 1-based day of the current cycle, or null if no period has been logged. */
  cycleDay: number | null;
  phase: Phase | null;
  /** Most likely start of the next period (null when there is no forecast). */
  nextPeriodStart: DateStr | null;
  /** Likely window for the next period, widened for irregular cycles and context. */
  nextPeriodRange: [DateStr, DateStr] | null;
  ovulationDate: DateStr | null;
  fertileWindow: [DateStr, DateStr] | null;
  /** Days from today to the most likely start (negative once it has passed). */
  daysUntilPeriod: number | null;
  confidence: Confidence;
  /** null when a forecast is shown; otherwise why not. */
  noForecast: NoForecast | null;
  /** Plain-language reasons behind the estimate ("why this date"). */
  notes: string[];
  /** Days past the END of the likely window with no period logged (null when not late). */
  lateBy: number | null;
  /** The user said "don't flag this one as late". */
  lateDismissed: boolean;
  /** The fertile window is hidden because the contraception in use normally prevents ovulation. */
  fertileHidden: boolean;
}

const has = (s: Settings, c: Condition) => !!s.profile?.conditions?.includes(c);

/** How far to widen the range, the confidence cap and the notes that the user's context adds. */
function contextEffects(settings: Settings, now: DateStr) {
  const notes: string[] = [];
  let widen = 0;
  let cap: Confidence = 'high';
  const lower = (c: Confidence) => { if (c === 'low' || (c === 'medium' && cap === 'high')) cap = c; };
  const pr = settings.profile ?? {};
  if (has(settings, 'pcos')) { widen += 4; lower('low'); notes.push('PCOS: cycles can vary a lot, so the estimate is a wider range.'); }
  if (has(settings, 'perimenopause')) {
    widen += 5; lower('low');
    notes.push(pr.hrt ? 'Perimenopause on HRT: bleeding may follow your HRT pattern more than ovulation.' : 'Perimenopause: cycles often lengthen, shorten or skip, so treat this as a rough guide.');
  }
  if (has(settings, 'thyroid')) { widen += 2; lower('medium'); notes.push('Thyroid conditions can shift cycle length.'); }
  if (has(settings, 'endometriosis')) notes.push('Endometriosis does not usually change timing, but pain tracking by cycle day can help your doctor.');
  const stopped = pr.stoppedHormonalOn;
  if (stopped && diffDays(stopped, now) >= 0 && diffDays(stopped, now) < 180) {
    widen += 4; lower('low');
    notes.push(`You stopped hormonal birth control on ${short(stopped)}. Cycles often take a few months to settle; earlier bleeds are not counted.`);
  } else if (stopped) notes.push(`Bleeds before you stopped hormonal birth control (${short(stopped)}) are not counted.`);
  const c = pr.contraception ?? 'none';
  if (c === 'combined-pill' || c === 'ring' || c === 'patch') notes.push('On the pill, ring or patch, bleeding is a withdrawal bleed set by your pack schedule, not a natural period.');
  if (c === 'mini-pill') { widen += 3; lower('medium'); notes.push('The mini pill can make bleeding irregular.'); }
  if (c === 'implant' || c === 'injection') { widen += 6; lower('low'); notes.push('The implant and injection often make bleeding unpredictable or stop it.'); }
  if (c === 'hormonal-iud') { widen += 4; lower('low'); notes.push('A hormonal IUD often makes periods lighter, irregular or absent.'); }
  if (c === 'copper-iud') notes.push('A copper IUD can make periods heavier or longer, but timing usually stays the same.');
  if (pr.fertilityTreatment) { lower('low'); notes.push('During fertility treatment your clinic’s plan sets the timing; use this only as a rough guide.'); }
  const st = settings.stage;
  if (st?.kind === 'postpartum') { widen += 5; lower('low'); notes.push('The first cycles after birth are often irregular.'); }
  if (st?.kind === 'loss') { widen += 4; lower('low'); notes.push('After a pregnancy loss the first cycle can be longer or shorter than usual.'); }
  const fertileHidden = SUPPRESSING.includes(c);
  if (fertileHidden) notes.push('Your contraception normally prevents ovulation, so no fertile window is shown.');
  return { widen, cap, notes, fertileHidden };
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function predict(logs: DayLog[], settings: Settings, now: DateStr): Prediction {
  const periods = derivePeriods(logs);
  const stats = computeStats(periods, settings);
  const last = periods.length ? periods[periods.length - 1] : null;
  const ctx = contextEffects(settings, now);
  const base = {
    stats, nextPeriodStart: null, nextPeriodRange: null, ovulationDate: null, fertileWindow: null, daysUntilPeriod: null,
    lateBy: null, lateDismissed: false, fertileHidden: ctx.fertileHidden,
  } as const;
  const cycleDay = last ? diffDays(last.start, now) + 1 : null;
  const inPeriod = !!last && diffDays(last.start, now) >= 0 && diffDays(last.end, now) <= 1;
  const off = (why: NoForecast, notes: string[]): Prediction => ({
    ...base, lastPeriodStart: last?.start ?? null, cycleDay: cycleDay && cycleDay >= 1 ? cycleDay : null,
    phase: inPeriod ? 'menstrual' : null, confidence: 'low', noForecast: why, notes,
  });

  if (!last) return { ...off('no-data', ['Log a period to start predictions.']), lastPeriodStart: null, cycleDay: null };
  if (settings.pregnancyLmp) return off('pregnant', ['Cycle predictions are paused during pregnancy.']);
  if (has(settings, 'no-uterus')) return off('no-uterus', ['No periods are expected, so there is no period forecast. You can still log symptoms and bleeding.']);
  const st = settings.stage;
  if (st?.kind === 'paused') return off('paused', ['Tracking is paused. Logs are still saved; predictions return when you resume.']);
  if (st?.kind === 'postpartum') {
    // Bleeding in the first six weeks is postpartum bleeding (lochia); a later bleed, or "my period is back", restarts predictions.
    const back = st.returnedOn ?? periods.find((p) => p.start > addDays(st.since, 42))?.start ?? null;
    if (!back || last.start < back) {
      return off('postpartum', [st.breastfeeding
        ? 'While breastfeeding, periods often stay away for months. Predictions start again with your first period.'
        : 'Predictions start again with your first period after birth (often 6–12 weeks).']);
    }
  }
  if (st?.kind === 'loss' && last.start <= st.since) {
    return off('loss', ['Predictions will start again from your next period. There is no “late” warning in the meantime.']);
  }
  if (settings.forecastMode === 'off') return off('user', ['Forecast is off: Avelune shows days since your last period only.']);

  const cycleLen = stats.avgCycle;
  // Roll forward if the predicted start is long past without a logged period.
  let next = addDays(last.start, cycleLen);
  let anchor = last.start;
  while (diffDays(next, now) > 0 && diffDays(anchor, now) > cycleLen * 3) {
    anchor = next;
    next = addDays(next, cycleLen);
  }
  const lutealLen = clamp(settings.lutealLength, 10, 16);
  const ovulation = addDays(next, -lutealLen);
  const fertile: [DateStr, DateStr] = [addDays(ovulation, -5), addDays(ovulation, 1)];

  const n = stats.cycleLengths.length;
  let confidence: Confidence = n >= 6 && stats.variability <= 2 ? 'high' : n >= 3 && stats.variability <= 5 ? 'medium' : 'low';
  if (RANK[ctx.cap] < RANK[confidence]) confidence = ctx.cap;
  let spread = Math.max(1, Math.round(stats.variability)) + ctx.widen;
  if (n < 3) spread = Math.max(spread, 3);
  const range: [DateStr, DateStr] = [addDays(next, -spread), addDays(next, spread)];

  const notes: string[] = [];
  if (n === 0) notes.push(`Based on your settings (${cycleLen}-day cycle) until you have logged two or more periods.`);
  else notes.push(`Based on your last ${Math.min(n, 6)} cycle${n === 1 ? '' : 's'} (typical length ${cycleLen} days).`);
  if (stats.variability > 2) notes.push(`Your cycles vary by about ${Math.round(stats.variability)} days, so the window is ±${spread} days.`);
  else notes.push(`Likely window: ±${spread} day${spread === 1 ? '' : 's'}.`);
  for (const c of stats.cycles.filter((x) => x.excluded).slice(-3)) {
    const why = c.reason === 'manual' ? 'you left it out' : c.reason === 'pregnancy' ? 'it overlaps a pregnancy' : c.reason === 'contraception' ? 'it was before you stopped hormonal birth control' : c.reason === 'postpartum' ? 'it was postpartum bleeding' : 'it looked unusual';
    notes.push(`Not counted: the ${c.length}-day cycle from ${short(c.start)} (${why}).`);
  }
  notes.push(...ctx.notes);

  const past = diffDays(range[1], now);
  const lateBy = past > 0 && diffDays(last.start, now) > 0 ? past : null;
  const lateDismissed = !!lateBy && settings.lateDismissedFor === next;
  const day = cycleDay ?? 0;
  let phase: Phase;
  if (day >= 1 && inPeriod) phase = 'menstrual';
  else if (ctx.fertileHidden || diffDays(fertile[0], now) < 0) phase = 'follicular';
  else if (diffDays(fertile[1], now) <= 0) phase = 'ovulation';
  else phase = 'luteal';
  return {
    stats,
    lastPeriodStart: last.start,
    cycleDay: day >= 1 ? day : null,
    phase,
    nextPeriodStart: next,
    nextPeriodRange: range,
    ovulationDate: ctx.fertileHidden ? null : ovulation,
    fertileWindow: ctx.fertileHidden ? null : fertile,
    daysUntilPeriod: diffDays(now, next),
    confidence,
    noForecast: null,
    notes,
    lateBy,
    lateDismissed,
    fertileHidden: ctx.fertileHidden,
  };
}

export type DayKind = 'period' | 'predicted-period' | 'fertile' | 'ovulation' | 'none';

/** Classify a calendar day for coloring (logged data wins over predictions). */
export function classifyDay(date: DateStr, logs: Map<DateStr, DayLog>, p: Prediction, settings: Settings): DayKind {
  const k = classifyRaw(date, logs, p, settings);
  return k === 'fertile' && settings.showFertileWindow === false ? 'none' : k;
}

/** 1-based cycle day for any date at or after the first logged period (null before it). */
export function cycleDayOf(date: DateStr, logs: DayLog[]): number | null {
  const starts = derivePeriods(logs).map((p) => p.start).filter((s) => s <= date);
  return starts.length ? diffDays(starts[starts.length - 1], date) + 1 : null;
}

function classifyRaw(date: DateStr, logs: Map<DateStr, DayLog>, p: Prediction, settings: Settings): DayKind {
  const log = logs.get(date);
  if (log && log.flow >= PERIOD_FLOW) return 'period';
  if (!p.nextPeriodStart || !p.lastPeriodStart) return 'none';
  // No predictions at or before the last logged period start; logs are the source of truth there.
  if (diffDays(p.lastPeriodStart, date) <= 0) return 'none';
  const cycleLen = p.stats.avgCycle;
  const periodLen = p.stats.avgPeriod;
  const luteal = clamp(settings.lutealLength, 10, 16);
  // Project six cycles ahead so scrolling the calendar forward stays useful.
  for (let i = 0; i < 6; i++) {
    const start = addDays(p.nextPeriodStart, i * cycleLen);
    const off = diffDays(start, date);
    if (off >= 0 && off < periodLen) return 'predicted-period';
    if (p.fertileHidden) continue;
    const ov = addDays(start, -luteal);
    if (date === ov) return 'ovulation';
    if (diffDays(addDays(ov, -5), date) >= 0 && diffDays(date, addDays(ov, 1)) >= 0) return 'fertile';
  }
  return 'none';
}
