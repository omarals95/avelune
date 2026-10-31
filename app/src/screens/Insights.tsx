import React, { useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, derivePeriods, diffDays, predict, today as todayFn, type DateStr, type DayLog } from '@cyclo/core';
import { FadeIn, PressScale, useLoop } from '../anim';
import { labelOf } from '../catalog';
import { Chart, CycleBar, MiniBars, type Pt } from '../charts';
import { fmtShort } from '../components';
import { ARTICLES, DISCLAIMER } from '../content';
import { Icon, type IconName } from '../icons';
import { useNav, type ChartKind } from '../nav';
import { cToDisplay, kgToDisplay, selectLogs, selectSettings, useStore } from '../store';
import { colors, shadow } from '../theme';
import { Btn, Muted, TopBar } from '../ui';
import { Avatar } from './Today';

const REG = { unknown: 'Log 3+ cycles', regular: 'Regular', 'somewhat-irregular': 'Somewhat irregular', irregular: 'Irregular' } as const;

export function Insights() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const records = useStore((s) => s.records);
  const hideSex = useStore((s) => s.hideSex);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const p = predict(logs, settings, todayFn());
  const lengths = p.stats.cycleLengths.slice(-11);
  const count = (key: 'symptoms' | 'moods') => {
    const m = new Map<string, number>();
    for (const l of logs) for (const v of l[key]) if (v !== 'fine') m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  const tiles: { k: ChartKind; title: string; icon: IconName; tint: string; ink: string }[] = [
    { k: 'bbt', title: 'BBT and ovulation', icon: 'thermometer', tint: colors.ovulationSoft, ink: colors.ovulation },
    { k: 'weight', title: 'Weight', icon: 'scale-bathroom', tint: colors.primarySoft, ink: colors.period },
    { k: 'activity', title: 'Activity', icon: 'shoe-sneaker', tint: colors.fertileSoft, ink: colors.fertile },
    { k: 'water', title: 'Water', icon: 'cup-water', tint: '#E3EAF3', ink: '#3D5F8A' },
    { k: 'sleep', title: 'Sleep', icon: 'sleep', tint: colors.pregnancySoft, ink: colors.pregnancy },
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 150, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
        <Avatar onPress={() => nav.openSettings()} />
        <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', marginLeft: 14, color: colors.heading }}>Insights</Text>
      </View>

      <FadeIn style={{ paddingHorizontal: 20 }}>
        <View style={is.statRow}>
          <Stat label="Average cycle" value={`${p.stats.avgCycle}`} unit="days" color={colors.fertile} />
          <Stat label="Average period" value={`${p.stats.avgPeriod}`} unit="days" color={colors.period} />
        </View>
        <View style={[is.statRow, { marginTop: 0 }]}>
          <Stat label="Regularity" value={REG[p.stats.regularity]} color={colors.today} small />
          <Stat label="Cycles logged" value={`${derivePeriods(logs).length}`} color={colors.ovulation} />
        </View>
      </FadeIn>

      <Text style={is.section}>Graphs & reports</Text>
      <FadeIn delay={80}>
        <PressScale accessibilityLabel="Cycle duration" onPress={() => nav.openChart('cycles')} style={is.wide} scaleTo={0.98}>
          <Text style={is.tileT}>Cycle duration</Text>
          <MiniBars values={lengths.length ? [...lengths, p.cycleDay ?? 0] : [26, 22, 23, 28, 21, 26, 28, 31, 28, 23, 26]} highlight={lengths.length ? lengths.length : 7} />
        </PressScale>
        <View style={is.grid}>
          {tiles.map((t, i) => <Tile key={t.k} {...t} delay={i * 60} onPress={() => nav.openChart(t.k)} />)}
        </View>
      </FadeIn>

      {(['symptoms', 'moods'] as const).map((k) => {
        const top = count(k);
        return top.length ? (
          <FadeIn key={k} delay={160} style={is.card}>
            <Text style={is.cardT}>Most logged {k}</Text>
            {top.map(([id, c]) => (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{labelOf(id)}</Text>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: k === 'moods' ? '#7E5418' : '#7A4A86', width: Math.max(14, (c / top[0][1]) * 120), marginRight: 10 }} />
                <Text style={{ width: 34, color: colors.muted, textAlign: 'right' }}>{c}×</Text>
              </View>
            ))}
          </FadeIn>
        ) : null;
      })}

      <Text style={is.section}>Learn</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {ARTICLES.filter((a) => !(hideSex && a.sensitive)).map((a) => (
          <PressScale key={a.id} accessibilityLabel={a.title} onPress={() => nav.openArticle(a.id)} style={[is.article, { backgroundColor: a.tint }]}>
            <Icon name={a.icon} size={64} color={a.ink} style={{ alignSelf: 'center', marginVertical: 18 }} />
            <Text style={is.articleT}>{a.title}</Text>
          </PressScale>
        ))}
      </ScrollView>
      <Muted style={{ marginHorizontal: 20, marginTop: 16 }}>{DISCLAIMER}</Muted>
    </ScrollView>
  );
}

