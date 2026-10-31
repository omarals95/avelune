import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classifyDay, cycleDayOf, predict, pregnancyStatus, today as todayFn, type DateStr } from '@cyclo/core';
import { FadeIn, PressScale } from '../anim';
import { ARTICLES, TIPS, pregnancyWeek } from '../content';
import { MoodBackground, QuickAction, StatusCircle, StoryCard, WeekStrip, fmtDay, statusFor } from '../components';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { colors } from '../theme';

export function Avatar({ onPress }: { onPress: () => void }) {
  const name = useStore((s) => s.name);
  return (
    <PressScale accessibilityLabel="Settings" onPress={onPress} style={st.avatar}>
      {name ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{name[0].toUpperCase()}</Text> : <Icon name="moon-waning-crescent" size={26} color="#fff" />}
    </PressScale>
  );
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
  const status = statusFor({
    hasData: !!p.lastPeriodStart, today, date: selected, kind: kindOf(selected), cycleDay: cycleDayOf(selected, logs), phase: p.phase,
    daysUntilPeriod: p.daysUntilPeriod, fertileWindow: settings.showFertileWindow === false ? null : p.fertileWindow, ovulationDate: p.ovulationDate,
    inPeriod: !!lastPeriodEnd && selected >= p.lastPeriodStart! && selected <= lastPeriodEnd && (map.get(selected)?.flow ?? 0) >= 1,
  });
  const tipKey = p.daysUntilPeriod != null && p.daysUntilPeriod < 0 ? 'late' : p.phase ?? 'none';
  const tips = ARTICLES.filter((a) => !(hideSex && a.sensitive)).sort((a, b) => +!!b.phases?.includes(tipKey as never) - +!!a.phases?.includes(tipKey as never));
  const dayIdx = Math.floor(Date.now() / 86400000);

  return (
    <View style={{ flex: 1 }}>
      <MoodBackground mood={preg ? 'pregnancy' : status.mood} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <View style={st.header}>
          <Avatar onPress={() => nav.openSettings()} />
          <Text style={st.date}>{fmtDay(selected)}</Text>
          <PressScale accessibilityLabel="Open calendar" onPress={() => nav.openCalendar()} style={st.iconBtn}><Icon name="calendar-month-outline" size={32} color={colors.text} /></PressScale>
        </View>
        <WeekStrip today={today} selected={selected} onSelect={setSelected} kindOf={kindOf} />

        {preg ? (
          <StatusCircle celebrateKey={nav.celebrateKey} ring={(preg.week * 7 + preg.day) / 280}
            status={{ mood: 'pregnancy', kicker: `Week ${preg.week}`, big: `Day ${preg.day + 1}`, sub: preg.daysToGo > 0 ? `${Math.ceil(preg.daysToGo / 7)} weeks to go · due ${fmtDay(preg.dueDate)}` : `Due ${fmtDay(preg.dueDate)}` }}>
            <Text style={{ fontSize: 44, marginBottom: 4 }}>{pregnancyWeek(preg.week).emoji}</Text>
          </StatusCircle>
        ) : (
          <StatusCircle status={status} celebrateKey={nav.celebrateKey} />
        )}

        <FadeIn delay={120} style={st.actions}>
          {preg ? (
            <>
              <QuickAction icon="baby-face-outline" label="Details" filled onPress={() => nav.openWeek(preg.week)} />
              <QuickAction icon="plus" label="Symptoms" onPress={() => nav.openLog(selected)} />
              {!hideSex && <QuickAction icon="heart-outline" label="Sex" onPress={() => nav.openLog(selected)} />}
              <QuickAction icon="scale-bathroom" label="Weight" onPress={() => nav.openLog(selected)} />
            </>
          ) : (
            <>
              <QuickAction icon="water" label="Log period" filled onPress={() => nav.openCalendar(true)} />
              <QuickAction icon="plus" label="Symptoms" onPress={() => nav.openLog(selected)} />
              {!hideSex && <QuickAction icon="heart-outline" label="Sex" onPress={() => nav.openLog(selected)} />}
            </>
          )}
        </FadeIn>

        <FadeIn delay={220}>
          <Text style={st.section}>My daily insights · {selected === today ? 'Today' : fmtDay(selected)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {preg ? (
              <>
                <StoryCard title={`Your baby at ${preg.week} weeks`} tint="#FBE3D6" ink={colors.pregnancy} emoji={pregnancyWeek(preg.week).emoji} onPress={() => nav.openWeek(preg.week)} />
                <StoryCard title={`Your body at ${preg.week} weeks`} tint="#E4ECFA" ink="#4A6FB5" icon="human-pregnant" onPress={() => nav.openWeek(preg.week)} />
              </>
            ) : (
              <StoryCard title={TIPS[tipKey][dayIdx % TIPS[tipKey].length]} tint="#FFFFFF" ink={colors.primary} icon="lightbulb-on-outline" onPress={() => nav.openArticle(tips[0].id)} />
            )}
            {tips.map((a) => <StoryCard key={a.id} title={a.title} tint={a.tint} ink={a.ink} icon={a.icon} onPress={() => nav.openArticle(a.id)} />)}
          </ScrollView>
        </FadeIn>

        {!preg && p.nextPeriodStart && (
          <FadeIn delay={320} style={st.summary}>
            <SummaryItem icon="water" color={colors.period} label="Next period" value={fmtDay(p.nextPeriodStart)} />
            {settings.showFertileWindow !== false && p.fertileWindow && <SummaryItem icon="flower-outline" color={colors.fertile} label="Fertile window" value={`${fmtDay(p.fertileWindow[0]).split(' ')[0]}–${fmtDay(p.fertileWindow[1])}`} />}
            <SummaryItem icon="refresh" color={colors.today} label="Average cycle" value={`${p.stats.avgCycle} days`} />
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}

const SummaryItem = ({ icon, color, label, value }: { icon: 'water' | 'flower-outline' | 'refresh'; color: string; label: string; value: string }) => (
  <View style={st.sumRow}>
    <View style={[st.sumIcon, { backgroundColor: color + '22' }]}><Icon name={icon} size={20} color={color} /></View>
    <Text style={{ flex: 1, fontSize: 16, color: colors.muted }}>{label}</Text>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{value}</Text>
  </View>
);

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.fertile, alignItems: 'center', justifyContent: 'center' },
  date: { fontSize: 22, fontWeight: '600', color: colors.text },
  iconBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 12, marginTop: 4, marginBottom: 24 },
  section: { fontSize: 18, fontWeight: '600', color: colors.text, marginHorizontal: 20, marginBottom: 12 },
  summary: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 22, marginHorizontal: 20, marginTop: 24, padding: 8, paddingHorizontal: 16 },
  sumRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  sumIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
