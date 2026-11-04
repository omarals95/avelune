import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classifyDay, contraceptionStatus, cycleDayOf, diffDays, predict, pregnancyView, type DateStr } from '@avelune/core';
import { PregnancyCaption, PregnancyIllustration, PregnancySetup } from '../pregnancyArt';
import { useToday } from '../today';
import { FadeIn, PressScale } from '../anim';
import { ARTICLES } from '../content';
import { WeekStrip, fmtDay, statusFor, type Status } from '../components';
import { ActionPill, BloomCircle, InsightCard } from '../bloom';
import { PetalBackdrop } from '../petals';
import { Icon, type IconName } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { bloomFor, colors, scheme, shadow, themed, type Bloom, type Mood } from '../theme';
import { HomeWidgets } from '../widgets';
import { Btn } from '../ui';

export function Avatar({ onPress }: { onPress: () => void }) {
  const name = useStore((s) => s.name);
  return (
    <PressScale accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={onPress} style={st.avatar}>
      {name ? <Text style={st.avatarT}>{name[0].toUpperCase()}</Text>
        : <Image source={require('../../assets/symbol.png')} style={{ width: 28, height: 29, tintColor: scheme === 'dark' ? colors.primary : undefined }} resizeMode="contain" accessibilityIgnoresInvertColors />}
    </PressScale>
  );
}