function Stat({ label, value, unit, color, small }: { label: string; value: string; unit?: string; color: string; small?: boolean }) {
  return (
    <View style={is.stat}>
      <View style={[is.statDot, { backgroundColor: color }]} />
      <Text style={is.statL}>{label}</Text>
      <Text style={[is.statV, small && { fontSize: 18, marginTop: 6 }]}>{value}{unit ? <Text style={{ fontSize: 15, fontWeight: '500', color: colors.muted }}> {unit}</Text> : null}</Text>
    </View>
  );
}

function Tile({ title, icon, tint, ink, onPress, delay }: { title: string; icon: IconName; tint: string; ink: string; onPress: () => void; delay: number }) {
  const bob = useLoop(2200, delay * 3);
  return (
    <PressScale accessibilityLabel={title} onPress={onPress} style={[is.tile]} scaleTo={0.96}>
      <Text style={is.tileT}>{title}</Text>
      <View style={[is.tileArt, { backgroundColor: tint }]}>
        <View style={{ transform: [{ translateY: 0 }] }}>
          <AnimatedIcon icon={icon} color={ink} v={bob} />
        </View>
      </View>
    </PressScale>
  );
}
function AnimatedIcon({ icon, color, v }: { icon: IconName; color: string; v: ReturnType<typeof useLoop> }) {
  return <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }] }}><Icon name={icon} size={60} color={color} /></Animated.View>;
}

/* ---------------------------- chart detail ---------------------------- */

interface Cycle { start: DateStr; end: DateStr; periodDays: number; current: boolean }

export function cyclesOf(logs: DayLog[], today: DateStr): Cycle[] {
  const ps = derivePeriods(logs);
  return ps.map((p, i) => ({
    start: p.start,
    end: i + 1 < ps.length ? addDays(ps[i + 1].start, -1) : today > p.end ? today : p.end,
    periodDays: p.length,
    current: i === ps.length - 1,
  }));
}

/** "3 over 6" rule: the first day where 3 temperatures in a row exceed the previous 6 marks the shift; ovulation ≈ day before. */
export function detectOvulation(temps: (number | null)[]): number | null {
  for (let i = 6; i + 2 < temps.length; i++) {
    const prev = temps.slice(i - 6, i).filter((t): t is number => t != null);
    const next = temps.slice(i, i + 3);
    if (prev.length >= 4 && next.every((t) => t != null && t > Math.max(...prev))) return i - 1;
  }
  return null;
}

const TITLES: Record<ChartKind, string> = { cycles: 'Cycle length', bbt: 'Chart', weight: 'Weight', activity: 'Activity', water: 'Water', sleep: 'Sleep' };

