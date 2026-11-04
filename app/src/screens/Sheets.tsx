import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../text';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn, PressScale, useLoop } from '../anim';
import { ARTICLES, DISCLAIMER, pregnancyWeek } from '../content';
import { Icon } from '../icons';
import { colors, phase, scheme, themed } from '../theme';
import { PregnancyIllustration } from '../pregnancyArt';
import { pregnancyStage } from '@cyclo/core';
import { Muted, TopBar } from '../ui';

export function ArticleSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const a = ARTICLES.find((x) => x.id === id) ?? ARTICLES[0];
  const bob = useLoop(2400);
  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ backgroundColor: scheme === 'dark' ? colors.tile : a.tint }}>
        <TopBar onClose={onClose} />
        <Animated.View style={{ alignItems: 'center', paddingBottom: 30, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
          <Icon name={a.icon} size={110} weight="light" color={scheme === 'dark' ? colors.primary : a.ink} />
        </Animated.View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 22, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <FadeIn><Text style={sh.title}>{a.title}</Text></FadeIn>
        {a.body.map((p, i) => <FadeIn key={i} delay={80 + i * 60}><Text style={sh.p}>{p}</Text></FadeIn>)}
        <Muted style={{ marginTop: 18 }}>{DISCLAIMER}</Muted>
      </ScrollView>
    </View>
  );
}

/** Week-by-week pregnancy sheet: animated size comparison on a warm gradient, with a week picker. */
export function WeekSheet({ week: initial, onClose }: { week: number; onClose: () => void }) {
  const [week, setWeek] = useState(Math.max(4, Math.min(40, initial)));
  const w = pregnancyWeek(week);
  const chips = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={scheme === 'dark' ? ['#3A2A1E', colors.pregnancySoft, colors.bg] : ['#EBD3BA', phase.pregnancy.soft, colors.bg]} style={StyleSheet.absoluteFill} />
      <TopBar onClose={onClose} />
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 264 }}>
        <PregnancyIllustration stage={pregnancyStage(week)} size={250} />
      </View>
      <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}
        onLayout={() => chips.current?.scrollTo({ x: Math.max(0, (week - 6) * 92), animated: false })}>
        {Array.from({ length: 37 }, (_, i) => i + 4).map((n) => (
          <PressScale key={n} accessibilityRole="button" accessibilityState={{ selected: n === week }} accessibilityLabel={`Week ${n}`} onPress={() => setWeek(n)} style={[sh.wk, n === week && { backgroundColor: '#fff' }]}>
            <Text style={[sh.wkT, n === week && { color: colors.text, fontWeight: '700' }]}>{n} weeks</Text>
          </PressScale>
        ))}
      </ScrollView>
      <ScrollView style={sh.panel} contentContainerStyle={{ padding: 22, paddingBottom: 60 }}>
        <View style={sh.grab} />
        <FadeIn key={week}>
          <Text style={sh.title}>What happens at {week} weeks</Text>
          <Text style={sh.h}>Month {pregnancyStage(week)} · {week < 14 ? 'First' : week < 28 ? 'Second' : 'Third'} trimester</Text>
          <Text style={sh.h}>How big is the baby?</Text>
          <Text style={sh.p}>About the size of {w.size}. All sizes are approximate and vary within a normal range.</Text>
          <Text style={sh.h}>Your baby</Text>
          <Text style={sh.p}>{w.baby}</Text>
          <Text style={sh.h}>Your body</Text>
          <Text style={sh.p}>{w.body}</Text>
          <Muted style={{ marginTop: 18 }}>{DISCLAIMER}</Muted>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const sh = themed(() => StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', color: colors.heading, marginBottom: 14 },
  h: { fontSize: 18, fontWeight: '700', color: colors.heading, marginTop: 18, marginBottom: 6 },
  p: { fontSize: 17, lineHeight: 27, color: colors.text, marginBottom: 12 },
  wk: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)', marginRight: 10 },
  wkT: { fontSize: 16, color: colors.text },
  panel: { flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
}));
