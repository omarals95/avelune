import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, classifyDay, toDateStr, type DateStr, type DayKind, type DayLog, type Prediction, type Settings } from '@cyclo/core';
import { colors } from './theme';

const bg: Record<DayKind, string> = {
  period: colors.period, 'predicted-period': colors.predicted, fertile: colors.fertile, ovulation: colors.ovulation, none: 'transparent',
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  today: DateStr;
  logs: Map<DateStr, DayLog>;
  prediction: Prediction;
  settings: Settings;
  selected?: DateStr;
  onSelect: (d: DateStr) => void;
  /** When true, future days are not selectable (e.g. onboarding picks a past date). */
  disableFuture?: boolean;
  plain?: boolean;
}

export function CalendarGrid({ today, logs, prediction, settings, selected, onSelect, disableFuture, plain }: Props) {
  const [ym, setYm] = useState(() => ({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }));
  const cells = useMemo(() => {
    const first = new Date(ym.y, ym.m, 1);
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const out: (DateStr | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= days; d++) out.push(toDateStr(new Date(ym.y, ym.m, d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [ym]);
  const shift = (n: number) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <View>
      <View style={st.head}>
        <Pressable accessibilityLabel="Previous month" onPress={() => shift(-1)} style={st.nav}><Text style={st.navT}>‹</Text></Pressable>
        <Text style={st.title}>{MONTHS[ym.m]} {ym.y}</Text>
        <Pressable accessibilityLabel="Next month" onPress={() => shift(1)} style={st.nav}><Text style={st.navT}>›</Text></Pressable>
      </View>
      <View style={st.row}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={st.dow}>{d}</Text>)}</View>
      <View style={st.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={st.cell} />;
          const kind = plain ? 'none' : classifyDay(d, logs, prediction, settings);
          const log = logs.get(d);
          const future = !!disableFuture && d > today;
          const filled = kind === 'period' || kind === 'ovulation';
          return (
            <Pressable key={i} style={st.cell} disabled={future} onPress={() => onSelect(d)}
              accessibilityLabel={`${d}${kind !== 'none' ? ', ' + kind.replace('-', ' ') : ''}`}>
              <View style={[st.dayWrap, { backgroundColor: bg[kind] }, selected === d && st.sel, d === today && st.today]}>
                <Text style={[st.dayT, filled && { color: '#fff' }, future && { opacity: 0.35 }]}>{+d.slice(8)}</Text>
              </View>
              {log && (log.symptoms.length > 0 || log.moods.length > 0 || log.notes || log.bbt != null) ? <View style={st.dot} /> : <View style={{ height: 5 }} />}
            </Pressable>
          );
        })}
      </View>
      {!plain && (
        <View style={st.legend}>
          {([['period', 'Period'], ['predicted-period', 'Predicted'], ['fertile', 'Fertile'], ['ovulation', 'Ovulation']] as [DayKind, string][]).map(([k, l]) => (
            <View key={k} style={st.legItem}><View style={[st.swatch, { backgroundColor: bg[k] }]} /><Text style={st.legT}>{l}</Text></View>
          ))}
        </View>
      )}
    </View>
  );
}

export const monthLabel = (d: DateStr) => `${MONTHS[+d.slice(5, 7) - 1]} ${+d.slice(8)}`;
export { addDays };

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navT: { fontSize: 28, color: colors.primary },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  dayWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayT: { color: colors.text, fontSize: 15 },
  sel: { borderWidth: 2, borderColor: colors.text },
  today: { borderWidth: 2, borderColor: colors.primary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 0 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  legItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 4 },
  swatch: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legT: { color: colors.muted, fontSize: 12 },
});
