import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from './text';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, VarelaRound_400Regular } from '@expo-google-fonts/varela-round';
import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold } from '@expo-google-fonts/nunito-sans';
import { predict, today as todayFn } from '@cyclo/core';
import { ND, PressScale } from './anim';
import { Icon, type IconName } from './icons';
import { NavContext, type ChartKind, type Nav, type SettingsPage } from './nav';
import { useHealth } from './health/store';
import type { HealthTab } from './widgets';
import { Health } from './screens/Health';
import { Connections } from './screens/Connections';
import { todayISO } from './today';
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
  ['health', 'Health', 'heart-outline', 'heart'],
  ['insights', 'Insights', 'chart-box-outline', 'chart-box'],
  ['partner', 'Partner', 'account-multiple-outline', 'account-multiple'],
];
type Tab = 'today' | 'health' | 'insights' | 'partner';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}

function Root() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  const onboarded = useStore((s) => s.onboarded);
  const partner = useStore((s) => s.partner);
  const [fontsLoaded, fontError] = useFonts({ VarelaRound_400Regular, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold });
  const ready = hydrated && (fontsLoaded || !!fontError);
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
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
  const [healthTab, setHealthTab] = useState<HealthTab | undefined>();
  const [healthKey, setHealthKey] = useState(0);
  const [connections, setConnections] = useState(false);
  const healthSync = useHealth((s) => s.sync);
  const hasTrackers = useHealth((s) => Object.keys(s.connections).length > 0);
  useEffect(() => { if (hasTrackers) void healthSync(); }, [hasTrackers, healthSync]);

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

  const fade = useRef(new Animated.Value(1)).current;
  const go = (t: Tab) => {
    if (t === tab) return;
    fade.setValue(0);
    setTab(t);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: ND }).start();
  };

  const nav: Nav = useMemo(() => ({
    openLog: setLogDate,
    openCalendar: (edit) => setCalendar({ edit: !!edit }),
    openSettings: (p) => setSettings(p ?? 'main'),
    openArticle: setArticle,
    openWeek: setWeek,
    openChart: setChart,
    openHealth: (t) => { setHealthTab(t); setHealthKey((n) => n + 1); go('health'); },
    healthTab, healthKey,
    openConnections: () => setConnections(true),
    celebrate: () => { setTab('today'); setCelebrate((n) => n + 1); },
    celebrateKey,
  }), [celebrateKey, healthTab, healthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavContext.Provider value={nav}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        {tab === 'today' && <Today />}
        {tab === 'health' && <Health />}
        {tab === 'insights' && <Insights />}
        {tab === 'partner' && <PartnerTab />}
      </Animated.View>
      {/* Floating pill navigation (Samsung Health-style) + quick-log button. */}
      <View pointerEvents="box-none" style={[st.navWrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
        <View style={st.tabs} accessibilityRole="tablist">
          {TABS.map(([k, l, icon, active]) => (
            <PressScale key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: tab === k }} style={st.tab} onPress={() => go(k)}>
              <View style={[st.tabInner, tab === k && st.tabActive]}>
                <Icon name={tab === k ? active : icon} size={24} color="#fff" />
                <Text style={[st.tabT, tab === k && { fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{l}</Text>
              </View>
            </PressScale>
          ))}
        </View>
        <PressScale accessibilityRole="button" accessibilityLabel="Log today" onPress={() => setLogDate(todayISO())} style={st.fab}>
          <Icon name="plus" size={28} color="#fff" />
        </PressScale>
      </View>

      <Sheet visible={!!logDate} onClose={() => setLogDate(null)}>{logDate ? <LogSheet date={logDate} onClose={() => setLogDate(null)} /> : null}</Sheet>
      <Sheet visible={!!calendar} onClose={() => setCalendar(null)} bg="#fff">
        {calendar ? <CalendarView startEditing={calendar.edit} onClose={() => setCalendar(null)} onDay={(d) => { setCalendar(null); setLogDate(d); }} /> : null}
      </Sheet>
      <Sheet visible={!!settings} onClose={() => setSettings(null)}>{settings ? <Settings page={settings} onClose={() => setSettings(null)} /> : null}</Sheet>
      <Sheet visible={!!article} onClose={() => setArticle(null)} bg="#fff">{article ? <ArticleSheet id={article} onClose={() => setArticle(null)} /> : null}</Sheet>
      <Sheet visible={week != null} onClose={() => setWeek(null)}>{week != null ? <WeekSheet week={week} onClose={() => setWeek(null)} /> : null}</Sheet>
      <Sheet visible={!!chart} onClose={() => setChart(null)}>{chart ? <ChartScreen kind={chart} onClose={() => setChart(null)} /> : null}</Sheet>
      <Sheet visible={connections} onClose={() => setConnections(false)}>{connections ? <Connections onClose={() => setConnections(false)} /> : null}</Sheet>
    </NavContext.Provider>
  );
}

const st = StyleSheet.create({
  navWrap: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  tabs: { flexDirection: 'row', flex: 1, maxWidth: 520, backgroundColor: 'rgba(72,47,73,0.96)', borderRadius: 999, padding: 6, shadowColor: '#302632', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 999, paddingHorizontal: 4 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  tabT: { color: '#fff', fontSize: 12, marginTop: 2 },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg, shadowColor: '#302632', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
});
