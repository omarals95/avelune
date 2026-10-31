import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_SETTINGS, addDays, today as todayFn, toDateStr, type DateStr } from '@cyclo/core';
import { FadeIn, PressScale, useLoop } from '../anim';
import { DOW, MONTHS, MoodBackground, fmtDay, mondayIndex } from '../components';
import { Icon } from '../icons';
import { ServerForm } from '../ServerForm';
import { useStore } from '../store';
import { colors, shadow } from '../theme';
import { Btn, Card, Muted, Stepper } from '../ui';
import { JoinPartner } from './Partner';
import { Animated } from 'react-native';

function Logo() {
  const v = useLoop(2600);
  return (
    <Animated.View style={[ob.logo, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
      <Icon name="moon-waning-crescent" size={44} color="#fff" />
    </Animated.View>
  );
}

function PickDate({ value, onChange, today }: { value: DateStr; onChange: (d: DateStr) => void; today: DateStr }) {
  const [ym, setYm] = useState({ y: +value.slice(0, 4), m: +value.slice(5, 7) - 1 });
  const first = toDateStr(new Date(ym.y, ym.m, 1));
  const n = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (DateStr | null)[] = [...Array(mondayIndex(first)).fill(null), ...Array.from({ length: n }, (_, i) => toDateStr(new Date(ym.y, ym.m, i + 1)))];
  const shift = (k: number) => setYm(({ y, m }) => { const d = new Date(y, m + k, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressScale accessibilityLabel="Previous month" onPress={() => shift(-1)} style={{ padding: 10 }}><Icon name="chevron-left" size={28} color={colors.text} /></PressScale>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{MONTHS[ym.m]} {ym.y}</Text>
        <PressScale accessibilityLabel="Next month" onPress={() => shift(1)} style={{ padding: 10 }}><Icon name="chevron-right" size={28} color={colors.text} /></PressScale>
      </View>
      <View style={{ flexDirection: 'row' }}>{DOW.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.muted }}>{d}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 }}>
            {d ? (
              <PressScale accessibilityLabel={d} disabled={d > today} onPress={() => onChange(d)}
                style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, d === value && { backgroundColor: colors.period }]}>
                <Text style={{ fontSize: 17, color: d === value ? '#fff' : d > today ? colors.faint : colors.text }}>{+d.slice(8)}</Text>
              </PressScale>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const complete = useStore((s) => s.completeOnboarding);
  const today = todayFn();
  const [step, setStep] = useState<'welcome' | 'date' | 'lengths' | 'restore' | 'partner'>('welcome');
  const [start, setStart] = useState<DateStr>(addDays(today, -DEFAULT_SETTINGS.periodLength));
  const [cycle, setCycle] = useState(DEFAULT_SETTINGS.cycleLength);
  const [period, setPeriod] = useState(DEFAULT_SETTINGS.periodLength);

  return (
    <View style={{ flex: 1 }}>
      <MoodBackground mood={step === 'partner' ? 'ovulation' : 'menstrual'} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 30, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <FadeIn style={{ alignItems: 'center', marginBottom: 20 }}>
          <Logo />
          <Text style={ob.brand}>Cyclo</Text>
          <Text style={ob.tag}>Your cycle, private. Shared only with the one you choose.</Text>
        </FadeIn>

        {step === 'welcome' && (
          <FadeIn delay={120}>
            <Btn title="Start tracking" onPress={() => setStep('date')} />
            <Btn kind="ghost" title="I already use a Cyclo server" onPress={() => setStep('restore')} />
            <Btn kind="ghost" title="My partner shared their cycle" onPress={() => setStep('partner')} />
            <Muted style={{ textAlign: 'center', marginTop: 16 }}>No account needed. Your data stays on this device unless you connect your own encrypted server.</Muted>
          </FadeIn>
        )}

        {step === 'date' && (
          <FadeIn key="date">
            <Card>
              <Text style={ob.q}>When did your last period start?</Text>
              <PickDate value={start} onChange={setStart} today={today} />
              <Muted style={{ marginTop: 8, textAlign: 'center' }}>{fmtDay(start)}</Muted>
              <Btn title="Next" onPress={() => setStep('lengths')} />
              <Btn kind="ghost" title="Back" onPress={() => setStep('welcome')} />
            </Card>
          </FadeIn>
        )}

        {step === 'lengths' && (
          <FadeIn key="lengths">
            <Card>
              <Text style={ob.q}>Your usual cycle</Text>
              <Muted>Estimates are fine. Predictions improve automatically as you log.</Muted>
              <Stepper label="Cycle length" value={cycle} min={21} max={45} suffix=" days" onChange={setCycle} />
              <Stepper label="Period length" value={period} min={2} max={10} suffix=" days" onChange={setPeriod} />
              <Btn title="Start tracking" onPress={() => complete(start, { ...DEFAULT_SETTINGS, cycleLength: cycle, periodLength: period })} />
              <Btn kind="ghost" title="Back" onPress={() => setStep('date')} />
            </Card>
          </FadeIn>
        )}

        {step === 'restore' && (
          <FadeIn key="restore">
            <Card>
              <Text style={ob.q}>Sign in to your server</Text>
              <ServerForm allowRegister={false} />
              <Btn kind="ghost" title="Back" onPress={() => setStep('welcome')} />
            </Card>
          </FadeIn>
        )}

        {step === 'partner' && <FadeIn key="partner"><JoinPartner onCancel={() => setStep('welcome')} /></FadeIn>}

        <Muted style={{ textAlign: 'center', marginTop: 20 }}>Cyclo gives estimates for personal awareness. It is not a medical device and must not be used for contraception.</Muted>
      </ScrollView>
    </View>
  );
}

const ob = StyleSheet.create({
  logo: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.25 },
  brand: { fontSize: 36, fontWeight: '800', color: colors.text, marginTop: 14 },
  tag: { fontSize: 17, color: colors.muted, textAlign: 'center', marginTop: 6 },
  q: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 10 },
});
