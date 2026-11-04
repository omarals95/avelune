import React, { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeInDown, LinearTransition, ZoomOut } from 'react-native-reanimated';
import {
  addDays, classifyDay, derivePeriods, fmtSleep, latest, predict, series, today as todayFn, type DateStr, type DayLog, type HealthDay,
} from '@avelune/core';
import { PressScale } from './anim';
import { labelOf } from './catalog';
import { CountUp, Glass, MiniBars, Ring, STAGGER, Sparkline } from './motion';
import { DEFAULT_WIDGETS, useHealth, withManual, type WidgetId } from './health/store';
import { Icon, type IconName } from './icons';
import { cToDisplay, kgToDisplay, selectLogs, selectSettings, useStore } from './store';
import { Text } from './text';
import { colors, shadow, themed } from './theme';
import { Btn, Muted, Sheet, TopBar } from './ui';

export type HealthTab = 'overview' | 'activity' | 'sleep' | 'heart' | 'body' | 'water';

export interface WidgetDef {
  id: WidgetId;
  title: string;
  icon: IconName;
  size: 'half' | 'full';
  /** Health tab it opens. */
  opens?: HealthTab;
  /** Tile colour variant (brand soft backgrounds). */
  tint?: string;
  describe: string;
}

export const WIDGETS: Record<WidgetId, WidgetDef> = themed(() => ({
  cycleStats: { id: 'cycleStats', title: 'Cycle statistics', icon: 'chart-donut', size: 'full', describe: 'Period length, cycle variation and cycle length' },
  nextPeriod: { id: 'nextPeriod', title: 'Next period', icon: 'calendar-heart', size: 'half', tint: colors.periodSoft, describe: 'Countdown ring to your next period' },
  steps: { id: 'steps', title: 'Steps', icon: 'shoe-print', size: 'half', opens: 'activity', describe: 'Today’s steps and the last 7 days' },
  sleep: { id: 'sleep', title: 'Sleep', icon: 'weather-night', size: 'half', opens: 'sleep', tint: colors.ovulationSoft, describe: 'Last night and the past week' },
  heart: { id: 'heart', title: 'Heart rate', icon: 'heart-pulse', size: 'half', opens: 'heart', describe: '14-day trend' },
  weight: { id: 'weight', title: 'Weight', icon: 'scale-bathroom', size: 'half', opens: 'body', describe: '30-day trend' },
  temperature: { id: 'temperature', title: 'Temperature & cycle', icon: 'thermometer', size: 'full', opens: 'body', describe: 'BBT or skin temperature with your cycle phases' },
  water: { id: 'water', title: 'Water', icon: 'cup-water', size: 'half', opens: 'water', tint: colors.waterSoft, describe: 'Today against your target' },
  activity: { id: 'activity', title: 'Activity', icon: 'run', size: 'half', opens: 'activity', tint: colors.fertileSoft, describe: 'Distance and active calories' },
  mood: { id: 'mood', title: 'Mood this cycle', icon: 'emoticon-outline', size: 'half', tint: colors.pregnancySoft, describe: 'Your most-logged moods' },
  symptoms: { id: 'symptoms', title: 'Top symptoms', icon: 'chart-bar', size: 'half', describe: 'Most-logged symptoms this cycle' },
  oxygen: { id: 'oxygen', title: 'Blood oxygen', icon: 'water-percent', size: 'half', opens: 'heart', describe: 'Latest SpO₂ reading' },
}));

/** Shared data for every widget, computed once per render of the grid. */
export function useWidgetData() {
  const records = useStore((s) => s.records);
  const unit = useStore((s) => s.unit);
  const wUnit = useStore((s) => s.weightUnit);
  const synced = useHealth((s) => s.days);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const today = todayFn();
  const days = useMemo(() => withManual(synced, logs), [synced, logs]);
  const p = useMemo(() => predict(logs, settings, today), [logs, settings, today]);
  const map = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  return { logs, settings, today, days, p, map, unit, wUnit, kindOf: (d: DateStr) => classifyDay(d, map, p, settings) };
}
type WD = ReturnType<typeof useWidgetData>;

