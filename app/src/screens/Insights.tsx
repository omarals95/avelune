import React, { useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, derivePeriods, describeSources, detectOvulation, diffDays, predict, today as todayFn, type DateStr, type DayLog } from '@avelune/core';
import { FadeIn, PressScale, useLoop } from '../anim';
import { PetalBackdrop } from '../petals';
import { labelOf } from '../catalog';
import { Chart, CycleBar, MiniBars, type Pt } from '../charts';
import { fmtShort } from '../components';
import { ARTICLES, DISCLAIMER } from '../content';
import { Icon, type IconName } from '../icons';
import { useNav, type ChartKind } from '../nav';
import { cToDisplay, kgToDisplay, selectLogs, selectSettings, useStore } from '../store';
import { colors, scheme, shadow, themed } from '../theme';
import { Btn, Muted, PillTabs, TopBar } from '../ui';
import { TabHeader } from './Today';

const REG = { unknown: 'Log 3+ cycles', regular: 'Regular', 'somewhat-irregular': 'Somewhat irregular', irregular: 'Irregular' } as const;

type InsTab = 'cycle' | 'trends' | 'patterns';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Insights() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const records = useStore((s) => s.records);
  const hideSex = useStore((s) => s.hideSex);
  const unit = useStore((s) => s.unit);
  const [tab, setTab] = useState<InsTab>('cycle');
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const today = todayFn();
  const p = predict(logs, settings, today);
  const periods = derivePeriods(logs);
  const recent = periods.slice(0, -1).map((x, i) => ({ start: x.start, len: diffDays(x.start, periods[i + 1].start) })).slice(-6);
  const count = (key: 'symptoms' | 'moods') => {
    const m = new Map<string, number>();
    for (const l of logs) for (const v of l[key]) if (v !== 'fine') m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  // Basal temperature across the current cycle, by cycle day.
  const cycleStart = p.lastPeriodStart;
  const cycleLen = cycleStart ? Math.max(p.stats.avgCycle, diffDays(cycleStart, today) + 1) : 0;
  const bbtPts: Pt[] = cycleStart ? Array.from({ length: cycleLen }, (_, i) => {
    const l = logs.find((x) => x.date === addDays(cycleStart, i));
    return { i, y: l?.bbt != null ? cToDisplay(l.bbt, unit) : null };
  }) : [];
  const bbtNums = bbtPts.map((x) => x.y).filter((v): v is number => v != null);
  const ovIdx = cycleStart && p.ovulationDate ? diffDays(cycleStart, p.ovulationDate) : -1;
  const tiles: { k: ChartKind; title: string; icon: IconName }[] = [
    { k: 'bbt', title: 'BBT and ovulation', icon: 'thermometer' },
    { k: 'weight', title: 'Weight', icon: 'scale-bathroom' },
    { k: 'activity', title: 'Activity', icon: 'shoe-sneaker' },
    { k: 'water', title: 'Water', icon: 'water-outline' },
    { k: 'sleep', title: 'Sleep', icon: 'sleep' },
    { k: 'cycles', title: 'Cycle history', icon: 'chart-bar' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PetalBackdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <TabHeader title="Insights" onAvatar={() => nav.openSettings()} />
        <View style={{ marginTop: 6, marginBottom: 6, paddingRight: 64 }}>
          <PillTabs fill options={[['cycle', 'Cycle'], ['trends', 'Trends'], ['patterns', 'Patterns']]} value={tab} onChange={setTab} />
        </View>

        {tab === 'cycle' && (
          <FadeIn key="cycle" style={{ paddingHorizontal: 16 }}>
            <Text style={is.section}>Your cycle</Text>
            <View style={is.statRow}>
              <Stat label="Average cycle" value={`${p.stats.avgCycle}`} unit="days" />
              <Stat label="Average period" value={`${p.stats.avgPeriod}`} unit="days" />
            </View>

            <PressScale accessibilityRole="button" accessibilityLabel="Recent cycle length" onPress={() => nav.openChart('cycles')} scaleTo={0.98} style={is.card}>
              <View style={is.cardHead}><Text style={is.cardT}>Recent cycle length</Text><Icon name="chevron-right" size={18} color={colors.muted} /></View>
              {recent.length ? (
                <>
                  <Text style={is.axis}>Days</Text>
                  <Chart kind="bar" valueLabels points={recent.map((r, i) => ({ i, y: r.len }))} xLabels={recent.map((r) => MON[+r.start.slice(5, 7) - 1])}
                    yMin={0} yMax={40} ticks={4} height={220} color={colors.chart} />
                </>
              ) : <Muted style={{ marginTop: 6 }}>Log at least two periods to see your cycle lengths.</Muted>}
            </PressScale>

            <PressScale accessibilityRole="button" accessibilityLabel="Basal temperature" onPress={() => nav.openChart('bbt')} scaleTo={0.98} style={is.card}>
              <View style={is.cardHead}><Text style={is.cardT}>Basal temperature</Text><Text style={is.axis}>°{unit}</Text><Icon name="chevron-right" size={18} color={colors.muted} /></View>
              {bbtNums.length ? (
                <Chart kind="line" points={bbtPts} xLabels={bbtPts.map((x) => `${x.i + 1}`)} digits={1} ticks={3} height={200} color={colors.chartHi}
                  yMin={Math.floor((Math.min(...bbtNums) - 0.2) * 2) / 2} yMax={Math.ceil((Math.max(...bbtNums) + 0.2) * 2) / 2}
                  markers={ovIdx >= 0 && ovIdx < cycleLen ? [{ i: ovIdx, label: 'Ov', color: colors.ovulation }] : []} />
              ) : <Muted style={{ marginTop: 6 }}>Log your basal temperature each morning to spot the rise after ovulation.</Muted>}
              {bbtNums.length ? <Text style={[is.axis, { textAlign: 'center', marginTop: 2 }]}>Cycle day</Text> : null}
            </PressScale>

            <View style={is.statRow}>
              <Stat label="Regularity" value={REG[p.stats.regularity]} small />
              <Stat label="Cycles logged" value={`${periods.length}`} />
            </View>
          </FadeIn>
        )}

        {tab === 'trends' && (
          <FadeIn key="trends" style={is.grid}>
            {tiles.map((t, i) => <Tile key={t.k} {...t} delay={i * 60} onPress={() => nav.openChart(t.k)} />)}
          </FadeIn>
        )}

        {tab === 'patterns' && (
          <FadeIn key="patterns" style={{ paddingHorizontal: 16 }}>
            {(['symptoms', 'moods'] as const).map((k) => {
              const top = count(k);
              return (
                <View key={k} style={is.card}>
                  <Text style={[is.cardT, { marginBottom: 10 }]}>Most logged {k}</Text>
                  {top.length ? top.map(([id, c]) => (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
                      <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{labelOf(id)}</Text>
                      <View style={{ height: 10, borderRadius: 5, backgroundColor: k === 'moods' ? colors.chart : colors.ovulation, width: Math.max(14, (c / top[0][1]) * 120), marginRight: 10 }} />
                      <Text style={{ width: 34, color: colors.muted, textAlign: 'right' }}>{c}×</Text>
                    </View>
                  )) : <Muted>Nothing logged yet.</Muted>}
                </View>
              );
            })}
            <Text style={is.section}>Learn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {ARTICLES.filter((a) => !(hideSex && a.sensitive)).map((a) => (
                <PressScale key={a.id} accessibilityLabel={a.title} onPress={() => nav.openArticle(a.id)} style={is.article}>
                  <View style={[is.articleDisc, { backgroundColor: scheme === 'dark' ? colors.tile : a.tint }]}>
                    <Icon name={a.icon} size={40} color={scheme === 'dark' ? colors.primary : a.ink} />
                  </View>
                  <Text style={is.articleT} numberOfLines={3}>{a.title}</Text>
                </PressScale>
              ))}
            </ScrollView>
            <Muted style={{ marginTop: 16 }}>{DISCLAIMER}</Muted>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <View style={is.stat} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}>
      <Text style={is.statL}>{label}</Text>
      <Text style={[is.statV, small && { fontSize: 20, marginTop: 10 }]} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      {unit ? <Text style={is.statU}>{unit}</Text> : null}
    </View>
  );
}

function Tile({ title, icon, onPress, delay }: { title: string; icon: IconName; onPress: () => void; delay: number }) {
  const bob = useLoop(2200, delay * 3);
  return (
    <PressScale accessibilityLabel={title} onPress={onPress} style={is.tile} scaleTo={0.96}>
      <View style={is.tileArt}>
        <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) }] }}><Icon name={icon} size={44} weight="light" color={colors.heading} /></Animated.View>
      </View>
      <Text style={is.tileT}>{title}</Text>
    </PressScale>
  );
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
          {cycles.length > 1 ? <Muted style={{ marginBottom: 16 }}>Cycles that look unusual, overlap a pregnancy or came before you stopped hormonal birth control are left out of your averages. Tap to change any of them.</Muted> : null}
          {[...cycles].reverse().map((c, i) => (
            <FadeIn key={c.start} delay={i * 60}>
              <CycleBar current={c.current} label={`${fmtShort(c.start)} – ${fmtShort(c.end)}`} length={diffDays(c.start, c.end) + 1} periodDays={c.periodDays} max={max} />
              {!c.current ? <CountToggle start={c.start} /> : null}
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
    // One estimate from temperature, LH tests and cervical mucus.
    const det = detectOvulation(by, cyc.start, days[days.length - 1]);
    const ov = det ? diffDays(cyc.start, det.date) : null;
    const idx = (d?: string) => (d ? diffDays(cyc.start, d) : -1);
    const markers = [
      ...days.map((d, i) => ((by.get(d)?.flow ?? 0) >= 2 ? { i, label: '', color: colors.period } : null)).filter(Boolean) as { i: number; label: string; color: string }[],
      ...days.map((d, i) => (by.get(d)?.tags.includes('tests:ovu-pos') ? { i, label: '', color: colors.fertile } : null)).filter(Boolean) as { i: number; label: string; color: string }[],
      ...days.map((d, i) => (by.get(d)?.tags.some((t) => t === 'discharge:egg-white' || t === 'discharge:watery') && i !== idx(det?.lhDate) ? { i, label: '', color: colors.water } : null)).filter(Boolean) as { i: number; label: string; color: string }[],
      ...(ov != null && ov >= 0 && ov < days.length ? [{ i: ov, label: det!.confirmed ? 'Ov' : 'Ov?', color: colors.ovulation }] : []),
    ];
    const vals = pts.map((x) => x.y).filter((v): v is number => v != null);
    const [lo, hi] = vals.length ? [Math.floor((Math.min(...vals) - 0.3) * 10) / 10, Math.ceil((Math.max(...vals) + 0.3) * 10) / 10] : unit === 'C' ? [35.8, 37.4] : [96.4, 99.4];
    headline = det
      ? det.confirmed ? `Ovulation confirmed ${fmtShort(det.date)} · by ${describeSources(det.sources)}` : `Ovulation likely ${fmtShort(det.date)} · from ${describeSources(det.sources)}`
      : null;
    chart = (
      <>
        <Chart kind="line" points={pts} yMin={lo} yMax={hi} ticks={6} digits={unit === 'C' ? 2 : 1} xLabels={xLabels} markers={markers} color={colors.ovulation}
          target={det?.coverline != null ? cToDisplay(det.coverline, unit) : undefined} targetLabel="Cover" empty={!pts.some((x) => x.y != null) && !det} height={420} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10, paddingHorizontal: 4 }}>
          {[[colors.period, 'Period'], [colors.fertile, 'Positive LH test'], [colors.water, 'Fertile mucus'], [colors.ovulation, 'Ovulation']].map(([c, l]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c, opacity: 0.6, marginRight: 6 }} /><Text style={{ fontSize: 13, color: colors.text }}>{l}</Text></View>
          ))}
        </View>
      </>
    );
  } else if (kind === 'weight') {
    const pts = series((l) => (l.weight == null ? undefined : kgToDisplay(l.weight, wUnit)));
    const vals = pts.map((x) => x.y).filter((v): v is number => v != null);
    const lo = vals.length ? Math.floor(Math.min(...vals) - 5) : wUnit === 'kg' ? 25 : 55;
    const hi = vals.length ? Math.ceil(Math.max(...vals) + 5) : wUnit === 'kg' ? 95 : 210;
    if (vals.length > 1) { const d = vals[vals.length - 1] - vals[0]; headline = `${d >= 0 ? '+' : ''}${d.toFixed(1)} ${wUnit} during the cycle`; }
    chart = <Chart kind="line" points={pts} yMin={lo} yMax={hi} ticks={7} digits={0} xLabels={xLabels} color={colors.period} empty={!vals.length} />;
  } else if (kind === 'water') {
    const pts = series((l) => (l.water ? l.water / 1000 : undefined));
    chart = <Chart kind="bar" points={pts} yMin={0} yMax={3.5} ticks={7} digits={1} target={(settings.waterTarget ?? 2250) / 1000} xLabels={xLabels} color={colors.water} empty={!pts.some((x) => x.y != null)} />;
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

const WHY: Record<string, string> = { unusual: 'looked unusual', pregnancy: 'overlaps a pregnancy', contraception: 'before stopping hormonal birth control', postpartum: 'postpartum bleeding', manual: 'you left it out' };

/** "Counted in averages" / "Not counted" with a one-tap override, per completed cycle. */
function CountToggle({ start }: { start: string }) {
  const records = useStore((s) => s.records);
  const updateSettings = useStore((s) => s.updateSettings);
  const settings = selectSettings(records);
  const info = predict(selectLogs(records), settings, todayFn()).stats.cycles.find((c) => c.start === start);
  if (!info) return null;
  const toggle = () => {
    const o = { ...(settings.cycleOverrides ?? {}) };
    const auto = !!info.reason && info.reason !== 'manual';
    if (info.excluded) { if (auto) o[start] = 'include'; else delete o[start]; }
    else if (auto) delete o[start]; else o[start] = 'exclude';
    updateSettings({ cycleOverrides: o });
  };
  return (
    <PressScale accessibilityRole="switch" accessibilityState={{ checked: !info.excluded }} accessibilityLabel={`Count the cycle from ${fmtShort(start)} in averages`} onPress={toggle}
      style={{ flexDirection: 'row', alignItems: 'center', marginTop: -14, marginBottom: 18, minHeight: 40 }}>
      <Icon name={info.excluded ? 'eye-off-outline' : 'check-circle'} size={18} color={info.excluded ? colors.muted : colors.fertile} />
      <Text style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.text }}>
        {info.excluded ? `Not counted · ${WHY[info.reason ?? 'manual']}` : info.reason ? `Counted (you included it; it ${WHY[info.reason]})` : 'Counted in averages'}
      </Text>
      <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '700' }}>{info.excluded ? 'Count it' : 'Leave out'}</Text>
    </PressScale>
  );
}

const is = themed(() => StyleSheet.create({
  section: { fontSize: 22, fontWeight: '700', color: colors.heading, marginTop: 14, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: { flex: 1, minHeight: 128, backgroundColor: colors.card, borderRadius: 22, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  statL: { color: colors.text, fontSize: 15 },
  statV: { fontSize: 44, fontWeight: '700', color: colors.heading, marginTop: 2 },
  statU: { fontSize: 16, color: colors.text, marginTop: -2 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardT: { flex: 1, fontSize: 19, fontWeight: '600', color: colors.heading },
  axis: { fontSize: 13, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 13, marginTop: 10 },
  tile: { width: '47%', margin: '1.5%', backgroundColor: colors.card, borderRadius: 22, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  tileT: { fontSize: 16, color: colors.heading, marginTop: 12, textAlign: 'center', fontWeight: '600' },
  tileArt: { width: 96, height: 84, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tile },
  article: { width: 168, minHeight: 190, borderRadius: 22, padding: 14, marginRight: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  articleDisc: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 14, alignSelf: 'center', marginTop: 6 },
  articleT: { fontSize: 16, fontWeight: '700', color: colors.heading, lineHeight: 21 },
  cyclePick: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
}));
