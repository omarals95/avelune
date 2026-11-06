import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../text';
import { addDays, cycleDayOf, today as todayFn, type DateStr, type DayLog, type Flow } from '@avelune/core';
import { FadeIn, PressScale } from '../anim';
import { CATEGORIES, tagId, type Category } from '../catalog';
import { fmtDay } from '../components';
import { Icon } from '../icons';
import { cToDisplay, displayToC, displayToKg, emptyLog, kgToDisplay, selectLogs, selectSettings, useStore } from '../store';
import { colors, scheme, themed } from '../theme';
import { Chip, Muted } from '../ui';
import { useNav } from '../nav';
import { lang, monthShort, t, tn } from '../i18n';

const DEFAULT_QUICK = ['cramps', 'fatigue', 'headache', 'bloating'];
const GLASS = 250;

export function LogSheet({ date: initial, onClose }: { date: DateStr; onClose: () => void }) {
  const [date, setDate] = useState(initial);
  const records = useStore((s) => s.records);
  const saveDay = useStore((s) => s.saveDay);
  const hideSex = useStore((s) => s.hideSex);
  const unit = useStore((s) => s.unit);
  const wUnit = useStore((s) => s.weightUnit);
  const server = useStore((s) => s.server);
  const nav = useNav();
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

  // Computed once when the sheet opens: re-sorting while you tap would move the next target under your finger.
  const [quick] = useState(() => {
    const counts = new Map<string, number>();
    for (const l of logs) for (const s of l.symptoms) if (s !== 'fine') counts.set(s, (counts.get(s) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return [...new Set([...top, ...DEFAULT_QUICK])].slice(0, 4);
  });
  const symptoms = CATEGORIES.find((c) => c.id === 'symptoms')!;
  const moodCat = CATEGORIES.find((c) => c.id === 'mood')!;
  const [topMoods] = useState(() => {
    const counts = new Map<string, number>();
    for (const l of logs) for (const m of l.moods) counts.set(m, (counts.get(m) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return [...new Set([...top, 'calm', 'happy', 'energetic'])].slice(0, 3);
  });
  const meds = (settings.medications ?? []).filter((m) => m.active || (log.meds?.[m.id] ?? 0) > 0);
  const cats = CATEGORIES.filter((c) => !(hideSex && c.sensitive) && !(settings.pregnancyLmp && (c.id === 'flow' || c.id === 'tests' || c.id === 'pill')));
  const ql = q.trim().toLowerCase();
  const target = settings.waterTarget ?? 2250;
  const water = log.water ?? 0;
  const glasses = Math.max(Math.round(target / GLASS), Math.ceil(water / GLASS));
  const wu = wUnit === 'kg' ? t('kg') : t('lb');
  const fmtL = (ml: number) => (ml >= 1000 ? `${+(ml / 1000).toFixed(2)} L` : `${ml} ml`);
  const synced = !!server;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={ls.head}>
        <View style={ls.titleRow}>
          <PressScale accessibilityLabel={t('Close')} onPress={onClose} style={ls.close}><Icon name="close" size={28} color={colors.heading} /></PressScale>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ls.title} accessibilityRole="header">{t('Daily log')}</Text>
            <View style={ls.dayNav}>
              <PressScale accessibilityLabel={t('Previous day')} onPress={() => setDate(addDays(date, -1))} style={ls.navBtn}><Icon name="chevron-left" size={18} color={colors.muted} /></PressScale>
              <Text style={ls.sub} numberOfLines={1}>{longDay(date)}{cd ? ` · ${t('Day {n}', { n: cd })}` : ''}</Text>
              <PressScale accessibilityLabel={t('Next day')} disabled={date >= today} onPress={() => date < today && setDate(addDays(date, 1))} style={[ls.navBtn, date >= today && { opacity: 0.25 }]}><Icon name="chevron-right" size={18} color={colors.muted} /></PressScale>
            </View>
          </View>
          <View style={{ width: 48 }} />
        </View>
        <View style={ls.search}>
          <Icon name="magnify" size={22} color={colors.muted} />
          <TextInput accessibilityLabel={t('Search your log')} value={q} onChangeText={setQ} placeholder={t('Search your log')} placeholderTextColor={colors.muted} style={ls.searchIn} />
          {q ? <PressScale accessibilityLabel={t('Clear search')} onPress={() => setQ('')} hitSlop={8}><Icon name="close-circle-outline" size={20} color={colors.muted} /></PressScale> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {!ql && (
          <FadeIn>
            <Text style={ls.h}>{t('Quick picks')}</Text>
            <View style={ls.grid}>
              {quick.map((id) => {
                const o = symptoms.options.find((x) => x.id === id)!;
                const on = log.symptoms.includes(id);
                return (
                  <PressScale key={id} accessibilityRole="checkbox" accessibilityLabel={t(o.label)} accessibilityState={{ checked: on }} onPress={() => toggle(symptoms, id)} style={ls.tileWrap}>
                    <View style={[ls.tile, on && ls.tileOn]}>
                      <Icon name={o.icon} size={44} weight="light" color={on ? colors.primary : colors.heading} />
                      <Text style={[ls.tileT, on && { fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>{t(o.label)}</Text>
                      {on ? <View style={ls.badge}><Icon name="check-bold" size={13} color={colors.onPrimary} /></View> : null}
                    </View>
                  </PressScale>
                );
              })}
            </View>

            <View style={ls.rule} />
            <Text style={ls.h}>{t('Mood')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              {topMoods.map((id) => {
                const o = moodCat.options.find((x) => x.id === id) ?? moodCat.options[0];
                const on = log.moods.includes(id);
                return (
                  <PressScale key={id} accessibilityRole="checkbox" accessibilityLabel={t(o.label)} accessibilityState={{ checked: on }} onPress={() => toggle(moodCat, id)} style={{ alignItems: 'center', width: '30%' }}>
                    <View style={[ls.mood, on && ls.moodOn]}>
                      <Icon name={o.icon} size={40} weight="light" color={on ? colors.primary : colors.heading} />
                    </View>
                    <Text style={ls.moodT} numberOfLines={1} adjustsFontSizeToFit>{t(o.label)}</Text>
                  </PressScale>
                );
              })}
            </View>

            <View style={ls.rule} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={ls.h}>{t('Water')}</Text>
              <Text style={ls.waterT}>{fmtL(water)} / {fmtL(target)}</Text>
            </View>
            <View style={ls.glasses}>
              {Array.from({ length: glasses }, (_, i) => {
                const full = water >= (i + 1) * GLASS;
                return (
                  <PressScale key={i} accessibilityRole="button" accessibilityLabel={tn(i + 1, '{n} glass of water|{n} glasses of water')} accessibilityState={{ selected: full }} hitSlop={4}
                    onPress={() => update({ water: full && water === (i + 1) * GLASS ? i * GLASS : (i + 1) * GLASS })} style={{ flex: 1, alignItems: 'center', maxWidth: 48 }}>
                    <Glass full={full} />
                  </PressScale>
                );
              })}
            </View>
            <View style={ls.rule} />
          </FadeIn>
        )}

        {cats.map((c, i) => {
          const opts = c.options.filter((o) => !ql || o.label.toLowerCase().includes(ql) || c.title.toLowerCase().includes(ql) || t(o.label).toLowerCase().includes(ql) || t(c.title).toLowerCase().includes(ql));
          if (!opts.length) return null;
          return (
            <FadeIn key={c.id} delay={Math.min(i, 6) * 40} style={{ marginBottom: 6 }}>
              <Text style={ls.h}>{t(c.title)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {opts.map((o) => <Chip key={o.id} label={t(o.label)} icon={o.icon} on={isOn(c, o.id)} onPress={() => toggle(c, o.id)} />)}
              </View>
            </FadeIn>
          );
        })}

        {(!ql || 'medication medicine pill painkiller'.includes(ql) || t('medication medicine pill painkiller').includes(ql) || meds.some((m) => m.name.toLowerCase().includes(ql))) && (
          <FadeIn delay={220}>
            <View style={ls.rule} />
            <Text style={ls.h}>{t('Medication')}</Text>
            {meds.length ? (
              <View style={ls.card}>
                {meds.map((m, i) => {
                  const n = log.meds?.[m.id] ?? 0;
                  const over = !!m.maxPerDay && n > m.maxPerDay;
                  const setN = (v: number) => {
                    const next = { ...(log.meds ?? {}) };
                    if (v > 0) next[m.id] = v; else delete next[m.id];
                    update({ meds: Object.keys(next).length ? next : undefined });
                  };
                  return (
                    <View key={m.id} style={[ls.mRow, i < meds.length - 1 && ls.mDivider, { flexWrap: 'wrap' }]}>
                      <View style={ls.mIcon}><Icon name="pill" size={22} color={colors.heading} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, color: colors.heading }}>{m.name}</Text>
                        {m.dose || m.maxPerDay ? <Text style={{ fontSize: 13, color: colors.muted }}>{[m.dose, m.maxPerDay ? t('max {n} a day', { n: m.maxPerDay }) : null].filter(Boolean).join(' · ')}</Text> : null}
                      </View>
                      {n === 0 ? (
                        <PressScale accessibilityLabel={t('Log a dose of {name}', { name: m.name })} onPress={() => setN(1)} style={ls.addBtn}><Text style={{ color: colors.heading, fontWeight: '700' }}>{t('Took it')}</Text></PressScale>
                      ) : (
                        <>
                          <PressScale accessibilityLabel={t('One fewer dose of {name}', { name: m.name })} onPress={() => setN(n - 1)} style={ls.step}><Icon name="minus" size={18} color={colors.heading} /></PressScale>
                          <Text style={[ls.mVal, { minWidth: 70 }]} accessibilityLiveRegion="polite">{tn(n, '{n} dose|{n} doses')}</Text>
                          <PressScale accessibilityLabel={t('One more dose of {name}', { name: m.name })} onPress={() => setN(n + 1)} style={ls.step}><Icon name="plus" size={18} color={colors.heading} /></PressScale>
                        </>
                      )}
                      {over ? (
                        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 8 }} accessibilityLiveRegion="polite">
                          <Icon name="alert-outline" size={18} color={colors.danger} />
                          <Text style={{ flex: 1, marginStart: 6, fontSize: 14, color: colors.danger }}>{t('That is more than your daily limit of {n}. Check the leaflet or ask a pharmacist before taking more.', { n: m.maxPerDay ?? 0 })}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
            <PressScale accessibilityRole="button" onPress={() => nav.openSettings('meds')} style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{meds.length ? t('Manage medication') : t('Add medication to track doses')}</Text>
            </PressScale>
          </FadeIn>
        )}

        {(!ql || 'temperature weight sleep distance'.includes(ql) || t('temperature weight sleep distance').includes(ql)) && (
          <FadeIn delay={240}>
            <View style={ls.rule} />
            <Text style={ls.h}>{t('Measurements')}</Text>
            <View style={ls.card}>
              <Measure icon="thermometer" label={t('Basal temperature')} unit={`°${unit}`} value={log.bbt == null ? null : cToDisplay(log.bbt, unit)}
                start={unit === 'C' ? 36.5 : 97.7} step={unit === 'C' ? 0.05 : 0.1} digits={2}
                onChange={(v) => update({ bbt: v == null ? undefined : Math.round(displayToC(v, unit) * 100) / 100 })} />
              <Measure icon="scale-bathroom" label={t('Weight')} unit={wu} value={log.weight == null ? null : kgToDisplay(log.weight, wUnit)}
                start={wUnit === 'kg' ? lastOf(logs, 'weight', 60) : lastOf(logs, 'weight', 60) * 2.20462} step={0.1} digits={1}
                onChange={(v) => update({ weight: v == null ? undefined : Math.round(displayToKg(v, wUnit) * 10) / 10 })} />
              <Measure icon="sleep" label={t('Sleep')} unit={t('h')} value={log.sleep ?? null} start={7.5} step={0.5} digits={1} onChange={(v) => update({ sleep: v ?? undefined })} />
              <Measure icon="walk" label={t('Distance')} unit={t('km')} value={log.distance ?? null} start={3} step={0.5} digits={1} onChange={(v) => update({ distance: v ?? undefined })} last />
            </View>
          </FadeIn>
        )}

        {!ql && (
          <FadeIn delay={280}>
            <Text style={ls.h}>{t('Notes')}</Text>
            <TextInput accessibilityLabel={t('Notes')} multiline value={log.notes ?? ''} onChangeText={(t) => update({ notes: t || undefined })}
              placeholder={t('Anything else about today')} placeholderTextColor={colors.muted} style={ls.notes} />
          </FadeIn>
        )}

        <View style={ls.saved} accessible accessibilityLabel={synced ? t('Saved on this device and synced with end-to-end encryption') : t('Saved on this device')}>
          <Icon name="lock-outline" size={20} color={colors.muted} />
          <Text style={ls.savedT}>{synced ? t('Saved · end-to-end encrypted sync') : t('Saved on this device')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
function longDay(d: DateStr) {
  const x = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8));
  // Weekday names are translated by key; Arabic uses its own month names (the English abbreviations here are house style).
  return t('{weekday}, {month} {day}', { weekday: t(WD[x.getDay()]), month: lang === 'en' ? MO[x.getMonth()] : monthShort(x.getMonth()), day: x.getDate() });
}

/** A drinking glass that fills with water (blue in light, rose in dark). */
function Glass({ full }: { full: boolean }) {
  return (
    <View style={ls.glass}>
      {full ? <View style={ls.glassFill} /> : null}
      <View style={ls.glassShine} />
    </View>
  );
}

function lastOf(logs: DayLog[], k: 'weight', fallback: number) {
  const l = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)).find((x) => x[k] != null);
  return l?.[k] ?? fallback;
}

function Measure({ icon, label, unit, value, start, step, digits, onChange, last }: {
  icon: 'thermometer' | 'scale-bathroom' | 'sleep' | 'walk'; label: string; unit: string; value: number | null; start: number; step: number; digits: number; onChange: (v: number | null) => void; last?: boolean;
}) {
  const round = (n: number) => Math.round(n / step) * step;
  return (
    <View style={[ls.mRow, !last && ls.mDivider]}>
      <View style={ls.mIcon}><Icon name={icon} size={22} color={colors.heading} /></View>
      <Text style={{ flex: 1, fontSize: 16, color: colors.heading }}>{label}</Text>
      {value == null ? (
        <PressScale accessibilityLabel={t('Add {label}', { label })} onPress={() => onChange(round(start))} style={ls.addBtn}><Text style={{ color: colors.heading, fontWeight: '700' }}>{t('Add')}</Text></PressScale>
      ) : (
        <>
          <PressScale accessibilityLabel={t('Decrease {label}', { label })} onPress={() => onChange(round(value - step))} style={ls.step}><Icon name="minus" size={18} color={colors.heading} /></PressScale>
          <Text style={ls.mVal}>{value.toFixed(digits)} {unit}</Text>
          <PressScale accessibilityLabel={t('Increase {label}', { label })} onPress={() => onChange(round(value + step))} style={ls.step}><Icon name="plus" size={18} color={colors.heading} /></PressScale>
          <PressScale accessibilityLabel={t('Clear {label}', { label })} onPress={() => onChange(null)} hitSlop={8} style={{ padding: 10 }}><Icon name="close-circle-outline" size={20} color={colors.muted} /></PressScale>
        </>
      )}
    </View>
  );
}

const ls = themed(() => StyleSheet.create({
  head: { backgroundColor: colors.bg, paddingHorizontal: 18, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 14 },
  close: { width: 48, height: 48, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '700', color: colors.heading },
  dayNav: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 16, color: colors.text },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: 18, paddingHorizontal: 18, height: 56, borderWidth: 1, borderColor: colors.border, gap: 10 },
  searchIn: { flex: 1, fontSize: 17, color: colors.text },
  h: { fontSize: 20, fontWeight: '600', color: colors.heading, marginTop: 18, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tileWrap: { width: '48.5%', marginBottom: 10 },
  tile: { height: 124, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: scheme === 'dark' ? colors.border : 'transparent' },
  tileOn: { backgroundColor: colors.tileSelected, borderColor: colors.primary },
  tileT: { marginTop: 10, fontSize: 16, color: colors.heading },
  badge: { position: 'absolute', top: 10, end: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginTop: 16 },
  mood: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: scheme === 'dark' ? colors.card : colors.tile, borderWidth: 1.5, borderColor: scheme === 'dark' ? colors.border : 'transparent' },
  moodOn: { backgroundColor: colors.tileSelected, borderColor: colors.primary, borderWidth: 2 },
  moodT: { marginTop: 8, fontSize: 16, color: colors.heading },
  waterT: { fontSize: 16, color: colors.text },
  glasses: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  glass: { width: 34, height: 48, borderWidth: 1.5, borderColor: scheme === 'dark' ? '#6B5A68' : '#5C4A55', borderTopWidth: 1.5, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2, overflow: 'hidden', justifyContent: 'flex-end', transform: [{ perspective: 200 }, { rotateX: '-14deg' }] },
  glassFill: { height: '74%', backgroundColor: scheme === 'dark' ? '#E6A9C0' : colors.water, opacity: scheme === 'dark' ? 0.9 : 0.75 },
  glassShine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  card: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  mDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  mIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginEnd: 12 },
  mVal: { minWidth: 86, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.heading },
  step: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border },
  notes: { minHeight: 96, borderRadius: 18, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 16, textAlignVertical: 'top', color: colors.text },
  saved: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22, minHeight: 64, borderRadius: 20, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border },
  savedT: { fontSize: 16, color: colors.text },
}));
