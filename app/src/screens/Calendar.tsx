import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, classifyDay, cycleDayOf, predict, toDateStr, today as todayFn, type DateStr, type DayKind } from '@cyclo/core';
import { ND, PressScale } from '../anim';
import { DOW, MONTHS, mondayIndex } from '../components';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { colors, shadow } from '../theme';
import { Segmented, TopBar } from '../ui';

const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

export function CalendarView({ startEditing, onClose, onDay, kindOf: kindOverride, readOnly, title }: {
  startEditing?: boolean; onClose: () => void; onDay?: (d: DateStr) => void;
  kindOf?: (d: DateStr) => DayKind; readOnly?: boolean; title?: string;
}) {
  const nav = readOnly ? null : useNavSafe();
  const records = useStore((s) => s.records);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const today = todayFn();
  const p = useMemo(() => predict(logs, settings, today), [logs, settings, today]);
  const map = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  const kindOf = kindOverride ?? ((d: DateStr) => classifyDay(d, map, p, settings));
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [editing, setEditing] = useState(!!startEditing);
  const [draft, setDraft] = useState<Set<DateStr>>(new Set());
  const setPeriodDays = useStore((s) => s.setPeriodDays);

  useEffect(() => {
    if (editing) setDraft(new Set(logs.filter((l) => l.flow >= 2).map((l) => l.date)));
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const before = new Set(logs.filter((l) => l.flow >= 2).map((l) => l.date));
    const on = [...draft].filter((d) => !before.has(d));
    const off = [...before].filter((d) => !draft.has(d));
    setPeriodDays(on, off);
    setEditing(false);
    if (on.length || off.length) { onClose(); nav?.celebrate(); }
  };
  const toggle = (d: DateStr) => setDraft((s) => {
    const n = new Set(s);
    if (n.has(d)) n.delete(d);
    else {
      n.add(d);
      // Tapping the first day of a new period fills in your usual period length, like most trackers.
      const prevDay = addDays(d, -1);
      if (!n.has(prevDay) && !n.has(addDays(d, 1))) for (let i = 1; i < settings.periodLength; i++) { const x = addDays(d, i); if (x <= today) n.add(x); }
    }
    return n;
  });

  const ty = +today.slice(0, 4), tm = +today.slice(5, 7) - 1;
  const months = useMemo(() => Array.from({ length: 19 }, (_, i) => { const dt = new Date(ty, tm - 12 + i, 1); return { y: dt.getFullYear(), m: dt.getMonth() }; }), [ty, tm]);
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [target, setTarget] = useState(monthKey(ty, tm));
  const jump = (k: string) => { const y = offsets.current[k]; if (y != null) scroll.current?.scrollTo({ y, animated: false }); };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar onClose={onClose} title={title}
        right={!readOnly ? <PressScale accessibilityLabel="Cycle settings" onPress={() => { onClose(); nav?.openSettings('cycle'); }} style={{ padding: 8 }}><Icon name="cog-outline" size={28} color={colors.text} /></PressScale> : null} />
      <View style={{ alignItems: 'center', marginTop: -50, marginBottom: 8 }} pointerEvents="box-none">
        {!title && <Segmented options={[['month', 'Month'], ['year', 'Year']]} value={mode} onChange={(m) => { if (m === 'month') setTarget(monthKey(ty, tm)); setMode(m); }} />}
      </View>
      <View style={cal.dowRow}>{DOW.map((d, i) => <Text key={i} style={cal.dow}>{d}</Text>)}</View>

      {mode === 'month' ? (
        <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 120 }}>
          {months.map(({ y, m }) => (
            <View key={monthKey(y, m)} onLayout={(e) => { offsets.current[monthKey(y, m)] = e.nativeEvent.layout.y; if (monthKey(y, m) === target) { jump(target); setTarget(''); } }}>
              <Month y={y} m={m} today={today} kindOf={kindOf} editing={editing} draft={draft} showCycleDays={!!settings.showCycleDays}
                cycleDayOf={(d) => cycleDayOf(d, logs)} onDay={(d) => (editing ? (d <= today && toggle(d)) : onDay?.(d))} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 60 }}>
          {Array.from({ length: 12 }, (_, m) => (
            <Pressable key={m} style={{ width: '33.3%', padding: 6 }} accessibilityLabel={`${MONTHS[m]} ${ty}`} onPress={() => { setTarget(monthKey(ty, m)); setMode('month'); }}>
              <MiniMonth y={ty} m={m} today={today} kindOf={kindOf} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {!readOnly && mode === 'month' && (
        <View style={cal.fabWrap} pointerEvents="box-none">
          {editing ? (
            <View style={{ flexDirection: 'row' }}>
              <PressScale onPress={() => setEditing(false)} style={[cal.fab, { backgroundColor: '#fff', marginRight: 12 }]}><Text style={[cal.fabT, { color: colors.primary }]}>Cancel</Text></PressScale>
              <PressScale onPress={save} style={cal.fab}><Text style={cal.fabT}>Save</Text></PressScale>
            </View>
          ) : (
            <PressScale onPress={() => setEditing(true)} style={cal.fab}><Text style={cal.fabT}>Edit period dates</Text></PressScale>
          )}
        </View>
      )}
    </View>
  );
}

function useNavSafe() { try { return useNav(); } catch { return null; } }

function Month({ y, m, today, kindOf, editing, draft, onDay, showCycleDays, cycleDayOf }: {
  y: number; m: number; today: DateStr; kindOf: (d: DateStr) => DayKind; editing: boolean; draft: Set<DateStr>;
  onDay: (d: DateStr) => void; showCycleDays: boolean; cycleDayOf: (d: DateStr) => number | null;
}) {
  const days = new Date(y, m + 1, 0).getDate();
  const first = toDateStr(new Date(y, m, 1));
  const cells: (DateStr | null)[] = [...Array(mondayIndex(first)).fill(null), ...Array.from({ length: days }, (_, i) => toDateStr(new Date(y, m, i + 1)))];
  while (cells.length % 7) cells.push(null);
  return (
    <View style={{ paddingTop: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={cal.mTitle}>{MONTHS[m]}{y !== +today.slice(0, 4) ? ` ${y}` : ''}</Text>
      <View style={cal.grid}>
        {cells.map((d, i) => d ? (
          <DayCell key={d} d={d} today={today} kind={kindOf(d)} editing={editing} checked={draft.has(d)} onPress={() => onDay(d)}
            cycleDay={showCycleDays && !editing ? cycleDayOf(d) : null} />
        ) : <View key={i} style={cal.cell} />)}
      </View>
    </View>
  );
}

function DayCell({ d, today, kind, editing, checked, onPress, cycleDay }: {
  d: DateStr; today: DateStr; kind: DayKind; editing: boolean; checked: boolean; onPress: () => void; cycleDay: number | null;
}) {
  const isToday = d === today;
  const future = d > today;
  const pop = useRef(new Animated.Value(1)).current;
  const press = () => { pop.setValue(0.8); Animated.spring(pop, { toValue: 1, useNativeDriver: ND, speed: 30, bounciness: 14 }).start(); onPress(); };
  const filled = kind === 'period';
  const dashed = kind === 'predicted-period' || kind === 'ovulation';
  const txt = isToday && !editing ? '#fff' : filled && !editing ? '#fff' : kind === 'fertile' || kind === 'ovulation' ? colors.fertile : kind === 'predicted-period' ? colors.period : colors.text;
  return (
    <Pressable style={cal.cell} onPress={press} disabled={editing && future} accessibilityLabel={`${d}${kind !== 'none' ? ', ' + kind.replace('-', ' ') : ''}${isToday ? ', today' : ''}`}>
      <Text style={[cal.cd, isToday && !editing && { color: colors.text, fontWeight: '700' }]}>{isToday && !editing ? 'TODAY' : cycleDay ?? ' '}</Text>
      <Animated.View style={[cal.day, { transform: [{ scale: pop }] },
        !editing && filled && { backgroundColor: colors.period },
        !editing && dashed && { borderWidth: 2, borderStyle: 'dashed', borderColor: kind === 'ovulation' ? colors.fertile : colors.period },
        !editing && isToday && { backgroundColor: colors.today, borderWidth: 0 }]}>
        <Text style={[cal.dayT, { color: txt }, editing && future && { color: colors.faint }]}>{+d.slice(8)}</Text>
      </Animated.View>
      {editing ? (
        <View style={[cal.check, checked && { backgroundColor: colors.period, borderColor: colors.period }, future && { opacity: 0 }]}>
          {checked ? <Icon name="check" size={14} color="#fff" /> : null}
        </View>
      ) : <View style={{ height: 22 }} />}
    </Pressable>
  );
}

function MiniMonth({ y, m, today, kindOf }: { y: number; m: number; today: DateStr; kindOf: (d: DateStr) => DayKind }) {
  const days = new Date(y, m + 1, 0).getDate();
  const first = toDateStr(new Date(y, m, 1));
  const cells: (DateStr | null)[] = [...Array(mondayIndex(first)).fill(null), ...Array.from({ length: days }, (_, i) => toDateStr(new Date(y, m, i + 1)))];
  return (
    <View>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 4, color: colors.text }}>{MONTHS[m].slice(0, 3)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          const k = d ? kindOf(d) : 'none';
          const bg = !d ? 'transparent' : d === today ? colors.today : k === 'period' ? colors.period : k === 'predicted-period' ? colors.predictedSoft : k === 'ovulation' ? colors.fertile : k === 'fertile' ? colors.fertileSoft : 'transparent';
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 1 }}>
              <View style={{ flex: 1, borderRadius: 99, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, color: d === today || k === 'period' || k === 'ovulation' ? '#fff' : colors.muted }}>{d ? +d.slice(8) : ''}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  dowRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, paddingHorizontal: 6 },
  dow: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 15 },
  mTitle: { textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingBottom: 12 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  cd: { fontSize: 10, color: colors.muted, height: 14, fontWeight: '600' },
  day: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  dayT: { fontSize: 20 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.faint, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  fab: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 30, ...shadow, shadowOpacity: 0.2 },
  fabT: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