function Tile({ def, children, onPress, edit, wide }: { def: WidgetDef; children: React.ReactNode; onPress?: () => void; edit?: React.ReactNode; wide: boolean }) {
  // Half tiles share one fixed height so the grid stays even while values load and animate.
  const style = [w.tile, wide ? { minHeight: 0 } : { height: edit ? 248 : 192 }];
  const body = (
    <>
      <View style={w.head}>
        <View style={[w.disc, { backgroundColor: def.tint ?? colors.tile }]}><Icon name={def.icon} size={18} color={colors.heading} /></View>
        <Text style={w.title} numberOfLines={1} maxFontSizeMultiplier={1.2}>{def.title}</Text>
        {onPress ? <Icon name="chevron-right" size={16} color={colors.muted} /> : null}
      </View>
      {children}
      {edit}
    </>
  );
  // A disabled Pressable would also disable the edit controls nested inside it, so non-tappable tiles are plain views.
  if (!onPress) return <View style={style} accessibilityLabel={`${def.title} widget`}>{body}</View>;
  return <PressScale accessibilityRole="button" accessibilityLabel={`${def.title} widget`} onPress={onPress} scaleTo={0.97} style={style}>{body}</PressScale>;
}

const Empty = ({ text = 'No data yet' }: { text?: string }) => <Muted style={{ marginTop: 10, color: colors.text }}>{text}. Tap to add.</Muted>;

