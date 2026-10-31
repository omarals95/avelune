import React, { useState } from 'react';
import { Alert, Platform, Share, View } from 'react-native';
import { Text } from '../text';
import { addDays, derivePeriods, lmpFromDueDate, predict, pregnancyStatus, today as todayFn, type ReminderPrefs, type TimeOfDay } from '@cyclo/core';
import { FadeIn, PressScale } from '../anim';
import { fmtDay } from '../components';
import { Icon } from '../icons';
import type { SettingsPage } from '../nav';
import { ensurePermission, remindersSupported } from '../reminders';
import { ServerForm } from '../ServerForm';
import { selectLogs, selectSettings, useStore } from '../store';
import { colors } from '../theme';
import { Btn, Card, Field, Muted, Page, Row, Section, Stepper, TopBar } from '../ui';

async function shareText(filename: string, text: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } else await Share.share({ message: text, title: filename });
}

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) ok(); }
  else Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: ok }]);
};

const hhmm = (t: { hour: number; minute: number }) => {
  const h = t.hour % 12 || 12;
  return `${h}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'am' : 'pm'}`;
};

export function Settings({ page: initial, onClose }: { page: SettingsPage; onClose: () => void }) {
  const [page, setPage] = useState<SettingsPage>(initial);
  const back = () => (page === 'main' || initial !== 'main' ? onClose() : setPage('main'));
  const titles: Record<SettingsPage, string> = {
    main: 'Settings', cycle: 'Cycle and ovulation', reminders: 'Reminders', pregnancy: 'Pregnancy mode', content: 'Hide content', sync: 'Sync & encryption', data: 'Your data', units: 'Units',
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={titles[page]} onBack={back} />
      {page === 'main' && <Main go={setPage} />}
      {page === 'cycle' && <CycleSettings />}
      {page === 'reminders' && <Reminders />}
      {page === 'pregnancy' && <Pregnancy />}
      {page === 'content' && <HideContent />}
      {page === 'units' && <Units />}
      {page === 'sync' && <Sync />}
      {page === 'data' && <Data />}
    </View>
  );
}

function Main({ go }: { go: (p: SettingsPage) => void }) {
  const st = useStore();
  const settings = selectSettings(st.records);
  return (
    <Page>
      <Card>
        <Field label="Your name (shown to your partner)" value={st.name} onChangeText={(name) => st.setPrefs({ name })} autoCapitalize="words" placeholder="Optional" />
      </Card>
      <Card>
        <Row icon="refresh" title="Cycle and ovulation" onPress={() => go('cycle')} />
        <Row icon="bell-outline" title="Reminders" onPress={() => go('reminders')} />
        <Row icon="human-pregnant" title="Pregnancy mode" subtitle={settings.pregnancyLmp ? 'On' : 'Off'} onPress={() => go('pregnancy')} />
        <Row icon="eye-off-outline" title="Hide content" onPress={() => go('content')} />
        <Row icon="ruler" title="Units" subtitle={`°${st.unit} · ${st.weightUnit}`} onPress={() => go('units')} />
      </Card>
      <Card>
        <Row icon="cloud-lock-outline" title="Sync & encryption" subtitle={st.server ? `Connected · ${st.server.email}` : 'Off: data stays on this device'} onPress={() => go('sync')} />
        <Row icon="database-export-outline" title="Your data" subtitle="Export, doctor summary, delete" onPress={() => go('data')} />
      </Card>
      <Muted style={{ textAlign: 'center' }}>Avelune is an independent, private tracker. Predictions are estimates and not a method of contraception.</Muted>
    </Page>
  );
}

