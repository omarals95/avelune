import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { predict, today as todayFn } from '@cyclo/core';
import { ND, PressScale } from './anim';
import { Icon, type IconName } from './icons';
import { NavContext, type ChartKind, type Nav, type SettingsPage } from './nav';
import { scheduleReminders } from './reminders';
import { selectLogs, selectSettings, useStore } from './store';
import { colors } from './theme';
import { Sheet } from './ui';
import { CalendarView } from './screens/Calendar';
import { ChartScreen, Insights } from './screens/Insights';
import { LogSheet } from './screens/LogSheet';
import { Onboarding } from './screens/Onboarding';
import { PartnerRoot, PartnerTab } from './screens/Partner';
import { Settings } from './screens/Settings';
import { ArticleSheet, WeekSheet } from './screens/Sheets';
import { Today } from './screens/Today';

const TABS: [Tab, string, IconName, IconName][] = [
  ['today', 'Today', 'calendar-blank-outline', 'calendar-text'],
  ['insights', 'Insights', 'view-grid-outline', 'view-grid'],
  ['partner', 'Partner', 'account-multiple-outline', 'account-multiple'],
];
type Tab = 'today' | 'insights' | 'partner';

export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}

function Root() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  const onboarded = useStore((s) => s.onboarded);
  const partner = useStore((s) => s.partner);
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {partner && !onboarded ? <PartnerRoot /> : !onboarded ? <Onboarding /> : <Main />}
    </View>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const [logDate, setLogDate] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<{ edit: boolean } | null>(null);
  const [settings, setSettings] = useState<SettingsPage | null>(null);
  const [article, setArticle] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [chart, setChart] = useState<ChartKind | null>(null);
  const [celebrateKey, setCelebrate] = useState(0);

  const connected = useStore((s) => !!s.server);
  const sync = useStore((s) => s.sync);
  const records = useStore((s) => s.records);
  const reminders = useStore((s) => s.reminders);
  const share = useStore((s) => !!s.share);
  const publishShare = useStore((s) => s.publishShare);

  useEffect(() => { if (connected) void sync(); }, [connected, sync]);
  // Keep on-device reminders and the encrypted partner snapshot in step with the data (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      const st = selectSettings(records);
      void scheduleReminders(predict(selectLogs(records), st, todayFn()), st, reminders).catch(() => undefined);
      if (share) void publishShare();
    }, 1200);
    return () => clearTimeout(t);
  }, [records, reminders, share, publishShare]);

  const nav: Nav = useMemo(() => ({
    openLog: setLogDate,
    openCalendar: (edit) => setCalendar({ edit: !!edit }),
    openSettings: (p) => setSettings(p ?? 'main'),
    openArticle: setArticle,
    openWeek: setWeek,
    openChart: setChart,
    celebrate: () => { setTab('today'); setCelebrate((n) => n + 1); },
    celebrateKey,
  }), [celebrateKey]);

  const fade = useRef(new Animated.Value(1)).current;
  const go = (t: Tab) => {
    if (t === tab) return;
    fade.setValue(0);
    setTab(t);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: ND }).start();
  };

  return (
    <NavContext.Provider value={nav}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        {tab === 'today' && <Today />}
        {tab === 'insights' && <Insights />}
        {tab === 'partner' && <PartnerTab />}
      </Animated.View>
      <View style={[st.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
        {TABS.map(([k, l, icon, active]) => (
          <PressScale key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: tab === k }} style={st.tab} onPress={() => go(k)}>
            <Icon name={tab === k ? active : icon} size={30} color={tab === k ? colors.text : colors.faint} />
            <Text style={[st.tabT, tab === k && { color: colors.text }]}>{l}</Text>
          </PressScale>
        ))}
      </View>

      <Sheet visible={!!logDate} onClose={() => setLogDate(null)}>{logDate ? <LogSheet date={logDate} onClose={() => setLogDate(null)} /> : null}</Sheet>
      <Sheet visible={!!calendar} onClose={() => setCalendar(null)} bg="#fff">
        {calendar ? <CalendarView startEditing={calendar.edit} onClose={() => setCalendar(null)} onDay={(d) => { setCalendar(null); setLogDate(d); }} /> : null}
      </Sheet>
      <Sheet visible={!!settings} onClose={() => setSettings(null)}>{settings ? <Settings page={settings} onClose={() => setSettings(null)} /> : null}</Sheet>
      <Sheet visible={!!article} onClose={() => setArticle(null)} bg="#fff">{article ? <ArticleSheet id={article} onClose={() => setArticle(null)} /> : null}</Sheet>
      <Sheet visible={week != null} onClose={() => setWeek(null)}>{week != null ? <WeekSheet week={week} onClose={() => setWeek(null)} /> : null}</Sheet>
      <Sheet visible={!!chart} onClose={() => setChart(null)}>{chart ? <ChartScreen kind={chart} onClose={() => setChart(null)} /> : null}</Sheet>
    </NavContext.Provider>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: '#fff', paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center' },
  tabT: { color: colors.faint, fontSize: 15, marginTop: 2 },
});
