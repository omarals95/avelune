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
import { CountUp, STAGGER } from '../motion';
import { useNav } from '../nav';
import { cToDisplay, kgToDisplay } from '../store';
import { Text } from '../text';
import { colors, shadow } from '../theme';
import { Btn, Muted, Segmented } from '../ui';
import { WidgetGrid, useWidgetData, type HealthTab } from '../widgets';
import { Avatar } from './Today';

const TABS: [HealthTab, IconName, string][] = [
  ['overview', 'view-grid-outline', 'Overview'],
  ['activity', 'run', 'Activity'],
  ['sleep', 'weather-night', 'Sleep'],
  ['heart', 'heart-pulse', 'Heart'],
  ['body', 'human', 'Body'],
  ['water', 'cup-water', 'Water'],
];

/** Samsung-style segmented icon bar with a sliding highlight pill. */
function IconNav({ tab, onChange }: { tab: HealthTab; onChange: (t: HealthTab) => void }) {
  const [w, setW] = useState(0);
  const idx = TABS.findIndex(([k]) => k === tab);
  const x = useSharedValue(0);
  const reduce = useReducedMotion();
  const seg = w / TABS.length;
  useEffect(() => { x.value = reduce ? idx * seg : withSpring(idx * seg, { damping: 18, stiffness: 180 }); }, [idx, seg, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={h.nav} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 && <Reanimated.View style={[h.navPill, { width: seg }, pill]} />}
      {TABS.map(([k, icon, label]) => (
        <PressScale key={k} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === k }} onPress={() => onChange(k)} style={h.navBtn}>
          <Icon name={icon} size={26} color={tab === k ? colors.white : colors.heading} />
        </PressScale>
      ))}
    </View>
  );
}

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
            style={[h.compare, phases && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Icon name={phases ? 'check' : 'plus'} size={16} color={phases ? '#fff' : colors.heading} />
            <Text style={{ marginLeft: 6, fontSize: 14, color: phases ? '#fff' : colors.heading, fontWeight: '600' }}>Cycle phases</Text>
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
      { metric: 'steps', title: 'Steps', unit: 'steps', kind: 'bar', color: colors.fertile, target: 8000, yMin: 0 },
      { metric: 'distanceKm', title: 'Distance', unit: 'km', kind: 'bar', color: colors.fertile, decimals: 1, yMin: 0 },
      { metric: 'activeKcal', title: 'Active energy', unit: 'kcal', kind: 'bar', color: colors.pregnancy, yMin: 0 },
    ],
    sleep: [{ metric: 'sleepMin', title: 'Sleep time', unit: 'h', kind: 'bar', color: colors.ovulation, display: (v) => v / 60, decimals: 1, fmt: (v) => fmtSleep(v * 60), target: 480, yMin: 0 }],
    heart: [
      { metric: 'restingHr', title: 'Resting heart rate', unit: 'bpm', kind: 'line', color: colors.period },
      { metric: 'spo2', title: 'Blood oxygen', unit: '%', kind: 'line', color: '#3D5F8A', yMin: 85, yMax: 100 },
    ],
    body: [
      { metric: 'weightKg', title: 'Weight', unit: d.wUnit, kind: 'line', color: colors.primary, display: (v) => kgToDisplay(v, d.wUnit), decimals: 1 },
      { metric: 'temperatureC', title: 'Temperature', unit: `°${d.unit}`, kind: 'line', color: colors.heading, display: (v) => cToDisplay(v, d.unit), decimals: 2 },
    ],
    water: [{ metric: 'waterMl', title: 'Water', unit: 'L', kind: 'bar', color: '#3D5F8A', display: (v) => v / 1000, decimals: 2, target: d.settings.waterTarget ?? 2250, yMin: 0 }],
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 150, maxWidth: 640, width: '100%', alignSelf: 'center' }} stickyHeaderIndices={[1]}>
      <View style={h.header}>
        <Avatar onPress={() => nav.openSettings()} />
        <Text style={h.title} accessibilityRole="header">Health</Text>
        <PressScale accessibilityLabel="Health connections" onPress={() => nav.openConnections()} style={h.iconBtn}><Icon name="link-variant" size={26} color={colors.heading} /></PressScale>
      </View>
      <View style={{ backgroundColor: colors.bg, paddingHorizontal: 20, paddingVertical: 8 }}>
        <IconNav tab={tab} onChange={setTab} />
      </View>

      {tab === 'overview' ? (
        <Reanimated.View key="overview" entering={FadeIn.duration(220)}>
          <Text style={h.intro}>{connected ? 'Your health at a glance, alongside your cycle.' : 'See steps, sleep, heart, weight and temperature next to your cycle. Connect a tracker, or log water, weight, sleep and temperature in Avelune.'}</Text>
          {!connected && (
            <Reanimated.View entering={FadeInDown.springify()} style={[h.card, { backgroundColor: colors.ovulationSoft }]}>
              <Text style={h.cardTitle}>Connect your health data</Text>
              <Text style={[h.sub, { color: colors.text, marginVertical: 6 }]}>Apple Health, Health Connect (Samsung Health, Fitbit, Google and more on Android) or your Fitbit account.</Text>
              <Btn icon="link-variant" title="Connect a tracker" onPress={() => nav.openConnections()} />
            </Reanimated.View>
          )}
          {sample && <Text style={[h.sub, { marginHorizontal: 20, marginBottom: 8 }]}>Showing sample data. Turn it off in Connections.</Text>}
          <WidgetGrid ids={['steps', 'sleep', 'heart', 'water', 'activity', 'weight', 'temperature', 'oxygen']}
            onOpen={(def) => def.opens && setTab(def.opens)} />
        </Reanimated.View>
      ) : (
        <Reanimated.View key={tab} entering={FadeIn.duration(220)}>
          <View style={h.dayNav}>
            <PressScale accessibilityLabel="Previous day" onPress={() => setDate(addDays(date, -1))} style={h.iconBtn}><Icon name="chevron-left" size={28} color={colors.heading} /></PressScale>
            <View style={h.dayPill}><Text style={{ fontSize: 20, fontWeight: '700', color: colors.heading }}>{date === d.today ? 'Today' : fmtDay(date)}</Text></View>
            <PressScale accessibilityLabel="Next day" disabled={date >= d.today} onPress={() => setDate(addDays(date, 1))} style={[h.iconBtn, date >= d.today && { opacity: 0.3 }]}><Icon name="chevron-right" size={28} color={colors.heading} /></PressScale>
          </View>
          {cfg[tab].map((c, i) => <MetricBlock key={c.metric} cfg={c} date={date} delay={i * STAGGER * 2} />)}
          <Text style={[h.cardTitle, { marginHorizontal: 20, marginTop: 8 }]}>Other data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 10 }}>
            {TABS.filter(([k]) => k !== tab && k !== 'overview').map(([k, icon, label]) => (
              <PressScale key={k} accessibilityLabel={label} onPress={() => setTab(k)} style={h.other}>
                <Icon name={icon} size={30} color={colors.heading} />
                <Text style={{ marginTop: 8, fontSize: 15, color: colors.heading, fontWeight: '600' }}>{label}</Text>
              </PressScale>
            ))}
          </ScrollView>
        </Reanimated.View>
      )}
    </ScrollView>
  );
}

const h = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 6 },
  title: { flex: 1, fontSize: 28, fontWeight: '700', color: colors.heading, marginLeft: 14 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border, ...shadow, shadowOpacity: 0.05 },
  navPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999, backgroundColor: colors.primary },
  navBtn: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  intro: { fontSize: 16, color: colors.text, marginHorizontal: 20, marginVertical: 12, lineHeight: 23 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 18, marginHorizontal: 20, marginBottom: 14, ...shadow },
  cardTitle: { fontSize: 19, fontWeight: '700', color: colors.heading },
  hero: { fontSize: 44, color: colors.heading, fontWeight: '800' },
  heroUnit: { fontSize: 18, color: colors.text, marginLeft: 6, marginBottom: 8 },
  sub: { fontSize: 15, color: colors.muted },
  compare: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 10 },
  dayPill: { flex: 1, alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 999, paddingVertical: 12, marginHorizontal: 8 },
  other: { width: 120, height: 104, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow },
});