function CycleSettings() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const set = (p: Partial<typeof settings>) => st.saveSettings({ ...settings, ...p });
  return (
    <Page>
      <Card>
        <Stepper label="Cycle length" value={settings.cycleLength} min={21} max={45} suffix=" days" onChange={(cycleLength) => set({ cycleLength })} />
        <Stepper label="Period length" value={settings.periodLength} min={2} max={10} suffix=" days" onChange={(periodLength) => set({ periodLength })} />
        <Muted style={{ marginTop: 8 }}>Predictions use these settings at first. Once you have logged a few periods, they are based on your logged data instead.</Muted>
      </Card>
      <Card>
        <Row title="Chance of getting pregnant" value={settings.showFertileWindow !== false} onValueChange={(showFertileWindow) => set({ showFertileWindow })} />
        <Muted>If you turn this off, only the estimated ovulation day is shown.</Muted>
      </Card>
      <Card>
        <Stepper label="Luteal phase" value={settings.lutealLength} min={10} max={16} suffix=" days" onChange={(lutealLength) => set({ lutealLength })} />
        <Muted style={{ marginTop: 8 }}>The luteal phase runs from ovulation to the start of your period. If you know yours, set it here for more accurate ovulation estimates.</Muted>
      </Card>
      <Card>
        <Row title="Display cycle sequence" value={!!settings.showCycleDays} onValueChange={(showCycleDays) => set({ showCycleDays })} />
        <Muted>Cycle day numbers (day 1, 2, 3…) appear above the calendar dates.</Muted>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          {[3, 4, 5, 6, 7, 8, 9].map((n, i) => (
            <FadeIn key={n} delay={i * 60} style={{ alignItems: 'center', marginHorizontal: 2 }}>
              {settings.showCycleDays ? <Text style={{ fontSize: 10, color: colors.muted }}>{n}</Text> : <Text style={{ fontSize: 10 }}> </Text>}
              <View style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
                i < 3 && { backgroundColor: colors.period }, i === 3 && { borderWidth: 2, borderColor: colors.period }, i === 5 && { borderWidth: 2, borderColor: colors.fertile }]}>
                <Text style={{ fontSize: 17, color: i < 3 ? '#fff' : i === 3 ? colors.period : i >= 4 ? colors.fertile : colors.text }}>{n}</Text>
              </View>
            </FadeIn>
          ))}
        </View>
      </Card>
      <Card>
        <Stepper label="Daily water target" value={settings.waterTarget ?? 2250} min={1000} max={4000} step={250} format={(n) => `${(n / 1000).toFixed(2)} L`} onChange={(waterTarget) => set({ waterTarget })} />
      </Card>
    </Page>
  );
}

type Key = Exclude<keyof ReminderPrefs, 'discreet'>;

