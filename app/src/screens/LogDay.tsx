import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { DayLog, Flow } from '@cyclo/core';
import { FLOW_LABELS, MOODS, SYMPTOMS, TAGS } from '../options';
import { selectLogs, useStore } from '../store';
import { Btn, Card, Chip, Field, H, Muted } from '../ui';
import { monthLabel } from '../CalendarGrid';


export function LogDay({ date, onClose }: { date: string; onClose: () => void }) {
  const records = useStore((s) => s.records);
  const save = useStore((s) => s.saveDay);
  const unit = useStore((s) => s.unit);
  const existing = selectLogs(records).find((l) => l.date === date);
  const [flow, setFlow] = useState<Flow>(existing?.flow ?? 0);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [moods, setMoods] = useState<string[]>(existing?.moods ?? []);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [bbt, setBbt] = useState(
    existing?.bbt == null ? '' : String(unit === 'C' ? existing.bbt : Math.round((existing.bbt * 9) / 5 * 100 + 3200) / 100),
  );
  const [err, setErr] = useState('');
  const toggle = (arr: string[], set: (a: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const onSave = () => {
    let temp: number | undefined;
    if (bbt.trim()) {
      const n = parseFloat(bbt.replace(',', '.'));
      const c = unit === 'C' ? n : ((n - 32) * 5) / 9;
      if (!Number.isFinite(n) || c < 34 || c > 40) return setErr(`Enter a temperature between ${unit === 'C' ? '34–40 °C' : '93.2–104 °F'}.`);
      temp = Math.round(c * 100) / 100;
    }
    const log: DayLog = { date, flow, symptoms, moods, tags, notes: notes.trim() || undefined, bbt: temp };
    save(log);
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <H>{monthLabel(date)}</H>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Flow</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {FLOW_LABELS.map((l, i) => <Chip key={l} label={l} on={flow === i} onPress={() => setFlow(i as Flow)} />)}
        </View>
      </Card>
      <Card>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>Symptoms</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{SYMPTOMS.map((v) => <Chip key={v} label={v} on={symptoms.includes(v)} onPress={() => toggle(symptoms, setSymptoms, v)} />)}</View>
        <Text style={{ fontWeight: '600', marginVertical: 8 }}>Mood</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{MOODS.map((v) => <Chip key={v} label={v} on={moods.includes(v)} onPress={() => toggle(moods, setMoods, v)} />)}</View>
        <Text style={{ fontWeight: '600', marginVertical: 8 }}>Other</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{TAGS.map((v) => <Chip key={v} label={v} on={tags.includes(v)} onPress={() => toggle(tags, setTags, v)} />)}</View>
      </Card>
      <Card>
        <Field label={`Basal body temperature (°${unit})`} value={bbt} onChangeText={(t) => { setBbt(t); setErr(''); }} keyboardType="decimal-pad" placeholder={unit === 'C' ? '36.55' : '97.8'} />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} autoCapitalize="sentences" />
        {err ? <Muted style={{ color: '#B3261E' }}>{err}</Muted> : null}
      </Card>
      <Btn title="Save" onPress={onSave} />
      <Btn kind="ghost" title="Cancel" onPress={onClose} />
    </ScrollView>
  );
}