/** Screen header used by the four tabs: avatar · centred serif title · action icon. */
export function TabHeader({ title, right, onAvatar }: { title: string; right?: React.ReactNode; onAvatar: () => void }) {
  return (
    <View style={st.header}>
      <Avatar onPress={onAvatar} />
      <Text style={st.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      <View style={st.headerRight}>{right}</View>
    </View>
  );
}

const HEADLINE: Record<Mood, string> = {
  menstrual: 'Your body is starting a new cycle',
  follicular: 'Your energy may be rising now',
  fertile: 'Your fertile window is open',
  ovulation: 'You may feel your best right now',
  luteal: 'Slow down and be kind to yourself',
  late: 'Your period is running late',
  none: 'Log your period to start predictions',
  pregnancy: 'Your baby is growing every day',
};

/** Map the status copy onto the bloom centre (short kicker, large title, quiet sub-line). */
export function centre(s: Status, cycleDay: number | null, logged: boolean, isToday: boolean, ovConfirmed = false): { kicker: string; big: string; sub?: string; glyph?: IconName } {
  const cd = cycleDay ? `Cycle day ${cycleDay}` : undefined;
  if (s.mood === 'menstrual' && s.kicker === 'Period' && s.big.startsWith('Day')) {
    return { kicker: 'Period', big: s.big.startsWith('Day') ? s.big : `Day ${cycleDay ?? 1}`, sub: logged ? 'Logged' : 'Predicted', glyph: 'water' };
  }
  if (s.mood === 'fertile') return { kicker: '', big: 'Fertile window', sub: isToday && s.big.startsWith('Ovulation in') ? s.big : 'Estimated', glyph: 'sprout' };
  if (s.mood === 'ovulation') return { kicker: '', big: 'Ovulation', sub: isToday ? 'Estimated today' : 'Estimated', glyph: 'sparkle' };
  if (s.mood === 'follicular' && isToday && s.kicker === 'Period in') return { kicker: '', big: 'After your period', sub: cd, glyph: 'sprout' };
  if (s.mood === 'luteal' && isToday && s.kicker === 'Period in') return { kicker: s.kicker, big: s.big, sub: ovConfirmed ? 'Ovulation confirmed' : cd, glyph: 'flower-outline' };
  return { kicker: s.kicker, big: s.big, sub: s.sub, glyph: undefined };
}

export function Today() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const records = useStore((s) => s.records);
  const hideSex = useStore((s) => s.hideSex);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  // Stays current across midnight and when the app returns to the foreground.
  const today = useToday();
  const [selected, setSelected] = useState<DateStr>(today);
  const prevToday = useRef(today);
  useEffect(() => {
    // If the user was looking at "today", follow the date when it changes.
    const prev = prevToday.current;
    if (prev !== today) { prevToday.current = today; setSelected((s) => (s === prev ? today : s)); }
  }, [today]);
  const p = useMemo(() => predict(logs, settings, today), [logs, settings, today]);
  const map = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  // In pregnancy mode cycle predictions are paused: only logged days are coloured.
  const kindOf = (d: DateStr) => (settings.pregnancyLmp ? ((map.get(d)?.flow ?? 0) >= 2 ? 'period' : 'none') : classifyDay(d, map, p, settings));
  // Pregnancy mode: one calculation (core pregnancyView) drives both the illustration and the caption.
  const pregMode = !!settings.pregnancyLmp;
  const preg = pregMode ? pregnancyView(settings.pregnancyLmp, selected) : null;

  const lastPeriodEnd = p.lastPeriodStart && logs.filter((l) => l.flow >= 2 && l.date >= p.lastPeriodStart!).map((l) => l.date).sort().pop();
  const cycleDay = cycleDayOf(selected, logs);
  const status = statusFor({
    hasData: !!p.lastPeriodStart, today, date: selected, kind: kindOf(selected), cycleDay, phase: p.phase,
    daysUntilPeriod: p.daysUntilPeriod, fertileWindow: settings.showFertileWindow === false ? null : p.fertileWindow, ovulationDate: p.ovulationDate,
    inPeriod: !!lastPeriodEnd && selected >= p.lastPeriodStart! && selected <= lastPeriodEnd && (map.get(selected)?.flow ?? 0) >= 1,
    lateBy: p.lateBy, lateDismissed: p.lateDismissed, noForecast: p.noForecast, stage: settings.stage,
  });
  const updateSettings = useStore((s) => s.updateSettings);
  const stage = settings.stage;
  const mood: Mood = preg ? 'pregnancy' : status.mood;
  const bloom: Bloom = bloomFor(mood);
  const c = centre(status, cycleDay, (map.get(selected)?.flow ?? 0) >= 1, selected === today, !!p.ovulation?.confirmed);
  const progress = preg ? Math.min(1, (preg.week * 7 + preg.day) / 280) : p.noForecast ? null : cycleDay ? Math.min(1, cycleDay / Math.max(p.stats.avgCycle, cycleDay)) : null;

  const tipKey = p.lateBy && !p.lateDismissed ? 'late' : p.phase ?? 'none';
  // Calm, situation-aware headline + article for the insight card.
  const insight: { title: string; article?: string } =
    p.noForecast === 'loss' ? { title: 'Be gentle with yourself', article: 'after-loss' }
      : p.noForecast === 'postpartum' ? { title: 'Your cycle after giving birth', article: 'postpartum' }
        : p.noForecast === 'paused' ? { title: 'Tracking is paused. Resume whenever you like' }
          : p.noForecast === 'user' ? { title: 'Your cycle, at your own pace', article: 'irregular' }
            : p.noForecast === 'no-uterus' ? { title: 'Listen to your body today' }
          : p.lateBy && !p.lateDismissed ? { title: 'Why your forecast is a range', article: 'irregular' }
            : { title: HEADLINE[mood] };
  const tips = ARTICLES.filter((a) => !(hideSex && a.sensitive)).sort((a, b) => +!!b.phases?.includes(tipKey as never) - +!!a.phases?.includes(tipKey as never));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PetalBackdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <TabHeader title={selected === today ? 'Today' : fmtDay(selected)} onAvatar={() => nav.openSettings()}
          right={<PressScale accessibilityLabel="Open calendar" onPress={() => nav.openCalendar()} style={st.iconBtn}><Icon name="calendar-month-outline" size={28} color={colors.heading} /></PressScale>} />
        <WeekStrip today={today} selected={selected} onSelect={setSelected} kindOf={kindOf} />

        <View style={{ marginTop: 4 }}>
          {preg ? (
            <>
              <PregnancyIllustration stage={preg.stage} />
              <PregnancyCaption view={preg} />
            </>
          ) : pregMode ? (
            <PregnancySetup onSetup={() => nav.openSettings('pregnancy')} />
          ) : (
            <BloomCircle bloom={bloom} progress={progress} celebrateKey={nav.celebrateKey} {...c}
              a11y={`${status.kicker} ${status.big}. ${status.sub}`} />
          )}
        </View>

        <FadeIn delay={120} style={st.actions}>
          {preg ? (
            <>
              <ActionPill icon="baby" label="This week" onPress={() => nav.openWeek(preg.week)} />
              <ActionPill icon={scheme === 'dark' ? 'waveform' : 'symptoms'} label="Symptoms" onPress={() => nav.openLog(selected)} />
            </>
          ) : stage?.kind === 'paused' ? (
            <>
              <ActionPill icon="refresh" label="Resume" onPress={() => updateSettings({ stage: { kind: 'cycling' } })} />
              <ActionPill icon={scheme === 'dark' ? 'waveform' : 'symptoms'} label="Symptoms" onPress={() => nav.openLog(selected)} />
            </>
          ) : p.noForecast === 'postpartum' && stage?.kind === 'postpartum' ? (
            <>
              <ActionPill icon={scheme === 'dark' ? 'water' : 'water-outline'} label="Period started" onPress={() => { updateSettings({ stage: { ...stage, returnedOn: today } }); nav.openCalendar(true); }} />
              <ActionPill icon={scheme === 'dark' ? 'waveform' : 'symptoms'} label="Log today" onPress={() => nav.openLog(selected)} />
            </>
          ) : (
            <>
              <ActionPill icon={scheme === 'dark' ? 'water' : 'water-outline'} label="Log period" onPress={() => nav.openCalendar(true)} />
              <ActionPill icon={scheme === 'dark' ? 'waveform' : 'symptoms'} label="Symptoms" onPress={() => nav.openLog(selected)} />
            </>
          )}
        </FadeIn>

        <FadeIn delay={200} style={{ marginHorizontal: 16 }}>
          <InsightCard title={insight.title} onPress={() => (preg ? nav.openWeek(preg.week) : nav.openArticle(insight.article ?? tips[0].id))} />
        </FadeIn>

        <HomeWidgets onOpen={(def) => (def.opens ? nav.openHealth(def.opens) : def.id === 'cycleStats' || def.id === 'nextPeriod' ? nav.openChart('cycles') : nav.openLog(today))} />

        {!preg && p.lastPeriodStart ? <ForecastCard p={p} today={today} showFertile={settings.showFertileWindow !== false} contra={settings.profile ? contraceptionStatus(settings.profile, today) : null} /> : null}
      </ScrollView>
    </View>
  );
}

