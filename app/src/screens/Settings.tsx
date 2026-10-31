import React, { useState } from 'react';
import { Alert, Platform, ScrollView, Share, Text } from 'react-native';
import { derivePeriods, predict, today as todayFn } from '@cyclo/core';
import { selectLogs, selectSettings, useStore } from '../store';
import { Btn, Card, H, Muted, Stepper } from '../ui';
import { ServerForm } from '../ServerForm';
import { monthLabel } from '../CalendarGrid';

async function shareText(filename: string, text: string, mime: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: text, title: filename });
  }
}

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) ok(); }
  else Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: ok }]);
};

export function Settings() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const [msg, setMsg] = useState('');

  const summary = () => {
    const logs = selectLogs(st.records);
    const p = predict(logs, settings, todayFn());
    const periods = derivePeriods(logs);
    return [
      'Cyclo cycle summary', `Generated ${todayFn()}`, '',
      `Average cycle: ${p.stats.avgCycle} days (${p.stats.regularity})`, `Average period: ${p.stats.avgPeriod} days`, '',
      'Recent periods:', ...periods.slice(-12).map((x) => `- ${x.start} to ${x.end} (${x.length} days)`),
    ].join('\n');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <H>Settings</H>
      <Card>
        <Text style={{ fontWeight: '600' }}>Cycle defaults</Text>
        <Muted>Used until you have enough logged cycles.</Muted>
        <Stepper label="Cycle length" value={settings.cycleLength} min={21} max={45} suffix=" d" onChange={(n) => st.saveSettings({ ...settings, cycleLength: n })} />
        <Stepper label="Period length" value={settings.periodLength} min={2} max={10} suffix=" d" onChange={(n) => st.saveSettings({ ...settings, periodLength: n })} />
        <Stepper label="Luteal phase" value={settings.lutealLength} min={10} max={16} suffix=" d" onChange={(n) => st.saveSettings({ ...settings, lutealLength: n })} />
        <Btn kind="ghost" title={`Temperature unit: °${st.unit} (tap to switch)`} onPress={() => st.setUnit(st.unit === 'C' ? 'F' : 'C')} />
      </Card>

      <Card>
        <Text style={{ fontWeight: '600' }}>Cloud sync (optional)</Text>
        {st.server ? (
          <>
            <Muted>Connected to {st.server.url} as {st.server.email}.{st.server.lastSync ? ` Last synced ${new Date(st.server.lastSync).toLocaleTimeString()}.` : ''}</Muted>
            {st.syncError ? <Muted style={{ color: '#B3261E' }}>Sync error: {st.syncError}</Muted> : null}
            <Btn title={st.syncing ? 'Syncing…' : 'Sync now'} onPress={() => void st.sync()} disabled={st.syncing} />
            <Btn kind="ghost" title="Disconnect (keep data on this device)" onPress={() => void st.disconnect()} />
          </>
        ) : (
          <>
            <ServerForm />
          </>
        )}
      </Card>

      <Card>
        <Text style={{ fontWeight: '600' }}>Your data</Text>
        <Btn kind="ghost" title="Export all data (JSON)" onPress={() => void shareText('cyclo-export.json', JSON.stringify({ version: 1, records: Object.values(st.records) }, null, 2), 'application/json')} />
        <Btn kind="ghost" title="Share summary for my doctor" onPress={() => void shareText('cyclo-summary.txt', summary(), 'text/plain')} />
        <Btn kind="danger" title="Delete data on this device" onPress={() => confirm('Delete data on this device?', 'This cannot be undone. Data already synced stays on your server.', () => void st.wipe(false))} />
        {st.server && <Btn kind="danger" title="Delete my account and server data" onPress={() => confirm('Delete account?', 'This permanently deletes your server account and every synced record.', () => void st.wipe(true).catch((e) => setMsg(String(e.message))))} />}
      </Card>
      <Muted>Cyclo is an independent open-source project and is not affiliated with any other period-tracking app. Predictions are estimates; do not use them for contraception.</Muted>
    </ScrollView>
  );
}
