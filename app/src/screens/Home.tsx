import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { predict, today as todayFn, type Phase } from '@cyclo/core';
import { selectLogs, selectSettings, useStore } from '../store';
import { Btn, Card, H, Muted } from '../ui';
import { colors } from '../theme';
import { monthLabel } from '../CalendarGrid';

const PHASE: Record<Phase, { name: string; tip: string }> = {
  menstrual: { name: 'Menstrual phase', tip: 'Rest and hydration help. Log your flow and any cramps.' },
  follicular: { name: 'Follicular phase', tip: 'Energy often rises as the next ovulation approaches.' },
  ovulation: { name: 'Fertile window', tip: 'Pregnancy is most likely in these days. Estimates are not exact.' },
  luteal: { name: 'Luteal phase', tip: 'PMS symptoms are common in the days before a period.' },
};

export function Home({ onLog }: { onLog: (d: string) => void }) {
  const records = useStore((s) => s.records);
  const logs = selectLogs(records);
  const settings = selectSettings(records);
  const today = todayFn();
  const p = predict(logs, settings, today);
  const phase = p.phase ? PHASE[p.phase] : null;
  const d = p.daysUntilPeriod;
  const headline = d == null ? 'Log a period to begin' : d > 1 ? `Period in ${d} days` : d === 1 ? 'Period tomorrow' : d === 0 ? 'Period expected today' : `Period ${-d} day${d === -1 ? '' : 's'} late`;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Muted>{p.cycleDay ? `Cycle day ${p.cycleDay}` : 'Today'}</Muted>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary, marginVertical: 6, textAlign: 'center' }}>{headline}</Text>
        {phase && <Text style={{ color: colors.text, fontWeight: '600' }}>{phase.name}</Text>}
        {phase && <Muted style={{ textAlign: 'center', marginTop: 6 }}>{phase.tip}</Muted>}
        <View style={{ height: 12 }} />
        <Btn title="Log today" onPress={() => onLog(today)} />
      </Card>
      {p.nextPeriodStart && p.fertileWindow && p.ovulationDate && (
        <Card>
          <H>Predictions</H>
          <Row k="Next period" v={`${monthLabel(p.nextPeriodStart)}${p.stats.regularity === 'irregular' || p.stats.regularity === 'somewhat-irregular' ? ` (±${Math.max(1, Math.round(p.stats.variability))}d)` : ''}`} />
          <Row k="Fertile window" v={`${monthLabel(p.fertileWindow[0])} – ${monthLabel(p.fertileWindow[1])}`} />
          <Row k="Estimated ovulation" v={monthLabel(p.ovulationDate)} />
          <Row k="Average cycle" v={`${p.stats.avgCycle} days`} />
        </Card>
      )}
    </ScrollView>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
    <Muted>{k}</Muted>
    <Text style={{ color: colors.text, fontWeight: '600' }}>{v}</Text>
  </View>
);
