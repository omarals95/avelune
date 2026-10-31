import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export const ND = Platform.OS !== 'web';

/** Honour the OS "reduce motion" setting: loops stop and transitions become instant. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(!!v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduce(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

/** A value that oscillates 0→1→0 forever (for breathing / floating effects). */
export function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) { v.setValue(0.5); return; }
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay, reduce]);
  return v;
}

/** Fade + rise in on mount; `delay` lets lists stagger. */
export function FadeIn({ children, delay = 0, style, from = 14 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [v, delay, reduce]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

const OUTER_KEYS = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom']);

/** Pressable that springs down slightly when touched. */
export function PressScale({ children, style, scaleTo = 0.94, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) => Animated.spring(v, { toValue: n, useNativeDriver: ND, speed: 48, bounciness: 6 }).start();
  // Layout keys belong on the outer Pressable so flex/width/margins behave; visuals stay on the scaled view.
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(flat)) (OUTER_KEYS.has(k) || k.startsWith('margin') ? outer : inner)[k] = val;
  if ('flex' in outer || 'width' in outer) inner.flexGrow = 1;
  return (
    <Pressable {...rest} style={outer as ViewStyle} onPressIn={(e) => { to(scaleTo); rest.onPressIn?.(e); }} onPressOut={(e) => { to(1); rest.onPressOut?.(e); }}>
      <Animated.View style={[inner as ViewStyle, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Springs from 0→1 whenever `trigger` changes (pop-in confirmations). */
export function usePop(trigger: unknown) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) { v.setValue(1); return; }
    v.setValue(0);
    Animated.spring(v, { toValue: 1, useNativeDriver: ND, speed: 14, bounciness: 14 }).start();
  }, [trigger, v, reduce]);
  return v;
}
