import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, fmtSleep, series, type Bucket, type DateStr, type HealthMetric } from '@cyclo/core';
import { PressScale } from '../anim';
import { Chart } from '../charts';
import { fmtDay } from '../components';
import { useHealth } from '../health/store';
import { Icon, type IconName } from '../icons';
import { CountUp, MiniBars, STAGGER, Sparkline } from '../motion';
import { useNav } from '../nav';
import { cToDisplay, kgToDisplay } from '../store';
import { Text } from '../text';
import { colors, shadow, themed } from '../theme';
import { Btn, Muted, PillTabs, Segmented } from '../ui';
import { WidgetGrid, useWidgetData, type HealthTab } from '../widgets';
import { TabHeader } from './Today';

const TABS: [HealthTab, IconName, string][] = [
  ['overview', 'view-grid-outline', 'Overview'],
  ['activity', 'run', 'Activity'],
  ['sleep', 'weather-night', 'Sleep'],
  ['heart', 'heart-pulse', 'Heart'],
  ['body', 'human', 'Body'],
  ['water', 'cup-water', 'Water'],
];

interface MetricCfg {
  metric: HealthMetric; title: string; unit: string; kind: 'bar' | 'line'; color: string;
  display?: (v: number) => number; fmt?: (v: number) => string; decimals?: number; target?: number; yMin?: number; yMax?: number;
}

const RANGES: [Bucket, string, number][] = [['day', 'Days', 14], ['week', 'Weeks', 8], ['month', 'Months', 6]];

