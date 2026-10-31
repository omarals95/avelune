import React, { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn, PressScale, useLoop } from '../anim';
import { ARTICLES, DISCLAIMER, pregnancyWeek } from '../content';
import { Icon } from '../icons';
import { colors } from '../theme';
import { Muted, TopBar } from '../ui';

export function ArticleSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const a = ARTICLES.find((x) => x.id === id) ?? ARTICLES[0];
  const bob = useLoop(2400);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: a.tint }}>
        <TopBar onClose={onClose} />
        <Animated.View style={{ alignItems: 'center', paddingBottom: 30, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
          <Icon name={a.icon} size={110} color={a.ink} />
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
  const pulse = useLoop(1800);
  const chips = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#F4B996', '#FAD7C3', '#FDEDE3']} style={StyleSheet.absoluteFill} />
      <TopBar onClose={onClose} />
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <Animated.Text key={week} style={{ fontSize: 120, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }] }}>{w.emoji}</Animated.Text>
      </View>
      <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}
        onLayout={() => chips.current?.scrollTo({ x: Math.max(0, (week - 6) * 92), animated: false })}>
        {Array.from({ length: 37 }, (_, i) => i + 4).map((n) => (
          <PressScale key={n} onPress={() => setWeek(n)} style={[sh.wk, n === week && { backgroundColor: '#fff' }]}>
            <Text style={[sh.wkT, n === week && { color: colors.text, fontWeight: '700' }]}>{n} weeks</Text>
          </PressScale>
        ))}
      </ScrollView>
      <ScrollView style={sh.panel} contentContainerStyle={{ padding: 22, paddingBottom: 60 }}>
        <View style={sh.grab} />
        <FadeIn key={week}>
          <Text style={sh.title}>What happens at {week} weeks</Text>
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

const sh = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 14 },
  h: { fontSize: 19, fontWeight: '700', color: colors.muted, marginTop: 18, marginBottom: 6 },
  p: { fontSize: 18, lineHeight: 28, color: '#4A4652', marginBottom: 12 },
  wk: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.35)', marginRight: 10 },
  wkT: { fontSize: 17, color: 'rgba(29,27,36,0.6)' },
  panel: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#D5D2DA', alignSelf: 'center', marginBottom: 14 },
});
