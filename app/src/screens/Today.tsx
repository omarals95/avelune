import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classifyDay, cycleDayOf, predict, pregnancyStatus, today as todayFn, type DateStr } from '@cyclo/core';
import { FadeIn, PressScale } from '../anim';
import { ARTICLES } from '../content';
import { WeekStrip, fmtDay, statusFor, type Status } from '../components';
import { ActionPill, BloomCircle, InsightCard } from '../bloom';
import { Icon, type IconName } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { bloomFor, colors, scheme, shadow, themed, type Bloom, type Mood } from '../theme';
import { HomeWidgets } from '../widgets';

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
export function centre(s: Status, cycleDay: number | null, logged: boolean, isToday: boolean): { kicker: string; big: string; sub?: string; glyph?: IconName } {
  const cd = cycleDay ? `Cycle day ${cycleDay}` : undefined;
  if (s.mood === 'menstrual' && s.big !== 'Expected today' && s.kicker !== 'Period in') {
    return { kicker: 'Period', big: s.big.startsWith('Day') ? s.big : `Day ${cycleDay ?? 1}`, sub: logged ? 'Logged' : 'Predicted', glyph: 'water' };
  }
  if (s.mood === 'fertile') return { kicker: '', big: 'Fertile window', sub: isToday && s.big.startsWith('Ovulation in') ? s.big : 'Estimated', glyph: 'sprout' };
  if (s.mood === 'ovulation') return { kicker: '', big: 'Ovulation', sub: isToday ? 'Estimated today' : 'Estimated', glyph: 'sparkle' };
  if (s.mood === 'follicular' && isToday) return { kicker: '', big: 'After your period', sub: cd, glyph: 'sprout' };
  if (s.mood === 'luteal' && isToday) return { kicker: s.kicker, big: s.big, sub: cd, glyph: 'flower-outline' };
  return { kicker: s.kicker, big: s.big, sub: s.sub, glyph: undefined };
}

export function Today() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const records = useStore((s) => s.records);
  const hideSex = useStore((s) => s.hideSex);
  const logs = useMemo(() => selectLogs(records), [records]);
  const settings = selectSettings(records);
  const today = todayFn();
  const [selected, setSelected] = useState<DateStr>(today);
  const p = useMemo(() => predict(logs, settings, today), [logs, settings, today]);
  const map = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  // In pregnancy mode cycle predictions are paused: only logged days are coloured.
  const kindOf = (d: DateStr) => (settings.pregnancyLmp ? ((map.get(d)?.flow ?? 0) >= 2 ? 'period' : 'none') : classifyDay(d, map, p, settings));
  const preg = settings.pregnancyLmp ? pregnancyStatus(settings.pregnancyLmp, selected) : null;

  const lastPeriodEnd = p.lastPeriodStart && logs.filter((l) => l.flow >= 2 && l.date >= p.lastPeriodStart!).map((l) => l.date).sort().pop();
  const cycleDay = cycleDayOf(selected, logs);
  const status = statusFor({
    hasData: !!p.lastPeriodStart, today, date: selected, kind: kindOf(selected), cycleDay, phase: p.phase,
    daysUntilPeriod: p.daysUntilPeriod, fertileWindow: settings.showFertileWindow === false ? null : p.fertileWindow, ovulationDate: p.ovulationDate,
    inPeriod: !!lastPeriodEnd && selected >= p.lastPeriodStart! && selected <= lastPeriodEnd && (map.get(selected)?.flow ?? 0) >= 1,
  });
  const mood: Mood = preg ? 'pregnancy' : status.mood;
  const bloom: Bloom = bloomFor(mood);
  const c = centre(status, cycleDay, (map.get(selected)?.flow ?? 0) >= 1, selected === today);
  const progress = preg ? Math.min(1, (preg.week * 7 + preg.day) / 280) : cycleDay ? Math.min(1, cycleDay / Math.max(p.stats.avgCycle, cycleDay)) : null;

  const tipKey = p.daysUntilPeriod != null && p.daysUntilPeriod < 0 ? 'late' : p.phase ?? 'none';
  const tips = ARTICLES.filter((a) => !(hideSex && a.sensitive)).sort((a, b) => +!!b.phases?.includes(tipKey as never) - +!!a.phases?.includes(tipKey as never));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <TabHeader title={selected === today ? 'Today' : fmtDay(selected)} onAvatar={() => nav.openSettings()}
          right={<PressScale accessibilityLabel="Open calendar" onPress={() => nav.openCalendar()} style={st.iconBtn}><Icon name="calendar-month-outline" size={28} color={colors.heading} /></PressScale>} />
        <WeekStrip today={today} selected={selected} onSelect={setSelected} kindOf={kindOf} />

        <View style={{ marginTop: 4 }}>
          {preg ? (
            <BloomCircle bloom={bloom} progress={progress} celebrateKey={nav.celebrateKey} glyph="baby"
              kicker={`Week ${preg.week}`} big={`Day ${preg.day + 1}`}
              sub={preg.daysToGo > 0 ? `${Math.ceil(preg.daysToGo / 7)} weeks to go` : `Due ${fmtDay(preg.dueDate)}`} />
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
          ) : (
            <>
              <ActionPill icon={scheme === 'dark' ? 'water' : 'water-outline'} label="Log period" onPress={() => nav.openCalendar(true)} />
              <ActionPill icon={scheme === 'dark' ? 'waveform' : 'symptoms'} label="Symptoms" onPress={() => nav.openLog(selected)} />
            </>
          )}
        </FadeIn>

        <FadeIn delay={200} style={{ marginHorizontal: 16 }}>
          <InsightCard bloom={bloom} title={HEADLINE[mood]} onPress={() => (preg ? nav.openWeek(preg.week) : nav.openArticle(tips[0].id))} />
        </FadeIn>

        <HomeWidgets onOpen={(def) => (def.opens ? nav.openHealth(def.opens) : def.id === 'cycleStats' || def.id === 'nextPeriod' ? nav.openChart('cycles') : nav.openLog(today))} />

        {!preg && p.nextPeriodStart && (
          <FadeIn delay={320} style={st.summary}>
            <SummaryItem icon="water" color={colors.period} label="Next period" value={fmtDay(p.nextPeriodStart)} />
            {settings.showFertileWindow !== false && p.fertileWindow && <SummaryItem icon="flower-outline" color={colors.fertile} label="Fertile window" value={`${fmtDay(p.fertileWindow[0]).split(' ')[0]}–${fmtDay(p.fertileWindow[1])}`} />}
            <SummaryItem icon="refresh" color={colors.ovulation} label="Average cycle" value={`${p.stats.avgCycle} days`} last />
          </FadeIn>
        )}
      </ScrollView>
    </View>
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
  sumIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
}));
