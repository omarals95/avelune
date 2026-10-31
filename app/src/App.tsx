import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { predict, today as todayFn } from '@cyclo/core';
import { selectLogs, selectSettings, useStore } from './store';
import { scheduleReminders } from './reminders';
import { colors } from './theme';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { CalendarScreen } from './screens/CalendarScreen';
import { Insights } from './screens/Insights';
import { Settings } from './screens/Settings';
import { LogDay } from './screens/LogDay';

const TABS = [['home', 'Today'], ['calendar', 'Calendar'], ['insights', 'Insights'], ['settings', 'Settings']] as const;
type Tab = (typeof TABS)[number][0];

export default function App() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  const onboarded = useStore((s) => s.onboarded);
  const connected = useStore((s) => !!s.server);
  const sync = useStore((s) => s.sync);
  const [tab, setTab] = useState<Tab>('home');
  const [logDate, setLogDate] = useState<string | null>(null);

  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => { if (hydrated && connected) void sync(); }, [hydrated, connected, sync]);

  // Keep on-device reminders in step with the data (debounced; no network involved).
  const records = useStore((s) => s.records);
  const reminders = useStore((s) => s.reminders);
  useEffect(() => {
    if (!hydrated || !onboarded) return;
    const t = setTimeout(() => {
      const settings = selectSettings(records);
      void scheduleReminders(predict(selectLogs(records), settings, todayFn()), settings, reminders).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [hydrated, onboarded, records, reminders]);

  if (!hydrated) return <View style={st.root} />;
  return (
    <SafeAreaView style={st.root}>
      <StatusBar style="dark" />
      {!onboarded ? <Onboarding /> : logDate ? (
        <LogDay date={logDate} onClose={() => setLogDate(null)} />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            {tab === 'home' && <Home onLog={setLogDate} />}
            {tab === 'calendar' && <CalendarScreen onLog={setLogDate} />}
            {tab === 'insights' && <Insights />}
            {tab === 'settings' && <Settings />}
          </View>
          <View style={st.tabs} accessibilityRole="tablist">
            {TABS.map(([k, l]) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={st.tab} onPress={() => setTab(k)}>
                <Text style={[st.tabT, tab === k && { color: colors.primary, fontWeight: '700' }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabT: { color: colors.muted, fontSize: 14 },
});
