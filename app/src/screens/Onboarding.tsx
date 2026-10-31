import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { DEFAULT_SETTINGS, addDays, today as todayFn, type DateStr, predict } from '@cyclo/core';
import { CalendarGrid, monthLabel } from '../CalendarGrid';
import { useStore } from '../store';
import { Btn, Card, H, Muted, Stepper } from '../ui';
import { ServerForm } from '../ServerForm';
import { colors } from '../theme';

export function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding);
  const today = todayFn();
  const [step, setStep] = useState(0);
  const [restore, setRestore] = useState(false);
  const [start, setStart] = useState<DateStr>(addDays(today, -DEFAULT_SETTINGS.periodLength));
  const [cycle, setCycle] = useState(DEFAULT_SETTINGS.cycleLength);
  const [period, setPeriod] = useState(DEFAULT_SETTINGS.periodLength);
  const empty = new Map();
  const noPred = predict([], DEFAULT_SETTINGS, today);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 48, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary, marginBottom: 6 }}>Cyclo</Text>
      <Muted style={{ marginBottom: 20 }}>A private cycle tracker. Your data stays on this device unless you connect your own server. No account needed.</Muted>
      {step === 0 && (
        <Card>
          <H>When did your last period start?</H>
          <CalendarGrid plain today={today} logs={empty} prediction={noPred} settings={DEFAULT_SETTINGS} selected={start} onSelect={setStart} disableFuture />
          <Muted style={{ marginTop: 8 }}>Selected: {monthLabel(start)}</Muted>
          <Btn title="Next" onPress={() => setStep(1)} />
          <Btn kind="ghost" title="I already use a Cyclo server" onPress={() => setRestore(true)} />
        </Card>
      )}
      {restore && (
        <Card>
          <H>Sign in to your server</H>
          <ServerForm allowRegister={false} />
          <Btn kind="ghost" title="Cancel" onPress={() => setRestore(false)} />
        </Card>
      )}
      {step === 1 && (
        <Card>
          <H>Your usual cycle</H>
          <Muted>Estimates are fine. They improve automatically as you log.</Muted>
          <Stepper label="Cycle length" value={cycle} min={21} max={45} suffix=" days" onChange={setCycle} />
          <Stepper label="Period length" value={period} min={2} max={10} suffix=" days" onChange={setPeriod} />
          <Btn title="Start tracking" onPress={() => complete(start, { cycleLength: cycle, periodLength: period, lutealLength: 14 })} />
          <Btn kind="ghost" title="Back" onPress={() => setStep(0)} />
        </Card>
      )}
      <View style={{ height: 24 }} />
      <Muted>Cyclo provides estimates for personal awareness only. It is not a medical device and must not be used for contraception or diagnosis.</Muted>
    </ScrollView>
  );
}