function Body({ id, d, width }: { id: WidgetId; d: WD; width: number }) {
  const inner = width - 32;
  const t = d.today;
  switch (id) {
    case 'cycleStats': {
      const s = d.p.stats;
      const variation = Math.round(s.variability);
      const items: [string, number, number, string, string][] = [
        ['Period length', s.avgPeriod, s.avgPeriod / 10, colors.period, colors.periodSoft],
        ['Cycle variation', variation, Math.min(1, variation / 10), colors.fertile, colors.fertileSoft],
        ['Cycle length', s.avgCycle, s.avgCycle / 45, colors.ovulation, colors.ovulationSoft],
      ];
      const size = Math.min(96, (inner - 24) / 3);
      return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          {items.map(([label, v, prog, c, tr], i) => (
            <View key={label} style={{ alignItems: 'center', width: size + 8 }}>
              <Ring progress={prog} size={size} stroke={9} color={c} track={tr} delay={i * 120}>
                <CountUp value={v} style={{ fontSize: 22, color: colors.heading }} delay={i * 120} />
                <Text style={{ fontSize: 12, color: colors.muted }}>days</Text>
              </Ring>
              <Text style={{ fontSize: 13, color: colors.text, marginTop: 6, textAlign: 'center' }}>{label}</Text>
            </View>
          ))}
        </View>
      );
    }
    case 'nextPeriod': {
      const n = d.p.daysUntilPeriod;
      if (d.p.noForecast && d.p.lastPeriodStart) return <Muted style={{ marginTop: 10, color: colors.text }}>No forecast right now.</Muted>;
      if (n == null) return <Empty text="Log a period to see this" />;
      if (n < 0) {
        const late = d.p.lateBy && !d.p.lateDismissed;
        return (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Ring progress={1} size={Math.min(110, inner)} stroke={10} color={late ? colors.faint : colors.period} track={colors.tile}>
              <Text style={{ fontSize: 15, color: colors.heading, fontWeight: '700', textAlign: 'center' }}>{late ? `${d.p.lateBy} days past` : 'Any day'}</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>{late ? 'the window' : 'now'}</Text>
            </Ring>
          </View>
        );
      }
      const prog = 1 - Math.max(0, Math.min(1, n / d.p.stats.avgCycle));
      return (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Ring progress={prog} size={Math.min(110, inner)} stroke={10} color={colors.period} track={colors.tile}>
            <CountUp value={Math.abs(n)} style={{ fontSize: 30, color: colors.heading }} />
            <Text style={{ fontSize: 12, color: colors.text }}>{n === 1 ? 'day' : 'days'}</Text>
          </Ring>
        </View>
      );
    }
    case 'steps': {
      const v = d.days[t]?.steps ?? latest(d.days, 'steps', t, 1)?.value;
      const s = series(d.days, 'steps', t, 7).map((x) => x.value);
      if (v == null && !s.some((x) => x != null)) return <Empty />;
      const goal = 8000;
      return (
        <View>
          <CountUp value={v ?? 0} style={w.big} />
          <Text style={w.unit} numberOfLines={1} maxFontSizeMultiplier={1.2}>of {goal.toLocaleString('en-US')} steps</Text>
          <View style={w.track}><View style={[w.fill, { width: `${Math.min(100, ((v ?? 0) / goal) * 100)}%`, backgroundColor: colors.fertile }]} /></View>
          <View style={{ marginTop: 10 }}><MiniBars values={s} width={inner} height={40} color={colors.fertile} faint={colors.border} /></View>
        </View>
      );
    }
    case 'sleep': {
      const last = latest(d.days, 'sleepMin', t, 3);
      const s = series(d.days, 'sleepMin', t, 7).map((x) => x.value);
      if (!last) return <Empty />;
      const day = d.days[last.date];
      const clock = (m?: number) => { if (m == null) return ''; const mm = ((m % 1440) + 1440) % 1440; const h = Math.floor(mm / 60); return `${h % 12 || 12}:${String(mm % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
      return (
        <View>
          <Text style={w.big}>{fmtSleep(last.value)}</Text>
          {day?.sleepStart != null ? <Text style={w.unit} numberOfLines={1} maxFontSizeMultiplier={1.2}>{clock(day.sleepStart)} – {clock(day.sleepEnd)}</Text> : <Text style={w.unit} numberOfLines={1} maxFontSizeMultiplier={1.2}>last night</Text>}
          <View style={{ marginTop: 10 }}><MiniBars values={s} width={inner} height={40} color={colors.ovulation} faint={colors.tile} max={600} /></View>
        </View>
      );
    }
    case 'heart': {
      const l = latest(d.days, 'restingHr', t, 7);
      const s = series(d.days, 'restingHr', t, 14).map((x) => x.value);
      if (!l) return <Empty />;
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><CountUp value={l.value} style={w.big} /><Text style={[w.unit, { marginLeft: 4, marginBottom: 6 }]}>bpm resting</Text></View>
          <Sparkline values={s} width={inner} height={46} color={colors.period} />
        </View>
      );
    }
    case 'weight': {
      const l = latest(d.days, 'weightKg', t, 60);
      const s = series(d.days, 'weightKg', t, 30).map((x) => (x.value == null ? null : kgToDisplay(x.value, d.wUnit)));
      if (!l) return <Empty />;
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><CountUp value={kgToDisplay(l.value, d.wUnit)} decimals={1} style={w.big} /><Text style={[w.unit, { marginLeft: 4, marginBottom: 6 }]}>{d.wUnit}</Text></View>
          <Sparkline values={s} width={inner} height={46} color={colors.primary} />
        </View>
      );
    }
    case 'temperature': {
      const N = 35;
      const s = series(d.days, 'temperatureC', t, N);
      const vals = s.map((x) => (x.value == null ? null : cToDisplay(x.value, d.unit)));
      if (!vals.some((v) => v != null)) return <Empty text="Log BBT or connect a tracker with temperature" />;
      const H = 90;
      return (
        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', height: H, position: 'absolute', left: 0, right: 0, top: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {s.map((x) => { const k = d.kindOf(x.start); return <View key={x.start} style={{ flex: 1, backgroundColor: k === 'period' ? colors.periodSoft : k === 'fertile' ? colors.fertileSoft : k === 'ovulation' ? colors.ovulationSoft : 'transparent' }} />; })}
          </View>
          <Sparkline values={vals} width={inner} height={H} color={colors.heading} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {[['Period', colors.periodSoft], ['Fertile', colors.fertileSoft], ['Ovulation', colors.ovulationSoft]].map(([l, c]) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c, marginRight: 6, borderWidth: 1, borderColor: colors.border }} /><Text style={{ fontSize: 12, color: colors.text }}>{l}</Text></View>
            ))}
            <Text style={{ fontSize: 12, color: colors.text }}>°{d.unit} · {N} days</Text>
          </View>
        </View>
      );
    }
    case 'water': {
      const ml = d.days[t]?.waterMl ?? 0;
      const target = d.settings.waterTarget ?? 2250;
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <CountUp value={ml / 1000} decimals={2} separator={false} style={w.big} />
            <Text style={w.unit} numberOfLines={1} maxFontSizeMultiplier={1.2}>of {(target / 1000).toFixed(2)} L</Text>
          </View>
          <Glass progress={ml / target} color={colors.water} track={colors.tile} />
        </View>
      );
    }
    case 'activity': {
      const km = d.days[t]?.distanceKm ?? latest(d.days, 'distanceKm', t, 1)?.value;
      const kcal = d.days[t]?.activeKcal;
      const s = series(d.days, 'distanceKm', t, 7).map((x) => x.value);
      if (km == null && !s.some((x) => x != null)) return <Empty />;
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><CountUp value={km ?? 0} decimals={1} style={w.big} /><Text style={[w.unit, { marginLeft: 4, marginBottom: 6 }]}>km</Text></View>
          {kcal != null ? <Text style={w.unit} numberOfLines={1} maxFontSizeMultiplier={1.2}>{kcal.toLocaleString('en-US')} active kcal</Text> : null}
          <View style={{ marginTop: 8 }}><MiniBars values={s} width={inner} height={36} color={colors.fertile} faint={colors.tile} /></View>
        </View>
      );
    }
    case 'mood': case 'symptoms': {
      const start = d.p.lastPeriodStart ?? addDays(t, -28);
      const key = id === 'mood' ? 'moods' : 'symptoms';
      const counts = new Map<string, number>();
      for (const l of d.logs) if (l.date >= start) for (const v of l[key]) if (v !== 'fine') counts.set(v, (counts.get(v) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (!top.length) return <Empty text={`No ${key} logged this cycle`} />;
      const ink = id === 'mood' ? colors.pregnancy : colors.ovulation;
      return (
        <View style={{ marginTop: 6 }}>
          {top.map(([k, c]) => (
            <View key={k} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={1}>{labelOf(k)} · {c}×</Text>
              <View style={w.track}><View style={[w.fill, { width: `${(c / top[0][1]) * 100}%`, backgroundColor: ink }]} /></View>
            </View>
          ))}
        </View>
      );
    }
    case 'oxygen': {
      const l = latest(d.days, 'spo2', t, 7);
      if (!l) return <Empty />;
      return <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><CountUp value={l.value} style={w.big} /><Text style={[w.unit, { marginLeft: 4, marginBottom: 6 }]}>%</Text></View>;
    }
  }
}

/** Two-column widget grid. In edit mode each tile gets remove / move controls (no drag required). */
export function WidgetGrid({ ids, edit, onOpen, onChange, padding = 20 }: {
  ids: WidgetId[]; edit?: boolean; onOpen?: (def: WidgetDef) => void; onChange?: (ids: WidgetId[]) => void; padding?: number;
}) {
  const d = useWidgetData();
  const { width: win } = useWindowDimensions();
  const total = Math.min(win, 640) - padding * 2;
  const gap = 12;
  const half = (total - gap) / 2;
  const move = (i: number, by: number) => { const n = [...ids]; const [x] = n.splice(i, 1); n.splice(Math.max(0, Math.min(n.length, i + by)), 0, x); onChange?.(n); };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: padding }}>
      {ids.map((id, i) => {
        const def = WIDGETS[id];
        const wide = def.size === 'full';
        const width = wide ? total : half;
        return (
          <Reanimated.View key={id} style={{ width }} entering={FadeInDown.delay(Math.min(i, 8) * STAGGER).springify().damping(16)} exiting={ZoomOut.duration(160)} layout={LinearTransition.springify().damping(18)}>
            <Tile def={def} wide={wide} onPress={!edit && onOpen ? () => onOpen(def) : undefined}
              edit={edit ? (
                <View style={w.editBar}>
                  <PressScale accessibilityLabel={`Move ${def.title} earlier`} disabled={i === 0} onPress={() => move(i, -1)} style={[w.editBtn, i === 0 && { opacity: 0.35 }]}><Icon name="arrow-left" size={20} color={colors.heading} /></PressScale>
                  <PressScale accessibilityLabel={`Move ${def.title} later`} disabled={i === ids.length - 1} onPress={() => move(i, 1)} style={[w.editBtn, i === ids.length - 1 && { opacity: 0.35 }]}><Icon name="arrow-right" size={20} color={colors.heading} /></PressScale>
                  <PressScale accessibilityLabel={`Remove ${def.title}`} onPress={() => onChange?.(ids.filter((x) => x !== id))} style={[w.editBtn, { backgroundColor: colors.period }]}><Icon name="minus" size={20} color={colors.white} /></PressScale>
                </View>
              ) : null}>
              <Body id={id} d={d} width={width} />
            </Tile>
          </Reanimated.View>
        );
      })}
    </View>
  );
}

/** Home "My widgets" section: edit toggle, grid, and the add-widget sheet. */
export function HomeWidgets({ onOpen }: { onOpen: (def: WidgetDef) => void }) {
  const ids = useHealth((s) => s.widgets);
  const setIds = useHealth((s) => s.setWidgets);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const missing = (Object.keys(WIDGETS) as WidgetId[]).filter((k) => !ids.includes(k));
  return (
    <View style={{ marginTop: 28 }}>
      <View style={w.sectionRow}>
        <Text style={w.section} accessibilityRole="header">My widgets</Text>
        <PressScale accessibilityRole="button" accessibilityLabel={edit ? 'Done editing widgets' : 'Edit widgets'} onPress={() => setEdit(!edit)} style={w.editToggle}>
          <Text style={{ color: colors.heading, fontWeight: '700', fontSize: 15 }}>{edit ? 'Done' : 'Edit'}</Text>
        </PressScale>
      </View>
      {ids.length ? <WidgetGrid ids={ids} edit={edit} onOpen={onOpen} onChange={setIds} /> : <Muted style={{ marginHorizontal: 20 }}>No widgets. Tap Edit, then Add widget.</Muted>}
      {edit && (
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <Btn icon="plus" title="Add widget" onPress={() => setAdding(true)} disabled={!missing.length} />
          <Btn kind="ghost" title="Reset to default" onPress={() => setIds(DEFAULT_WIDGETS)} />
        </View>
      )}
      <Sheet visible={adding} onClose={() => setAdding(false)}>
        <TopBar title="Add widget" onClose={() => setAdding(false)} />
        <Reanimated.ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {missing.length ? missing.map((id, i) => (
            <Reanimated.View key={id} entering={FadeInDown.delay(Math.min(i, 8) * STAGGER)} style={w.addRow}>
              <View style={[w.addIcon, { backgroundColor: WIDGETS[id].tint ?? colors.primarySoft }]}><Icon name={WIDGETS[id].icon} size={24} color={colors.heading} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>{WIDGETS[id].title}</Text>
                <Text style={{ fontSize: 14, color: colors.muted }}>{WIDGETS[id].describe}</Text>
              </View>
              <PressScale accessibilityLabel={`Add ${WIDGETS[id].title}`} onPress={() => { setIds([...ids, id]); setAdding(false); }} style={w.addBtn}><Icon name="plus" size={22} color={colors.onPrimary} /></PressScale>
            </Reanimated.View>
          )) : <Muted style={{ margin: 20 }}>All widgets are already on your home page.</Muted>}
        </Reanimated.ScrollView>
      </Sheet>
    </View>
  );
}

export type { DayLog, HealthDay };

const w = themed(() => StyleSheet.create({
  tile: { borderRadius: 24, padding: 16, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow },
  disc: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '600', color: colors.heading, flex: 1, marginRight: 6 },
  big: { fontSize: 30, color: colors.heading, marginTop: 4 },
  unit: { fontSize: 14, color: colors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.tile, marginTop: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  section: { fontSize: 22, fontWeight: '700', color: colors.heading },
  editToggle: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  editBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  addRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  addIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
