import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addDays, cycleDayOf, today as todayFn, type DateStr, type DayLog, type Flow } from '@cyclo/core';
import { FadeIn, PressScale } from '../anim';
import { CATEGORIES, tagId, type Category } from '../catalog';
import { fmtDay } from '../components';
import { Icon } from '../icons';
import { cToDisplay, displayToC, displayToKg, emptyLog, kgToDisplay, selectLogs, selectSettings, useStore } from '../store';
import { colors, shadow } from '../theme';
import { Chip, Muted } from '../ui';

const DEFAULT_QUICK = ['fatigue', 'insomnia', 'nausea', 'bloating'];
const GLASS = 250;

export function LogSheet({ date: initial, onClose }: { date: DateStr; onClose: () => void }) {
  const [date, setDate] = useState(initial);
  const records = useStore((s) => s.records);
  const saveDay = useStore((s) => s.saveDay);
  const hideSex = useStore((s) => s.hideSex);
  const unit = useStore((s) => s.unit);
  const wUnit = useStore((s) => s.weightUnit);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const log: DayLog = logs.find((l) => l.date === date) ?? emptyLog(date);
  const today = todayFn();
  const cd = cycleDayOf(date, logs);
  const [q, setQ] = useState('');
  const update = (patch: Partial<DayLog>) => saveDay({ ...log, ...patch, date });

  const isOn = (c: Category, id: string) => {
    if (c.field === 'flow') return String(log.flow) === id;
    return (log[c.field] as string[]).includes(tagId(c.id, id));
  };
  const toggle = (c: Category, id: string) => {
    if (c.field === 'flow') return update({ flow: (String(log.flow) === id ? 0 : +id) as Flow });
    const full = tagId(c.id, id);
    const arr = log[c.field] as string[];
    let next = arr.includes(full) ? arr.filter((x) => x !== full) : [...arr, full];
    // Single-choice categories and "none"-style options are mutually exclusive with the rest.
    if (!arr.includes(full)) {
      const siblings = c.options.map((o) => tagId(c.id, o.id)).filter((x) => x !== full);
      const exclusive = c.single || id === 'none' || id === 'fine';
      if (exclusive) next = next.filter((x) => !siblings.includes(x));
      else next = next.filter((x) => x !== tagId(c.id, 'none') && x !== tagId(c.id, 'fine'));
    }
    update({ [c.field]: next } as Partial<DayLog>);
  };

  const quick = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) for (const s of l.symptoms) if (s !== 'fine') counts.set(s, (counts.get(s) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return [...new Set([...top, ...DEFAULT_QUICK])].slice(0, 4);
  }, [logs]);
  const symptoms = CATEGORIES.find((c) => c.id === 'symptoms')!;
  const cats = CATEGORIES.filter((c) => !(hideSex && c.sensitive) && !(settings.pregnancyLmp && (c.id === 'flow' || c.id === 'tests' || c.id === 'pill')));
  const ql = q.trim().toLowerCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={ls.head}>
        <PressScale accessibilityLabel="Close" onPress={onClose} style={ls.close}><Icon name="close" size={30} color={colors.text} /></PressScale>
        <View style={ls.dayNav}>
          <PressScale accessibilityLabel="Previous day" onPress={() => setDate(addDays(date, -1))} style={ls.navBtn}><Icon name="chevron-left" size={30} color={colors.text} /></PressScale>
          <View style={{ alignItems: 'center', minWidth: 170 }}>
            <Text style={ls.title}>{date === today ? 'Today' : fmtDay(date)}</Text>
            {cd ? <Text style={ls.sub}>Cycle day {cd}</Text> : null}
          </View>
          <PressScale accessibilityLabel="Next day" onPress={() => date < today && setDate(addDays(date, 1))} style={[ls.navBtn, date >= today && { opacity: 0.25 }]}><Icon name="chevron-right" size={30} color={colors.text} /></PressScale>
        </View>
        <View style={ls.search}>
          <Icon name="magnify" size={24} color={colors.muted} />
          <TextInput accessibilityLabel="Search" value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.faint} style={ls.searchIn} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {!ql && (
          <FadeIn style={ls.card}>
            <Text style={ls.cardT}>What are you feeling today?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {quick.map((id) => {
                const o = symptoms.options.find((x) => x.id === id)!;
                const on = log.symptoms.includes(id);
                return (
                  <PressScale key={id} accessibilityLabel={o.label} accessibilityState={{ checked: on }} onPress={() => toggle(symptoms, id)} style={{ alignItems: 'center', width: '24%' }}>
                    <View style={[ls.bigIcon, { backgroundColor: on ? symptoms.ink : symptoms.tint }]}><Icon name={o.icon} size={40} color={on ? '#fff' : symptoms.ink} /></View>
                    <Text style={ls.bigLabel} numberOfLines={1}>{o.label}</Text>
                  </PressScale>
                );
              })}
            </View>
          </FadeIn>
        )}

        {!ql && <Text style={ls.catHead}>Categories</Text>}
        {cats.map((c, i) => {
          const opts = c.options.filter((o) => !ql || o.label.toLowerCase().includes(ql) || c.title.toLowerCase().includes(ql));
          if (!opts.length) return null;
          return (
            <FadeIn key={c.id} delay={Math.min(i, 6) * 50} style={ls.card}>
              <Text style={ls.cardT}>{c.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {opts.map((o) => <Chip key={o.id} label={o.label} icon={o.icon} tint={c.tint} ink={c.ink} on={isOn(c, o.id)} onPress={() => toggle(c, o.id)} />)}
              </View>
            </FadeIn>
          );
        })}

        {(!ql || 'water temperature weight sleep distance notes'.includes(ql)) && (
          <FadeIn delay={200} style={ls.card}>
            <Text style={ls.cardT}>Water</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              {Array.from({ length: Math.max(8, Math.ceil((log.water ?? 0) / GLASS) + 1) }, (_, i) => {
                const full = (log.water ?? 0) >= (i + 1) * GLASS;
                return (
                  <PressScale key={i} accessibilityLabel={`${i + 1} glasses`} onPress={() => update({ water: full && (log.water ?? 0) === (i + 1) * GLASS ? i * GLASS : (i + 1) * GLASS })} style={{ marginRight: 6, marginBottom: 6 }}>
                    <Icon name={full ? 'cup-water' : 'cup-outline'} size={34} color={full ? '#2F95D6' : colors.faint} />
                  </PressScale>
                );
              })}
            </View>
            <Muted>{((log.water ?? 0) / 1000).toFixed(2)} L of {((settings.waterTarget ?? 2250) / 1000).toFixed(2)} L target</Muted>
          </FadeIn>
        )}

        {(!ql || 'temperature weight sleep distance'.includes(ql)) && (
          <FadeIn delay={240} style={ls.card}>
            <Text style={ls.cardT}>Measurements</Text>
            <Measure icon="thermometer" label="Basal temperature" unit={`°${unit}`} value={log.bbt == null ? null : cToDisplay(log.bbt, unit)}
              start={unit === 'C' ? 36.5 : 97.7} step={unit === 'C' ? 0.05 : 0.1} digits={2}
              onChange={(v) => update({ bbt: v == null ? undefined : Math.round(displayToC(v, unit) * 100) / 100 })} />
            <Measure icon="scale-bathroom" label="Weight" unit={wUnit} value={log.weight == null ? null : kgToDisplay(log.weight, wUnit)}
              start={wUnit === 'kg' ? lastOf(logs, 'weight', 60) : lastOf(logs, 'weight', 60) * 2.20462} step={0.1} digits={1}
              onChange={(v) => update({ weight: v == null ? undefined : Math.round(displayToKg(v, wUnit) * 10) / 10 })} />
            <Measure icon="sleep" label="Sleep" unit="h" value={log.sleep ?? null} start={7.5} step={0.5} digits={1} onChange={(v) => update({ sleep: v ?? undefined })} />
            <Measure icon="walk" label="Distance" unit="km" value={log.distance ?? null} start={3} step={0.5} digits={1} onChange={(v) => update({ distance: v ?? undefined })} />
          </FadeIn>
        )}

        {!ql && (
          <FadeIn delay={280} style={ls.card}>
            <Text style={ls.cardT}>Notes</Text>
            <TextInput accessibilityLabel="Notes" multiline value={log.notes ?? ''} onChangeText={(t) => update({ notes: t || undefined })}
              placeholder="Anything else about today" placeholderTextColor={colors.faint} style={ls.notes} />
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

function lastOf(logs: DayLog[], k: 'weight', fallback: number) {
  const l = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)).find((x) => x[k] != null);
  return l?.[k] ?? fallback;
}

function Measure({ icon, label, unit, value, start, step, digits, onChange }: {
  icon: 'thermometer' | 'scale-bathroom' | 'sleep' | 'walk'; label: string; unit: string; value: number | null; start: number; step: number; digits: number; onChange: (v: number | null) => void;
}) {
  const round = (n: number) => Math.round(n / step) * step;
  return (
    <View style={ls.mRow}>
      <View style={ls.mIcon}><Icon name={icon} size={22} color={colors.text} /></View>
      <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{label}</Text>
      {value == null ? (
        <PressScale accessibilityLabel={`Add ${label}`} onPress={() => onChange(round(start))} style={ls.addBtn}><Text style={{ color: colors.primary, fontWeight: '700' }}>Add</Text></PressScale>
      ) : (
        <>
          <PressScale accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(round(value - step))} style={ls.step}><Icon name="minus" size={18} color={colors.primary} /></PressScale>
          <Text style={ls.mVal}>{value.toFixed(digits)} {unit}</Text>
          <PressScale accessibilityLabel={`Increase ${label}`} onPress={() => onChange(round(value + step))} style={ls.step}><Icon name="plus" size={18} color={colors.primary} /></PressScale>
          <PressScale accessibilityLabel={`Clear ${label}`} onPress={() => onChange(null)} style={{ padding: 6 }}><Icon name="close-circle-outline" size={20} color={colors.faint} /></PressScale>
        </>
      )}
    </View>
  );
}

const ls = StyleSheet.create({
  head: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 48, height: 48, justifyContent: 'center' },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6E4EA', borderRadius: 999, paddingHorizontal: 18, height: 54 },
  searchIn: { flex: 1, fontSize: 18, marginLeft: 10, color: colors.text },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 14, ...shadow, shadowOpacity: 0.04 },
  cardT: { fontSize: 21, fontWeight: '700', color: colors.text, marginBottom: 14 },
  catHead: { fontSize: 24, fontWeight: '700', color: colors.text, marginVertical: 10 },
  bigIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bigLabel: { fontSize: 14, color: colors.text },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  mIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mVal: { minWidth: 86, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  step: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.primarySoft },
  notes: { minHeight: 90, borderRadius: 14, backgroundColor: colors.bg, padding: 14, fontSize: 16, textAlignVertical: 'top', color: colors.text },
});