const CONF_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' } as const;
const fmtRange = (a: DateStr, b: DateStr) => (a.slice(5, 7) === b.slice(5, 7) ? `${+a.slice(8)}–${fmtDay(b)}` : `${fmtDay(a)} – ${fmtDay(b)}`);

/**
 * "Next period" card: the likely window and confidence, the reasons behind it ("why this date"),
 * a note when the estimate moved, and a neutral late notice that can be dismissed for this cycle.
 */
function ForecastCard({ p, today, showFertile, contra }: { p: ReturnType<typeof predict>; today: DateStr; showFertile: boolean; contra: string | null }) {
  const nav = useNav();
  const [why, setWhy] = useState(false);
  const seen = useStore((s) => s.seenForecast);
  const setPrefs = useStore((s) => s.setPrefs);
  const updateSettings = useStore((s) => s.updateSettings);
  const next = p.nextPeriodStart;
  useEffect(() => { if (next && !seen) setPrefs({ seenForecast: next }); }, [next, seen, setPrefs]);
  const moved = next && seen && seen !== next && Math.abs(diffDays(seen, next)) >= 2 ? seen : null;
  const late = p.lateBy && !p.lateDismissed;
  return (
    <FadeIn delay={320} style={st.summary}>
      {p.noForecast ? (
        <View style={{ paddingVertical: 12 }}>
          <Text style={st.fcTitle}>{p.noForecast === 'user' ? 'Forecast off' : p.noForecast === 'paused' ? 'Tracking paused' : 'No forecast right now'}</Text>
          {p.notes.map((n, i) => <Text key={i} style={st.fcNote}>{n}</Text>)}
          {p.noForecast === 'user' ? <Btn kind="ghost" title="Turn forecast on" onPress={() => updateSettings({ forecastMode: 'auto' })} style={{ marginTop: 8 }} /> : null}
        </View>
      ) : next && p.nextPeriodRange ? (
        <>
          <View style={[st.sumRow, st.sumDivider, { alignItems: 'flex-start' }]}>
            <View style={[st.sumIcon, { backgroundColor: colors.tile }]}><Icon name="water" size={20} color={colors.period} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>Next period</Text>
              <Text style={st.fcBig}>{fmtRange(p.nextPeriodRange[0], p.nextPeriodRange[1])}</Text>
              <Text style={st.fcSub}>Most likely {fmtDay(next)}</Text>
            </View>
            <View style={[st.chip, p.confidence === 'high' ? { borderColor: colors.fertile } : p.confidence === 'low' ? { borderColor: colors.faint } : null]}>
              <Text style={st.chipT}>{CONF_LABEL[p.confidence]}</Text>
            </View>
          </View>
          {late ? (
            <View style={[st.sumDivider, { paddingVertical: 12 }]} accessibilityLiveRegion="polite">
              <Text style={st.fcTitle}>Your period hasn’t started yet</Text>
              <Text style={st.fcNote}>It is {p.lateBy} day{p.lateBy === 1 ? '' : 's'} past your likely window. Cycles vary, and stress, travel, illness or changes in contraception can shift timing.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Btn kind="ghost" title="Log period" onPress={() => nav.openCalendar(true)} style={{ flex: 1 }} />
                <Btn kind="ghost" title="Hide for this cycle" onPress={() => updateSettings({ lateDismissedFor: next })} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
          {moved ? (
            <View style={[st.sumDivider, { paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[st.fcNote, { flex: 1, marginTop: 0 }]}>Estimate moved from {fmtDay(moved)} to {fmtDay(next)} after your latest logs.</Text>
              <PressScale accessibilityRole="button" accessibilityLabel="Got it" onPress={() => setPrefs({ seenForecast: next })} style={{ padding: 10 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>OK</Text></PressScale>
            </View>
          ) : null}
          {showFertile && p.fertileWindow && p.fertileWindow[1] >= today ? <SummaryItem icon="flower-outline" color={colors.fertile} label="Fertile window" value={fmtRange(p.fertileWindow[0], p.fertileWindow[1])} /> : null}
          {p.ovulation ? <SummaryItem icon="sparkle" color={colors.ovulation} label={p.ovulation.confirmed ? 'Ovulation confirmed' : 'Ovulation (estimated)'} value={fmtDay(p.ovulation.date)} /> : null}
          {contra ? <SummaryItem icon="pill" color={colors.primary} label="Contraception" value={contra.replace(/^Pill pack /, 'Pack ')} /> : null}
          <SummaryItem icon="refresh" color={colors.ovulation} label="Typical cycle" value={`${p.stats.avgCycle} days`} />
          <PressScale accessibilityRole="button" accessibilityState={{ expanded: why }} accessibilityLabel="Why this estimate" onPress={() => setWhy(!why)} style={st.whyRow}>
            <Icon name="info" size={18} color={colors.muted} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 15, color: colors.text }}>Why this estimate</Text>
            <Icon name={why ? 'chevron-left' : 'chevron-right'} size={16} color={colors.muted} style={{ transform: [{ rotate: why ? '-90deg' : '90deg' }] }} />
          </PressScale>
          {why ? (
            <View style={{ paddingBottom: 12 }}>
              {p.notes.map((n, i) => <Text key={i} style={st.fcNote}>• {n}</Text>)}
              <PressScale accessibilityRole="button" onPress={() => nav.openChart('cycles')} style={{ paddingVertical: 8 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>Review which cycles count</Text></PressScale>
            </View>
          ) : null}
        </>
      ) : null}
    </FadeIn>
  );
}

const SummaryItem = ({ icon, color, label, value, last }: { icon: IconName; color: string; label: string; value: string; last?: boolean }) => (
  <View style={[st.sumRow, !last && st.sumDivider]}>
    <View style={[st.sumIcon, { backgroundColor: colors.tile }]}><Icon name={icon} size={20} color={color} /></View>
    <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{label}</Text>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.heading }}>{value}</Text>
  </View>
);

const st = themed(() => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 10, minHeight: 56 },
  headerRight: { width: 52, alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '700', color: colors.heading },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  avatarT: { color: colors.heading, fontWeight: '800', fontSize: 20 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 6, marginBottom: 14 },
  summary: { backgroundColor: colors.card, borderRadius: 24, marginHorizontal: 16, marginTop: 20, paddingVertical: 4, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, ...shadow },
  sumRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sumDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  fcTitle: { fontSize: 17, fontWeight: '600', color: colors.heading },
  fcBig: { fontSize: 22, fontWeight: '700', color: colors.heading, marginTop: 2 },
  fcSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  fcNote: { fontSize: 14.5, color: colors.text, lineHeight: 21, marginTop: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  chipT: { fontSize: 12, color: colors.heading, fontWeight: '600' },
  whyRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  sumIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
}));