function Reminders() {
  const st = useStore();
  const r = st.reminders;
  const [open, setOpen] = useState<Key | null>(null);
  const [msg, setMsg] = useState('');
  const toggle = async (k: Key, on: boolean) => {
    if (on && !(await ensurePermission())) return setMsg('Notifications are blocked. Allow them for Avelune in your phone settings.');
    setMsg('');
    st.setReminders({ [k]: { ...r[k], on } } as Partial<ReminderPrefs>);
  };
  const patch = (k: Key, p: Partial<TimeOfDay> & Record<string, number>) => st.setReminders({ [k]: { ...r[k], ...p } } as Partial<ReminderPrefs>);
  const item = (k: Key, title: string, extra?: string) => (
    <View key={k}>
      <Row title={title} subtitle={r[k].on ? `${extra ? extra + ' · ' : ''}${hhmm(r[k])}` : 'Off'} value={r[k].on} onValueChange={(v) => void toggle(k, v)}
        onPress={() => setOpen(open === k ? null : k)} />
      {open === k && (
        <FadeIn style={{ paddingVertical: 6 }}>
          {k === 'periodSoon' && <Stepper label="Days before" value={r.periodSoon.daysBefore} min={0} max={5} onChange={(n) => patch(k, { daysBefore: n })} />}
          <Stepper label={k === 'water' ? 'From' : 'Time'} value={r[k].hour * 60 + r[k].minute} min={0} max={23 * 60 + 45} step={15}
            format={(n) => hhmm({ hour: Math.floor(n / 60), minute: n % 60 })} onChange={(n) => patch(k, { hour: Math.floor(n / 60), minute: n % 60 })} />
          {k === 'water' && <Stepper label="Until" value={r.water.endHour} min={r.water.hour} max={23} format={(n) => hhmm({ hour: n, minute: 0 })} onChange={(n) => patch(k, { endHour: n })} />}
          {k === 'water' && <Stepper label="Every" value={r.water.everyHours} min={1} max={6} suffix=" h" onChange={(n) => patch(k, { everyHours: n })} />}
        </FadeIn>
      )}
    </View>
  );
  return (
    <Page>
      {!remindersSupported && (
        <View style={{ flexDirection: 'row', backgroundColor: '#FFF4E0', borderRadius: 18, padding: 16, marginBottom: 12, alignItems: 'center' }}>
          <Icon name="alert" size={26} color="#F5A524" />
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.text }}>Reminders are delivered by the iPhone and Android apps. Set them up in Avelune on your phone.</Text>
        </View>
      )}
      {msg ? <Muted style={{ color: colors.danger, marginBottom: 8 }}>{msg}</Muted> : null}
      <Section title="Cycle" />
      {item('periodSoon', 'Period in a couple of days', `${r.periodSoon.daysBefore} days before`)}
      {item('periodStart', 'Period start')}
      {item('periodEnd', 'Period end')}
      {item('ovulation', 'Ovulation')}
      {item('fertile', 'Fertile window starts')}
      <Section title="Medication and contraception" />
      {item('pill', 'Pill reminder')}
      <Section title="Lifestyle" />
      {item('weight', 'Log weight')}
      {item('sleep', 'Log sleep')}
      {item('water', 'Drink water', `every ${r.water.everyHours} h until ${hhmm({ hour: r.water.endHour, minute: 0 })}`)}
      {item('temperature', 'Log temperature')}
      {item('dailyLog', 'Daily check-in')}
      <Section title="Privacy" />
      <Row title="Discreet notifications" subtitle="Lock screen shows only “You have a reminder”" value={r.discreet} onValueChange={(discreet) => st.setReminders({ discreet })} />
      <Muted style={{ marginTop: 12 }}>Reminders are scheduled on this device from your own data. Nothing goes through a push service.</Muted>
    </Page>
  );
}

function Pregnancy() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const logs = selectLogs(st.records);
  const today = todayFn();
  const lastStart = derivePeriods(logs).pop()?.start ?? addDays(today, -28);
  const [lmp, setLmp] = useState(settings.pregnancyLmp ?? lastStart);
  const set = (pregnancyLmp: string | null) => st.saveSettings({ ...settings, pregnancyLmp });
  const ps = pregnancyStatus(lmp, today);
  return (
    <Page>
      <Card>
        <Row title="I'm pregnant" value={!!settings.pregnancyLmp} onValueChange={(v) => set(v ? lmp : null)} />
        <Muted>Pregnancy mode switches Today to week-by-week updates, pauses period predictions and cycle reminders, and adds weight tracking to the main screen.</Muted>
      </Card>
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 6, color: colors.text }}>First day of your last period</Text>
        <Stepper label={fmtDay(lmp)} value={0} min={-300} max={300} format={() => ''} onChange={(n) => { const v = addDays(lmp, n); if (v <= today) { setLmp(v); if (settings.pregnancyLmp) set(v); } }} />
        <Muted>Week {ps.week}, day {ps.day + 1}</Muted>
        <Text style={{ fontWeight: '700', fontSize: 17, marginTop: 14, marginBottom: 6, color: colors.text }}>Or set the due date</Text>
        <Stepper label={`${fmtDay(ps.dueDate)} ${ps.dueDate.slice(0, 4)}`} value={0} min={-300} max={300} format={() => ''}
          onChange={(n) => { const v = lmpFromDueDate(addDays(ps.dueDate, n)); if (v <= today) { setLmp(v); if (settings.pregnancyLmp) set(v); } }} />
      </Card>
      <Muted>{'Week-by-week notes are general information, not medical advice. Your care team’s dates take priority.'}</Muted>
    </Page>
  );
}

function HideContent() {
  const st = useStore();
  return (
    <Page>
      <Muted style={{ textAlign: 'center', marginBottom: 16 }}>Turn off topics you don't want to see. Hidden categories also disappear from logging and quick actions.</Muted>
      <Card><Row title="Sex content" value={!st.hideSex} onValueChange={(v) => st.setPrefs({ hideSex: !v })} /></Card>
    </Page>
  );
}

