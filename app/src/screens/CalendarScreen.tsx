import React from 'react';
import { ScrollView } from 'react-native';
import { predict, today as todayFn } from '@cyclo/core';
import { CalendarGrid } from '../CalendarGrid';
import { selectLogs, selectSettings, useStore } from '../store';
import { Card, Muted } from '../ui';

export function CalendarScreen({ onLog }: { onLog: (d: string) => void }) {
  const records = useStore((s) => s.records);
  const logs = selectLogs(records);
  const settings = selectSettings(records);
  const today = todayFn();
  const prediction = predict(logs, settings, today);
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Card>
        <CalendarGrid today={today} logs={new Map(logs.map((l) => [l.date, l]))} prediction={prediction} settings={settings} onSelect={onLog} />
      </Card>
      <Muted>Tap a day to log flow, symptoms, mood, temperature or notes.</Muted>
    </ScrollView>
  );
}
