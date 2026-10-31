import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { derivePeriods, predict, today as todayFn } from '@cyclo/core';
import { selectLogs, selectSettings, useStore } from '../store';
import { Card, H, Muted } from '../ui';
import { colors } from '../theme';
import { monthLabel } from '../CalendarGrid';

const REG = { unknown: 'Log 3+ cycles to see this', regular: 'Regular', 'somewhat-irregular': 'Somewhat irregular', irregular: 'Irregular' } as const;

export function Insights() {
  const records = useStore((s) => s.records);
  const logs = selectLogs(records);
  const settings = selectSettings(records);
  const p = predict(logs, settings, todayFn());
  const periods = derivePeriods(logs);
  const count = (key: 'symptoms' | 'moods') => {
    const m = new Map<string, number>();
    for (const l of logs) for (const v of l[key]) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const maxLen = Math.max(35, ...p.stats.cycleLengths);
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <H>Insights</H>
      <Card>
        <Stat k="Average cycle" v={`${p.stats.avgCycle} days`} />
        <Stat k="Average period" v={`${p.stats.avgPeriod} days`} />
        <Stat k="Regularity" v={REG[p.stats.regularity]} />
        <Stat k="Periods logged" v={String(periods.length)} />
      </Card>
      {p.stats.cycleLengths.length > 0 && (
        <Card>
          <Text style={{ fontWeight: '600', marginBottom: 10 }}>Recent cycle lengths</Text>
          {p.stats.cycleLengths.slice(-8).map((len, i, arr) => {
            const start = periods[periods.length - arr.length - 1 + i]?.start;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Muted style={{ width: 80 }}>{start ? monthLabel(start) : ''}</Muted>
                <View style={{ height: 14, borderRadius: 7, backgroundColor: colors.primary, width: `${(len / maxLen) * 70}%` }} />
                <Text style={{ marginLeft: 8, color: colors.text }}>{len}d</Text>
              </View>
            );
          })}
        </Card>
      )}
      {(['symptoms', 'moods'] as const).map((k) => {
        const top = count(k);
        return top.length ? (
          <Card key={k}>
            <Text style={{ fontWeight: '600', marginBottom: 6 }}>Most logged {k}</Text>
            {top.map(([n, c]) => <Stat key={n} k={n} v={`${c}×`} />)}
          </Card>
        ) : null;
      })}
      <Muted>Insights are statistical summaries of what you logged. Talk to a clinician about persistent irregular cycles, severe pain or heavy bleeding.</Muted>
    </ScrollView>
  );
}
const Stat = ({ k, v }: { k: string; v: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
    <Muted>{k}</Muted><Text style={{ color: colors.text, fontWeight: '600' }}>{v}</Text>
  </View>
);