function MetricBlock({ cfg, date, delay = 0 }: { cfg: MetricCfg; date: DateStr; delay?: number }) {
  const d = useWidgetData();
  const [bucket, setBucket] = useState<Bucket>('day');
  const [phases, setPhases] = useState(true);
  const { width } = useWindowDimensions();
  const count = RANGES.find(([b]) => b === bucket)![2];
  const pts = useMemo(() => series(d.days, cfg.metric, date, count, bucket), [d.days, cfg.metric, date, count, bucket]);
  const show = (v: number | null) => (v == null ? null : cfg.display ? cfg.display(v) : v);
  const vals = pts.map((p) => show(p.value));
  const nums = vals.filter((v): v is number => v != null);
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  const today = show(d.days[date]?.[cfg.metric] as number | undefined ?? null);
  // The target is stored in source units (minutes, ml): convert it before it can stretch the axis.
  const target = cfg.target != null ? (cfg.display ? cfg.display(cfg.target) : cfg.target) : undefined;
  const lo = cfg.yMin ?? (nums.length ? Math.floor(Math.min(...nums) * 0.95) : 0);
  const hiRaw = cfg.yMax ?? (nums.length ? Math.max(...nums, target ?? 0) * 1.1 : 10);
  const hi = cfg.yMax ?? (hiRaw < 10 ? Math.ceil(hiRaw * 2) / 2 : Math.ceil(hiRaw));
  const markers = bucket === 'day' && phases ? pts.map((p, i) => {
    const k = d.kindOf(p.start);
    return k === 'period' ? { i, label: '', color: colors.period } : k === 'fertile' ? { i, label: '', color: colors.fertile } : k === 'ovulation' ? { i, label: 'Ov', color: colors.ovulation } : null;
  }).filter(Boolean) as { i: number; label: string; color: string }[] : [];
  const fmt = (v: number) => (cfg.fmt ? cfg.fmt(v) : `${v.toFixed(cfg.decimals ?? 0)} ${cfg.unit}`);
  return (
    <Reanimated.View entering={FadeInDown.delay(delay).springify().damping(18)} style={h.card}>
      <Text style={h.cardTitle}>{cfg.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        {today != null ? (cfg.fmt ? <Text style={h.hero}>{cfg.fmt(today)}</Text> : <><CountUp value={today} decimals={cfg.decimals ?? 0} style={h.hero} /><Text style={h.heroUnit}>{cfg.unit}</Text></>)
          : <Text style={[h.hero, { color: colors.muted }]}>– –</Text>}
      </View>
      <Text style={h.sub}>{date === d.today ? 'Today' : fmtDay(date)}{avg != null ? ` · average ${fmt(avg)}` : ''}</Text>
      <View style={{ alignItems: 'center', marginVertical: 14 }}>
        <Segmented options={RANGES.map(([b, l]) => [b, l] as [Bucket, string])} value={bucket} onChange={setBucket} />
      </View>
      <Chart kind={cfg.kind} points={vals.map((y, i) => ({ i, y }))} xLabels={pts.map((p) => p.label)} yMin={lo} yMax={hi} ticks={4}
        digits={hi < 10 ? 1 : 0} target={target}
        markers={markers} color={cfg.color} empty={!nums.length} height={Math.min(260, width * 0.6)} />
      {bucket === 'day' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
          <Text style={[h.sub, { marginRight: 10 }]}>Compare with</Text>
          <PressScale accessibilityRole="switch" accessibilityState={{ checked: phases }} accessibilityLabel="Show cycle phases on chart" onPress={() => setPhases(!phases)}
            style={[h.compare, phases && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Icon name={phases ? 'check' : 'plus'} size={16} color={colors.heading} />
            <Text style={{ marginLeft: 6, fontSize: 14, color: colors.heading, fontWeight: '600' }}>Cycle phases</Text>
          </PressScale>
        </View>
      )}
    </Reanimated.View>
  );
}

export function Health() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<HealthTab>(nav.healthTab ?? 'overview');
  useEffect(() => { if (nav.healthTab) setTab(nav.healthTab); }, [nav.healthTab, nav.healthKey]);
  const d = useWidgetData();
  const [date, setDate] = useState<DateStr>(d.today);
  const connections = useHealth((s) => s.connections);
  const sample = useHealth((s) => s.sample);
  const connected = Object.keys(connections).length > 0;

  const cfg: Record<Exclude<HealthTab, 'overview'>, MetricCfg[]> = {
    activity: [
      { metric: 'steps', title: 'Steps', unit: 'steps', kind: 'bar', color: colors.chart, target: 8000, yMin: 0 },
      { metric: 'distanceKm', title: 'Distance', unit: 'km', kind: 'bar', color: colors.fertile, decimals: 1, yMin: 0 },
      { metric: 'activeKcal', title: 'Active energy', unit: 'kcal', kind: 'bar', color: colors.pregnancy, yMin: 0 },
    ],
    sleep: [{ metric: 'sleepMin', title: 'Sleep time', unit: 'h', kind: 'bar', color: colors.ovulation, display: (v) => v / 60, decimals: 1, fmt: (v) => fmtSleep(v * 60), target: 480, yMin: 0 }],
    heart: [
      { metric: 'restingHr', title: 'Resting heart rate', unit: 'bpm', kind: 'line', color: colors.chartHi },
      { metric: 'spo2', title: 'Blood oxygen', unit: '%', kind: 'line', color: colors.water, yMin: 85, yMax: 100 },
      { metric: 'hrv', title: 'Heart-rate variability', unit: 'ms', kind: 'line', color: colors.ovulation },
    ],
    body: [
      { metric: 'weightKg', title: 'Weight', unit: d.wUnit, kind: 'line', color: colors.primary, display: (v) => kgToDisplay(v, d.wUnit), decimals: 1 },
      { metric: 'temperatureC', title: 'Temperature', unit: `°${d.unit}`, kind: 'line', color: colors.chartHi, display: (v) => cToDisplay(v, d.unit), decimals: 2 },
      { metric: 'tempDeviationC', title: 'Temperature vs your baseline', unit: `°${d.unit}`, kind: 'line', color: colors.period, display: (v) => (d.unit === 'F' ? v * 1.8 : v), decimals: 2 },
    ],
    water: [{ metric: 'waterMl', title: 'Water', unit: 'L', kind: 'bar', color: colors.water, display: (v) => v / 1000, decimals: 2, target: d.settings.waterTarget ?? 2250, yMin: 0 }],
  };

  const TABS: [HealthTab, string][] = [['overview', 'Overview'], ['activity', 'Activity'], ['sleep', 'Sleep'], ['heart', 'Heart'], ['body', 'Body'], ['water', 'Water']];
  const water = d.settings.waterTarget ?? 2250;
  const cards: OverviewDef[] = [
    { metric: 'steps', title: 'Steps', icon: 'shoe-print', kind: 'bar', color: colors.chart, target: 8000, fmt: (v) => Math.round(v).toLocaleString(), goal: '8,000', opens: 'activity' },
    { metric: 'sleepMin', title: 'Sleep', icon: 'weather-night', kind: 'bar', color: colors.ovulation, target: 480, fmt: (v) => fmtSleep(v), goal: '8 h', opens: 'sleep' },
    { metric: 'waterMl', title: 'Water', icon: 'water-outline', kind: 'bar', color: colors.water, target: water, fmt: (v) => (v >= 1000 ? `${+(v / 1000).toFixed(2)} L` : `${Math.round(v)} ml`), goal: `${+(water / 1000).toFixed(2)} L`, opens: 'water' },
    { metric: 'restingHr', title: 'Resting heart rate', icon: 'heart-outline', kind: 'line', color: colors.chartHi, fmt: (v) => `${Math.round(v)} bpm`, opens: 'heart' },
    { metric: 'weightKg', title: 'Weight', icon: 'scale-bathroom', kind: 'line', color: colors.primary, fmt: (v) => `${kgToDisplay(v, d.wUnit).toFixed(1)} ${d.wUnit}`, opens: 'body' },
    { metric: 'temperatureC', title: 'Temperature', icon: 'thermometer', kind: 'line', color: colors.chartHi, fmt: (v) => `${cToDisplay(v, d.unit).toFixed(2)} °${d.unit}`, opens: 'body' },
    { metric: 'spo2', title: 'Blood oxygen', icon: 'water-percent', kind: 'line', color: colors.water, fmt: (v) => `${Math.round(v)}%`, opens: 'heart' },
    { metric: 'hrv', title: 'Heart-rate variability', icon: 'heart-pulse', kind: 'line', color: colors.ovulation, fmt: (v) => `${Math.round(v)} ms`, opens: 'heart', optional: true },
    { metric: 'tempDeviationC', title: 'Temperature vs baseline', icon: 'thermometer', kind: 'line', color: colors.period, fmt: (v) => `${v >= 0 ? '+' : '−'}${Math.abs(d.unit === 'F' ? v * 1.8 : v).toFixed(2)} °${d.unit}`, opens: 'body', optional: true },
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' }} stickyHeaderIndices={[1]}>
      <TabHeader title="Health" onAvatar={() => nav.openSettings()}
        right={<PressScale accessibilityLabel="Health connections" onPress={() => nav.openConnections()} style={h.iconBtn}><Icon name="link-variant" size={26} color={colors.heading} /></PressScale>} />
      <View style={{ backgroundColor: colors.bg, paddingVertical: 8 }}>
        <PillTabs options={TABS} value={tab} onChange={setTab} />
      </View>
      {sample ? (
        <PressScale accessibilityRole="button" accessibilityLabel="Sample data is shown. Open connections" onPress={() => nav.openConnections()} style={h.sampleRow}>
          <Text style={h.sampleT}>Sample data</Text>
          <Icon name="info" size={16} color={colors.muted} />
        </PressScale>
      ) : null}
      {tab === 'overview' ? (
        <Reanimated.View key="overview" entering={FadeIn.duration(220)}>
          {!connected && (
            <Reanimated.View entering={FadeInDown.springify()} style={h.card}>
              <Text style={h.cardTitle}>Connect your health data</Text>
              <Text style={[h.sub, { color: colors.text, marginVertical: 6 }]}>Apple Health, Health Connect (Samsung Health, Fitbit, Google and more on Android) or your Fitbit account.</Text>
              <Btn icon="link-variant" title="Connect a tracker" onPress={() => nav.openConnections()} />
            </Reanimated.View>
          )}
          {cards.filter((c) => !c.optional || Object.values(d.days).some((x) => x[c.metric] != null)).map((c, i) => <OverviewCard key={c.metric} def={c} delay={i * STAGGER} onPress={() => setTab(c.opens)} />)}
        </Reanimated.View>
      ) : (
        <Reanimated.View key={tab} entering={FadeIn.duration(220)}>
          <View style={h.dayNav}>
            <PressScale accessibilityLabel="Previous day" onPress={() => setDate(addDays(date, -1))} style={h.iconBtn}><Icon name="chevron-left" size={24} color={colors.heading} /></PressScale>
            <View style={h.dayPill}><Text style={{ fontSize: 18, fontWeight: '600', color: colors.heading }}>{date === d.today ? 'Today' : fmtDay(date)}</Text></View>
            <PressScale accessibilityLabel="Next day" disabled={date >= d.today} onPress={() => setDate(addDays(date, 1))} style={[h.iconBtn, date >= d.today && { opacity: 0.3 }]}><Icon name="chevron-right" size={24} color={colors.heading} /></PressScale>
          </View>
          {cfg[tab].filter((c) => !['hrv', 'tempDeviationC'].includes(c.metric) || Object.values(d.days).some((x) => x[c.metric] != null)).map((c, i) => <MetricBlock key={c.metric} cfg={c} date={date} delay={i * STAGGER * 2} />)}
        </Reanimated.View>
      )}
    </ScrollView>
  );
}

interface OverviewDef {
  metric: HealthMetric; title: string; icon: IconName; kind: 'bar' | 'line'; color: string; target?: number; goal?: string;
  fmt: (v: number) => string; opens: Exclude<HealthTab, 'overview'>;
  /** Only shown when there is data (wearable-only metrics). */
  optional?: boolean;
}
const DAY1 = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Overview card: icon + label, today's value against its goal, and a 7-day mini chart. */
function OverviewCard({ def, onPress, delay }: { def: OverviewDef; onPress: () => void; delay: number }) {
  const d = useWidgetData();
  const { width } = useWindowDimensions();
  const pts = useMemo(() => series(d.days, def.metric, d.today, 7, 'day'), [d.days, def.metric, d.today]);
  const vals = pts.map((p) => p.value);
  const now = vals[vals.length - 1] ?? null;
  const last = now ?? [...vals].reverse().find((v) => v != null) ?? null;
  const inner = Math.min(width, 640) - 32 - 36;
  const nums = vals.filter((v): v is number => v != null);
  return (
    <Reanimated.View entering={FadeInDown.delay(delay).springify().damping(18)}>
      <PressScale accessibilityRole="button" accessibilityLabel={`${def.title}: ${last != null ? def.fmt(last) : 'no data'}`} onPress={onPress} scaleTo={0.98} style={h.ov}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name={def.icon} size={26} color={colors.heading} />
          <Text style={h.ovTitle}>{def.title}</Text>
          <Icon name="chevron-right" size={18} color={colors.muted} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
          <Text style={h.ovValue}>{last != null ? def.fmt(last) : '– –'}</Text>
          {def.goal ? <Text style={h.ovGoal}>  / {def.goal}</Text> : null}
          {now == null && last != null ? <Text style={h.ovGoal}>  · latest</Text> : null}
        </View>
        <View style={{ marginTop: 10 }}>
          {!nums.length ? <Text style={h.sub}>No data yet</Text> : def.kind === 'bar' ? (
            <MiniBars values={vals} width={inner} height={56} color={def.color} faint={colors.chartSoft} max={Math.max(def.target ?? 0, ...nums) * 1.05} />
          ) : (
            <Sparkline values={vals} width={inner} height={56} color={def.color} />
          )}
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {pts.map((p, i) => <Text key={i} style={[h.ovDay, i === pts.length - 1 && { color: colors.heading, fontWeight: '700' }]}>{DAY1[new Date(p.start + 'T12:00:00').getDay()]}</Text>)}
          </View>
        </View>
      </PressScale>
    </Reanimated.View>
  );
}

const h = themed(() => StyleSheet.create({
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sampleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 20, minHeight: 32 },
  sampleT: { fontSize: 14, color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 18, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardTitle: { fontSize: 19, fontWeight: '600', color: colors.heading },
  hero: { fontSize: 40, color: colors.heading, fontWeight: '800' },
  heroUnit: { fontSize: 18, color: colors.text, marginLeft: 6, marginBottom: 8 },
  sub: { fontSize: 15, color: colors.muted },
  compare: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tile },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginVertical: 8 },
  dayPill: { flex: 1, alignItems: 'center', backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 11, marginHorizontal: 8 },
  ov: { backgroundColor: colors.card, borderRadius: 24, padding: 18, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  ovTitle: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 10 },
  ovValue: { fontSize: 32, color: colors.heading, fontWeight: '600' },
  ovGoal: { fontSize: 16, color: colors.muted },
  ovDay: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted },
}));