export function ChartScreen({ kind, onClose }: { kind: ChartKind; onClose: () => void }) {
  const nav = useNav();
  const records = useStore((s) => s.records);
  const unit = useStore((s) => s.unit);
  const wUnit = useStore((s) => s.weightUnit);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const today = todayFn();
  const cycles = useMemo(() => cyclesOf(logs, today), [logs, today]);
  const [ci, setCi] = useState(Math.max(0, cycles.length - 1));
  const cyc = cycles[ci] ?? { start: addDays(today, -27), end: today, periodDays: 0, current: true };
  const p = predict(logs, settings, today);

  if (kind === 'cycles') {
    const max = Math.max(35, ...cycles.map((c) => diffDays(c.start, c.end) + 1));
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title={TITLES.cycles} onBack={onClose} />
        <ScrollView contentContainerStyle={{ padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          {cycles.length === 0 && <Muted>No cycles logged yet.</Muted>}
          {[...cycles].reverse().map((c, i) => (
            <FadeIn key={c.start} delay={i * 60}>
              <CycleBar current={c.current} label={`${fmtShort(c.start)} – ${fmtShort(c.end)}`} length={diffDays(c.start, c.end) + 1} periodDays={c.periodDays} max={max} />
            </FadeIn>
          ))}
          <Btn kind="ghost" title="Add previous periods" onPress={() => { onClose(); nav.openCalendar(true); }} />
          {p.stats.cycleLengths.length > 0 && <Muted style={{ marginTop: 10 }}>Average cycle {p.stats.avgCycle} days · average period {p.stats.avgPeriod} days.</Muted>}
        </ScrollView>
      </View>
    );
  }

  // Daily series for the chosen cycle, extended to at least the average length so predictions fit.
  const len = Math.max(diffDays(cyc.start, cyc.end) + 1, cyc.current ? p.stats.avgCycle : 0);
  const days = Array.from({ length: len }, (_, i) => addDays(cyc.start, i));
  const by = new Map(logs.map((l) => [l.date, l]));
  const series = (f: (l: DayLog) => number | undefined): Pt[] => days.map((d, i) => ({ i, y: by.get(d) ? f(by.get(d)!) ?? null : null }));
  const xLabels = days.map((d) => String(+d.slice(8)));
  let chart: React.ReactNode;
  let headline: string | null = null;

  if (kind === 'bbt') {
    const pts = series((l) => (l.bbt == null ? undefined : cToDisplay(l.bbt, unit)));
    const ov = detectOvulation(pts.map((x) => x.y));
    const markers = [
      ...(ov != null ? [{ i: ov, label: 'Ovul.', color: colors.ovulation }] : []),
      ...days.map((d, i) => ((by.get(d)?.flow ?? 0) >= 2 ? { i, label: '', color: colors.period } : null)).filter(Boolean) as { i: number; label: string; color: string }[],
    ];
    const [lo, hi] = unit === 'C' ? [35, 38.5] : [95, 101.3];
    headline = ov != null ? `Temperature shift detected · ovulation ≈ ${fmtShort(days[ov])}` : null;
    chart = <Chart kind="line" points={pts} yMin={lo} yMax={hi} ticks={7} digits={unit === 'C' ? 2 : 1} xLabels={xLabels} markers={markers} color={colors.ovulation} empty={!pts.some((x) => x.y != null)} height={420} />;
  } else if (kind === 'weight') {
    const pts = series((l) => (l.weight == null ? undefined : kgToDisplay(l.weight, wUnit)));
    const vals = pts.map((x) => x.y).filter((v): v is number => v != null);
    const lo = vals.length ? Math.floor(Math.min(...vals) - 5) : wUnit === 'kg' ? 25 : 55;
    const hi = vals.length ? Math.ceil(Math.max(...vals) + 5) : wUnit === 'kg' ? 95 : 210;
    if (vals.length > 1) { const d = vals[vals.length - 1] - vals[0]; headline = `${d >= 0 ? '+' : ''}${d.toFixed(1)} ${wUnit} during the cycle`; }
    chart = <Chart kind="line" points={pts} yMin={lo} yMax={hi} ticks={7} digits={0} xLabels={xLabels} color={colors.period} empty={!vals.length} />;
  } else if (kind === 'water') {
    const pts = series((l) => (l.water ? l.water / 1000 : undefined));
    chart = <Chart kind="bar" points={pts} yMin={0} yMax={3.5} ticks={7} digits={1} target={(settings.waterTarget ?? 2250) / 1000} xLabels={xLabels} color="#3D5F8A" empty={!pts.some((x) => x.y != null)} />;
    headline = `Target ${((settings.waterTarget ?? 2250) / 1000).toFixed(2)} L a day`;
  } else if (kind === 'sleep') {
    const pts = series((l) => l.sleep);
    chart = <Chart kind="bar" points={pts} yMin={0} yMax={12} ticks={6} target={8} xLabels={xLabels} color={colors.pregnancy} empty={!pts.some((x) => x.y != null)} />;
  } else {
    const pts = series((l) => l.distance);
    const total = pts.reduce((a, b) => a + (b.y ?? 0), 0);
    headline = `${total.toFixed(1)} km during the cycle`;
    chart = <Chart kind="bar" points={pts} yMin={0} yMax={Math.max(10, Math.ceil(Math.max(0, ...pts.map((x) => x.y ?? 0)) / 2) * 2 + 2)} ticks={5} target={5} xLabels={xLabels} color={colors.fertile} empty={!total} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={TITLES[kind]} onBack={onClose} right={<Text style={{ fontWeight: '700', color: colors.text, marginRight: 8 }}>{kind === 'bbt' ? `°${unit}` : kind === 'weight' ? wUnit : ''}</Text>} />
      <ScrollView contentContainerStyle={{ paddingVertical: 12, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <View style={is.cyclePick}>
          <PressScale accessibilityLabel="Previous cycle" onPress={() => setCi(Math.max(0, ci - 1))} style={{ padding: 8, opacity: ci > 0 ? 1 : 0.2 }}><Icon name="chevron-left" size={28} color={colors.text} /></PressScale>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Chosen cycle</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{fmtShort(cyc.start)} — {fmtShort(addDays(cyc.start, len - 1))}</Text>
          </View>
          <PressScale accessibilityLabel="Next cycle" onPress={() => setCi(Math.min(cycles.length - 1, ci + 1))} style={{ padding: 8, opacity: ci < cycles.length - 1 ? 1 : 0.2 }}><Icon name="chevron-right" size={28} color={colors.text} /></PressScale>
        </View>
        {headline ? <Text style={{ textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>{headline}</Text> : null}
        <View style={{ paddingRight: 8 }}>{chart}</View>
        {kind === 'bbt' && <Muted style={{ margin: 20 }}>A sustained rise of roughly 0.2–0.5 °C usually follows ovulation. Shaded pink columns are period days.</Muted>}
      </ScrollView>
    </View>
  );
}

const is = StyleSheet.create({
  section: { fontSize: 22, fontWeight: '700', color: colors.heading, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, ...shadow },
  statDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  statL: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  statV: { fontSize: 30, fontWeight: '800', color: colors.heading, marginTop: 2 },
  wide: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 20, padding: 18, alignItems: 'center', marginBottom: 6, ...shadow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 17 },
  tile: { width: '47%', margin: '1.5%', backgroundColor: colors.card, borderRadius: 20, padding: 16, alignItems: 'center', ...shadow },
  tileT: { fontSize: 19, color: colors.text, marginBottom: 12, textAlign: 'center' },
  tileArt: { width: 110, height: 90, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginHorizontal: 20, marginTop: 16, ...shadow },
  cardT: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  article: { width: 170, height: 200, borderRadius: 20, padding: 14, marginRight: 12, justifyContent: 'space-between' },
  articleT: { fontSize: 16, fontWeight: '700', color: colors.text },
  cyclePick: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
});
