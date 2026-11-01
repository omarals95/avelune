import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, useColorScheme } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { Text } from './text';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, VarelaRound_400Regular } from '@expo-google-fonts/varela-round';
import { PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold } from '@expo-google-fonts/nunito-sans';
import { predict, today as todayFn } from '@cyclo/core';
import { ND, PressScale } from './anim';
import { Icon, type IconName } from './icons';
import { NavContext, resume, type ChartKind, type Nav, type SettingsPage } from './nav';
import { useHealth } from './health/store';
import type { HealthTab } from './widgets';
import { Health } from './screens/Health';
import { Connections } from './screens/Connections';
import { todayISO } from './today';
import { scheduleReminders } from './reminders';
import { selectLogs, selectSettings, useStore } from './store';
import { applyScheme, colors, scheme, themed } from './theme';
import { Sheet } from './ui';
import { SheetOutlet } from './sheet';
import { CalendarView } from './screens/Calendar';
import { ChartScreen, Insights } from './screens/Insights';
import { LogSheet } from './screens/LogSheet';
import { Onboarding } from './screens/Onboarding';
import { PartnerRoot, PartnerTab } from './screens/Partner';
import { Settings } from './screens/Settings';
import { ArticleSheet, WeekSheet } from './screens/Sheets';
import { Today } from './screens/Today';

const TABS: [Tab, string, IconName, IconName][] = [
  ['today', 'Today', 'home', 'home-fill'],
  ['health', 'Health', 'chart-bar', 'chart-bar-fill'],
  ['insights', 'Insights', 'book', 'book-fill'],
  ['partner', 'Partner', 'users', 'users-fill'],
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
  const pref = useStore((s) => s.theme) ?? 'system';
  const system = useColorScheme();
  const eff = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  // Swap the live token objects before any child renders; the keyed view below remounts the tree.
  applyScheme(eff);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
    if (Platform.OS === 'android') {
      void NavigationBar.setButtonStyleAsync(eff === 'dark' ? 'light' : 'dark').catch(() => undefined);
    }
  }, [eff]);
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, VarelaRound_400Regular, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold });
  const ready = hydrated && (fontsLoaded || !!fontError);
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <View key={eff} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={eff === 'dark' ? 'light' : 'dark'} />
      {partner && !onboarded ? <PartnerRoot /> : !onboarded ? <Onboarding /> : <Main />}
      <SystemBarBackdrop />
      <SheetOutlet />
    </View>
  );
}

/**
 * Android 15 draws apps edge-to-edge, so the gesture/navigation bar sits over the content.
 * Paint a solid strip in the page colour behind it so it never looks see-through.
 */
function SystemBarBackdrop() {
  const insets = useSafeAreaInsets();
  if (!insets.bottom) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom, backgroundColor: colors.bg }} />;
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const [logDate, setLogDate] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<{ edit: boolean } | null>(null);
  const [settings, setSettings] = useState<SettingsPage | null>(() => { const r = resume.settings ?? null; resume.settings = undefined; return r; });
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
      {/* Floating tab bar card with the quick-log button inside (reference: Avelune daily screens). */}
      <View pointerEvents="box-none" style={[st.navWrap, { bottom: Math.max(insets.bottom, 8) + 4 }]}>
        <View style={st.bar}>
          <View style={st.tabs} accessibilityRole="tablist">
            {TABS.map(([k, l, icon, active]) => {
              const on = tab === k;
              const tint = on ? colors.navIconActive : colors.navIcon;
              return (
                <PressScale key={k} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: on }} style={st.tab} onPress={() => go(k)}>
                  <View style={[st.tabInner, on && scheme === 'light' && st.tabActive]}>
                    <Icon name={on ? active : icon} size={26} color={tint} />
                    <Text style={[st.tabT, { color: tint }, on && { fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{l}</Text>
                    {on && scheme === 'dark' ? <View style={st.tabUnderline} /> : null}
                  </View>
                </PressScale>
              );
            })}
          </View>
          <PressScale accessibilityRole="button" accessibilityLabel="Log today" onPress={() => setLogDate(todayISO())} style={st.fab}>
            <Icon name="plus" size={30} color={colors.fabIcon} />
          </PressScale>
        </View>
      </View>

      <Sheet visible={!!logDate} onClose={() => setLogDate(null)}>{logDate ? <LogSheet date={logDate} onClose={() => setLogDate(null)} /> : null}</Sheet>
      <Sheet visible={!!calendar} onClose={() => setCalendar(null)} >
        {calendar ? <CalendarView startEditing={calendar.edit} onClose={() => setCalendar(null)} onDay={(d) => { setCalendar(null); setLogDate(d); }} /> : null}
      </Sheet>
      <Sheet visible={!!settings} onClose={() => setSettings(null)}>{settings ? <Settings page={settings} onClose={() => setSettings(null)} /> : null}</Sheet>
      <Sheet visible={!!article} onClose={() => setArticle(null)} >{article ? <ArticleSheet id={article} onClose={() => setArticle(null)} /> : null}</Sheet>
      <Sheet visible={week != null} onClose={() => setWeek(null)}>{week != null ? <WeekSheet week={week} onClose={() => setWeek(null)} /> : null}</Sheet>
      <Sheet visible={!!chart} onClose={() => setChart(null)}>{chart ? <ChartScreen kind={chart} onClose={() => setChart(null)} /> : null}</Sheet>
      <Sheet visible={connections} onClose={() => setConnections(false)}>{connections ? <Connections onClose={() => setConnections(false)} /> : null}</Sheet>
    </NavContext.Provider>
  );
}

const st = themed(() => StyleSheet.create({
  navWrap: { position: 'absolute', left: 10, right: 10, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 560, backgroundColor: colors.navBg, borderRadius: 30, paddingVertical: 8, paddingLeft: 6, paddingRight: 8, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: scheme === 'dark' ? 0.4 : 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  tabs: { flexDirection: 'row', flex: 1 },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', minHeight: 62, borderRadius: 999, marginHorizontal: 2, paddingHorizontal: 2 },
  tabActive: { backgroundColor: colors.navActive, width: 70, height: 68, alignSelf: 'center' },
  tabT: { fontSize: 12.5, marginTop: 3 },
  tabUnderline: { position: 'absolute', bottom: 0, width: 22, height: 3, borderRadius: 2, backgroundColor: colors.navIconActive },
  fab: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.fab, alignItems: 'center', justifyContent: 'center', marginLeft: 6, shadowColor: colors.fab, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
}));
