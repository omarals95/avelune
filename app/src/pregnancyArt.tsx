import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { PregnancyStage, PregnancyView } from '@cyclo/core';
import { useReduceMotion } from './anim';
import { fmtDay } from './components';
import { Text } from './text';
import { colors, flowers, themed } from './theme';

/**
 * The single place that maps pregnancy stages to artwork (assets/pregnancy/emb-0x.webp, optimized copies of
 * design/pregnancy/emb-0x.png). A stage set to null has no artwork yet: the view falls back gracefully.
 */
export const PREGNANCY_ART: Record<PregnancyStage, ImageSourcePropType | null> = {
  1: require('../assets/pregnancy/emb-01.webp'),
  2: require('../assets/pregnancy/emb-02.webp'),
  3: require('../assets/pregnancy/emb-03.webp'),
  4: require('../assets/pregnancy/emb-04.webp'),
  5: require('../assets/pregnancy/emb-05.webp'),
  6: require('../assets/pregnancy/emb-06.webp'),
  7: require('../assets/pregnancy/emb-07.webp'),
  8: require('../assets/pregnancy/emb-08.webp'),
  9: require('../assets/pregnancy/emb-09.webp'),
};

/** Screen-reader descriptions (no medical measurements). */
const ALT: Record<PregnancyStage, string> = {
  1: 'Month 1 illustration: a tiny early form in a small sac, cradled inside a pink flower and joined to the placenta.',
  2: 'Month 2 illustration: a small curled embryo in its sac, inside a pink flower and joined to the placenta.',
  3: 'Month 3 illustration: a small baby with a large head, arms and legs, curled inside the flower.',
  4: 'Month 4 illustration: a growing baby with hands near the face, curled inside the flower.',
  5: 'Month 5 illustration: a growing baby curled inside the flower, joined to the placenta.',
  6: 'Month 6 illustration: a larger baby with hands near the face, curled inside the flower.',
  7: 'Month 7 illustration: a baby filling more of the sac inside the flower.',
  8: 'Month 8 illustration: a well-rounded baby curled inside the flower.',
  9: 'Month 9 illustration: a fully grown baby curled up, ready to be born, inside the flower.',
};

/** One square box for every stage, sized like the cycle bloom so switching modes or stages never shifts the layout. */
export function useArtSize() {
  const { width, height } = useWindowDimensions();
  // On short phones, leave room so the caption below is visible above the tab bar without scrolling.
  return Math.round(Math.min(width - 24, 400, height * 0.43));
}

/** A stage layer that fades in, then fades out when replaced (no movement of the baby itself). */
function Layer({ source, size, leaving, onGone }: { source: ImageSourcePropType; size: number; leaving?: boolean; onGone?: () => void }) {
  const reduce = useReduceMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (leaving) {
      v.value = withTiming(0, { duration: reduce ? 0 : 380, easing: Easing.in(Easing.quad) });
      const t = setTimeout(() => onGone?.(), reduce ? 0 : 400);
      return () => clearTimeout(t);
    }
    v.value = reduce ? 1 : withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
    return undefined;
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.985 + v.value * 0.015 }] }));
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors fadeDuration={0} />
    </Reanimated.View>
  );
}

/**
 * Pregnancy growth illustration for a stage. Nothing is drawn on top of it: all text belongs in
 * <PregnancyCaption> below. Cross-fades when the stage changes.
 */
export function PregnancyIllustration({ stage, size: fixed }: { stage: PregnancyStage; size?: number }) {
  const auto = useArtSize();
  const size = fixed ?? auto;
  const art = PREGNANCY_ART[stage];
  const source = art ?? flowers.follicular;
  const [layers, setLayers] = useState<{ stage: PregnancyStage; src: ImageSourcePropType; k: number; leaving?: boolean }[]>([{ stage, src: source, k: 0 }]);
  useEffect(() => {
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (top.stage === stage && top.src === source) return ls;
      return [...ls.map((l) => ({ ...l, leaving: true })), { stage, src: source, k: top.k + 1 }];
    });
  }, [stage, source]);
  if (!art && __DEV__) console.warn(`[pregnancy] No illustration for stage ${stage} (assets/pregnancy/emb-0${stage}). Showing the flower instead.`);
  return (
    <View accessible accessibilityRole="image" testID="pregnancy-illustration"
      accessibilityLabel={art ? ALT[stage] : `Month ${stage}: a pink flower (the illustration for this month is not available yet).`}
      style={{ width: size, height: size, alignSelf: 'center' }}>
      {layers.map((l) => (
        <Layer key={l.k} source={l.src} size={size} leaving={l.leaving} onGone={() => setLayers((ls) => ls.filter((x) => x.k !== l.k))} />
      ))}
    </View>
  );
}

/** Text that goes with the illustration, always in its own row directly below it. */
export function PregnancyCaption({ view }: { view: PregnancyView }) {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const toGo = view.daysToGo;
  const due = `${fmtDay(view.dueDate)} ${view.dueDate.slice(0, 4)}`;
  const detail = view.postTerm
    ? `${Math.floor(-toGo / 7) ? `${Math.floor(-toGo / 7)} wk ` : ''}${-toGo % 7} day${-toGo % 7 === 1 ? '' : 's'} past your due date (${due})`
    : toGo === 0 ? `Due today (${due})` : `${view.week} weeks ${view.day} day${view.day === 1 ? '' : 's'} · due ${due}`;
  return (
    <View style={c.row} testID="pregnancy-caption">
      <Text selectable style={[c.caption, narrow && { fontSize: 16 }]} accessibilityRole="header">{view.caption}</Text>
      <Text selectable style={c.detail}>{detail}</Text>
    </View>
  );
}

/** Shown in pregnancy mode when no usable pregnancy date is stored. */
export function PregnancySetup({ onSetup }: { onSetup: () => void }) {
  const size = useArtSize();
  return (
    <View style={[c.setup, { width: size, minHeight: size * 0.6 }]}>
      <Text style={c.caption}>Add your pregnancy dates</Text>
      <Text style={[c.detail, { marginBottom: 12 }]}>Enter the first day of your last period or your due date to see your baby’s month.</Text>
      <Text accessibilityRole="button" onPress={onSetup} style={c.link}>Set pregnancy dates</Text>
    </View>
  );
}

const c = themed(() => StyleSheet.create({
  row: { alignItems: 'center', paddingHorizontal: 20, marginTop: 12 },
  caption: { fontSize: 19, fontWeight: '700', color: colors.heading, textAlign: 'center' },
  detail: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4 },
  setup: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 24 },
  link: { fontSize: 16, fontWeight: '700', color: colors.primary, padding: 8 },
}));