function Units() {
  const st = useStore();
  return (
    <Page>
      <Card>
        <Row title="Temperature in °F" value={st.unit === 'F'} onValueChange={(v) => st.setPrefs({ unit: v ? 'F' : 'C' })} />
        <Row title="Weight in lb" value={st.weightUnit === 'lb'} onValueChange={(v) => st.setPrefs({ weightUnit: v ? 'lb' : 'kg' })} />
      </Card>
    </Page>
  );
}

function Sync() {
  const st = useStore();
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockMsg, setUnlockMsg] = useState('');
  return (
    <Page>
      <Card>
        {st.server ? (
          <>
            <Row icon="shield-lock-outline" title="End-to-end encrypted" subtitle={`Connected to ${st.server.url} as ${st.server.email}`} />
            <Muted style={{ marginTop: 8 }}>{st.server.lastSync ? `Last synced ${new Date(st.server.lastSync).toLocaleTimeString()}.` : 'Not synced yet.'}</Muted>
            {st.syncError === 'locked' ? (
              <>
                <Muted style={{ color: colors.danger, marginTop: 8 }}>This device has no encryption key. Enter your encryption passphrase to resume syncing.</Muted>
                <Field label="Encryption passphrase" value={unlockPass} onChangeText={setUnlockPass} secureTextEntry />
                {unlockMsg ? <Muted style={{ color: colors.danger }}>{unlockMsg}</Muted> : null}
                <Btn title="Unlock" disabled={!unlockPass} onPress={() => { setUnlockMsg(''); st.unlock(unlockPass).then(() => setUnlockPass('')).catch((e: Error) => setUnlockMsg(e.message === 'wrong_passphrase' ? 'That passphrase does not match this account.' : e.message)); }} />
              </>
            ) : st.syncError ? <Muted style={{ color: colors.danger, marginTop: 8 }}>Sync error: {st.syncError}</Muted> : null}
            <Btn title={st.syncing ? 'Syncing…' : 'Sync now'} onPress={() => void st.sync()} disabled={st.syncing} style={{ marginTop: 12 }} />
            <Btn kind="ghost" title="Disconnect (keep data on this device)" onPress={() => void st.disconnect()} />
          </>
        ) : <ServerForm />}
      </Card>
    </Page>
  );
}

function Data() {
  const st = useStore();
  const [msg, setMsg] = useState('');
  const summary = () => {
    const logs = selectLogs(st.records);
    const settings = selectSettings(st.records);
    const p = predict(logs, settings, todayFn());
    const periods = derivePeriods(logs);
    return [
      'Avelune cycle summary', `Generated ${todayFn()}`, '',
      `Average cycle: ${p.stats.avgCycle} days (${p.stats.regularity})`, `Average period: ${p.stats.avgPeriod} days`, '',
      'Recent periods:', ...periods.slice(-12).map((x) => `- ${x.start} to ${x.end} (${x.length} days)`),
    ].join('\n');
  };
  return (
    <Page>
      <Card>
        <Row icon="code-json" title="Export all data (JSON)" onPress={() => void shareText('avelune-export.json', JSON.stringify({ version: 2, records: Object.values(st.records) }, null, 2), 'application/json')} />
        <Row icon="stethoscope" title="Summary for my doctor" onPress={() => void shareText('avelune-summary.txt', summary(), 'text/plain')} />
      </Card>
      <Card>
        <Row icon="delete-outline" danger title="Delete data on this device" onPress={() => confirm('Delete data on this device?', 'This cannot be undone. Data already synced stays on your server.', () => void st.wipe(false))} />
        {st.server && <Row icon="account-remove-outline" danger title="Delete my account and server data" onPress={() => confirm('Delete account?', 'This permanently deletes your server account, every synced record and any partner share.', () => void st.wipe(true).catch((e) => setMsg(String(e.message))))} />}
        {msg ? <Muted style={{ color: colors.danger }}>{msg}</Muted> : null}
      </Card>
    </Page>
  );
}
