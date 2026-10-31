import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  Easing, cancelAnimation, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { PressScale, useReduceMotion } from './anim';
import { Icon, type IconName } from './icons';
import { Text } from './text';
import { bloomTint, colors, flowers, font, scheme, shadow, themed, type Bloom } from './theme';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** One flower layer: unfurls in (scale + counter-rotation + fade), then slowly turns and breathes. */
function Petals({ bloom, size, leaving, onGone }: { bloom: Bloom; size: number; leaving?: boolean; onGone?: () => void }) {
  const reduce = useReduceMotion();
  const open = useSharedValue(reduce ? 1 : 0);
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    if (leaving) {
      open.value = withTiming(0, { duration: reduce ? 1 : 420, easing: Easing.in(Easing.quad) });
      const t = setTimeout(() => onGone?.(), reduce ? 10 : 440);
      return () => clearTimeout(t);
    }
    open.value = reduce ? 1 : withSpring(1, { damping: 14, stiffness: 70, mass: 1.1 });
    if (!reduce) {
      spin.value = withRepeat(withTiming(360, { duration: 140000, easing: Easing.linear }), -1, false);
      breathe.value = withDelay(900, withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true));
      sway.value = withDelay(400, withRepeat(withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
    }
    return () => { cancelAnimation(spin); cancelAnimation(breathe); cancelAnimation(sway); };
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.35, 1], [0, 0.85, 1]),
    transform: [
      { rotate: `${spin.value + sway.value * 2.5 + interpolate(open.value, [0, 1], [-38, 0])}deg` },
      { scale: interpolate(open.value, [0, 1], [0.62, 1]) * (1 + breathe.value * 0.022) },
    ],
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={flowers[bloom]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Reanimated.View>
  );
}

/** Thin orbit ring with a glowing marker that travels to `progress` (0..1) through the cycle. */
function Orbit({ size, progress, tint }: { size: number; progress: number; tint: string }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? progress : 0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    p.value = reduce ? progress : withDelay(250, withTiming(progress, { duration: 1600, easing: Easing.out(Easing.cubic) }));
    if (!reduce) pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = size / 2 - 14;
  const c = size / 2;
  const dot = useAnimatedProps(() => {
    const a = (p.value * 360 - 90) * (Math.PI / 180);
    return { cx: c + r * Math.cos(a), cy: c + r * Math.sin(a) };
  });
  const halo = useAnimatedProps(() => {
    const a = (p.value * 360 - 90) * (Math.PI / 180);
    return { cx: c + r * Math.cos(a), cy: c + r * Math.sin(a), r: 15 + pulse.value * 4, opacity: 0.35 - pulse.value * 0.15 };
  });
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="orb" cx="35%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.45" stopColor={tint} stopOpacity={0.75} />
          <Stop offset="1" stopColor={tint} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={r} stroke={tint} strokeOpacity={scheme === 'dark' ? 0.45 : 0.35} strokeWidth={1.2} fill="none" />
      <AnimatedCircle animatedProps={halo} fill={tint} />
      <AnimatedCircle animatedProps={dot} r={11} fill="url(#orb)" />
    </Svg>
  );
}

/**
 * "The cycle in bloom": the phase flower with an open centre that holds the day's status.
 * Changing `bloom` cross-fades the old flower out while the new one unfurls.
 */
export function BloomCircle({ bloom, progress, kicker, big, sub, glyph, celebrateKey, children, a11y }: {
  bloom: Bloom; progress: number | null; kicker: string; big: string; sub?: string; glyph?: IconName;
  celebrateKey?: number; children?: React.ReactNode; a11y?: string;
}) {
  const { width } = useWindowDimensions();
  const D = Math.min(width - 24, 400);
  const [layers, setLayers] = useState<{ b: Bloom; k: number; leaving?: boolean }[]>([{ b: bloom, k: 0 }]);
  useEffect(() => {
    setLayers((ls) => (ls[ls.length - 1].b === bloom ? ls : [...ls.map((l) => ({ ...l, leaving: true })), { b: bloom, k: ls[ls.length - 1].k + 1 }]));
  }, [bloom]);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (!celebrateKey) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 1800);
    return () => clearTimeout(t);
  }, [celebrateKey]);
  const tint = bloomTint(bloom);
  const inner = D * 0.44;
  // Size the headline so its longest word always fits the open centre (no mid-word breaks).
  const longest = Math.max(...big.split(' ').map((w) => w.length));
  const bigSize = Math.max(20, Math.min(38, (inner - 30) / (longest * 0.58)));
  const dark = scheme === 'dark';
  return (
    <View style={{ width: D, height: D, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: D / 2, backgroundColor: tint, opacity: dark ? 0.08 : 0.05, transform: [{ scale: 0.9 }] }]} />
      {layers.map((l) => (
        <Petals key={l.k} bloom={l.b} size={D * 0.94} leaving={l.leaving} onGone={() => setLayers((ls) => ls.filter((x) => x.k !== l.k))} />
      ))}
      {progress != null ? <Orbit size={D} progress={progress} tint={tint} /> : null}
      <View accessible accessibilityRole="summary" accessibilityLabel={a11y ?? `${kicker} ${big}. ${sub ?? ''}`} accessibilityLiveRegion="polite"
        style={[b.center, { width: inner, height: inner, borderRadius: inner / 2, borderColor: dark ? tint : 'rgba(255,255,255,0.9)' }]}>
        {pop ? (
          <>
            <Icon name="check-circle" size={44} color={tint} />
            <Text style={[b.sub, { marginTop: 6 }]}>Predictions updated</Text>
          </>
        ) : (
          <>
            {children}
            {kicker ? <Text style={b.kicker} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.15}>{kicker}</Text> : null}
            <Text style={[b.big, { fontSize: bigSize, lineHeight: Math.round(bigSize * 1.18) }]} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>{big}</Text>
            {sub ? <Text style={b.sub} numberOfLines={2} maxFontSizeMultiplier={1.15}>{sub}</Text> : null}
            {glyph && dark ? <View style={{ marginTop: 6 }}><Icon name={glyph} size={20} color={tint} /></View> : null}
          </>
        )}
      </View>
    </View>
  );
}

const b = themed(() => StyleSheet.create({
  center: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
    backgroundColor: scheme === 'dark' ? 'rgba(27,19,28,0.92)' : 'rgba(252,247,244,0.96)', borderWidth: 1,
    ...(scheme === 'dark' ? {} : { shadowColor: '#7B3454', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }),
  },
  kicker: { fontSize: 20, color: colors.heading, textAlign: 'center', fontFamily: font.heading },
  big: { fontSize: 38, color: colors.heading, textAlign: 'center', fontWeight: '700', lineHeight: 46 },
  sub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 2 },
}));

/** Rounded action pill: tinted icon disc, label, chevron. */
export function ActionPill({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ flex: 1 }}>
      <View style={b2.pill}>
        <View style={[b2.disc, { backgroundColor: scheme === 'dark' ? colors.tileSelected : 'transparent' }]}>
          <Icon name={icon} size={22} color={scheme === 'dark' ? colors.primary : colors.heading} weight={scheme === 'dark' ? 'fill' : 'regular'} />
        </View>
        <Text style={b2.label} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>{label}</Text>
        <Icon name="chevron-right" size={16} color={colors.muted} />
      </View>
    </PressScale>
  );
}

/** Daily insight card with a cropped bloom fading in from the right edge. */
export function InsightCard({ title, bloom, onPress, eyebrow = 'Daily insight' }: { title: string; bloom: Bloom; onPress: () => void; eyebrow?: string }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${title}`} onPress={onPress}>
      <View style={b2.insight}>
        <Image source={flowers[bloom]} style={b2.insightArt} resizeMode="cover" accessibilityIgnoresInvertColors />
        <LinearGradient colors={[colors.card, colors.card, 'transparent']} locations={[0, 0.5, 0.72]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, paddingRight: 120 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="sprout" size={18} color={colors.muted} />
            <Text style={b2.eyebrow}>{eyebrow}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={b2.insightT} numberOfLines={3} maxFontSizeMultiplier={1.2}>{title}</Text>
            <View style={{ marginLeft: 6 }}><Icon name="chevron-right" size={16} color={colors.muted} /></View>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

const b2 = themed(() => StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', minHeight: 58, borderRadius: 999, paddingLeft: 10, paddingRight: 12,
    backgroundColor: scheme === 'dark' ? colors.card : colors.tile, borderWidth: 1, borderColor: colors.border,
  },
  disc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  label: { flex: 1, fontSize: 15.5, color: colors.heading, fontWeight: '500' },
  insight: {
    flexDirection: 'row', alignItems: 'center', minHeight: 126, borderRadius: 24, padding: 20, overflow: 'hidden',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  insightArt: { position: 'absolute', right: -300, top: -170, width: 460, height: 460 },
  eyebrow: { fontSize: 14, color: colors.muted, marginLeft: 8 },
  insightT: { flexShrink: 1, fontSize: 21, lineHeight: 27, color: colors.heading, fontWeight: '700' },
}));
