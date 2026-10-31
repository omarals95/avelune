import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Reanimated, {
  Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from './text';
import { font } from './theme';

/**
 * Motion primitives built on Reanimated (UI-thread worklets) rather than GSAP: GSAP drives DOM/CSS and
 * cannot animate native views. Timings follow the GSAP presets' guidance: enter ~600–900ms ease-out,
 * stagger ≤8 items at ~40ms, and reduced motion renders the final state immediately.
 */
export const WEB = Platform.OS === 'web';
export const EASE = Easing.out(Easing.cubic);
export const STAGGER = 40;

/** 0→1 progress that plays once on mount / when `key` changes. */
export function useProgress(key: unknown, delay = 0, duration = 900): SharedValue<number> {
  const p = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || WEB) { p.value = 1; return; }
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
  }, [key, delay, duration, reduce, p]);
  return p;
}

function formatNum(v: number, decimals: number, sep: boolean) {
  'worklet';
  const fixed = v.toFixed(decimals);
  if (!sep) return fixed;
  const [i, f] = fixed.split('.');
  let out = '';
  for (let k = 0; k < i.length; k++) { if (k && (i.length - k) % 3 === 0) out += ','; out += i[k]; }
  return f ? `${out}.${f}` : out;
}

const AnimatedInput = Reanimated.createAnimatedComponent(TextInput);

/** Count-up number (odometer feel). Native: animated on the UI thread. Web: requestAnimationFrame fallback. */
export function CountUp({ value, decimals = 0, separator = true, style, delay = 0 }: {
  value: number; decimals?: number; separator?: boolean; style?: StyleProp<TextStyle>; delay?: number;
}) {
  const reduce = useReducedMotion();
  const sv = useSharedValue(reduce ? value : 0);
  const finalText = formatNum(value, decimals, separator);
  useEffect(() => {
    if (WEB) return;
    sv.value = reduce ? value : withDelay(delay, withTiming(value, { duration: 1000, easing: EASE }));
  }, [value, reduce, delay, sv]);
  const animatedProps = useAnimatedProps(() => ({ text: formatNum(sv.value, decimals, separator), defaultValue: '' }) as object);
  const [webText, setWebText] = useState(reduce ? finalText : formatNum(0, decimals, separator));
  useEffect(() => {
    if (!WEB) return;
    if (reduce) { setWebText(finalText); return; }
    let raf = 0; const t0 = performance.now() + delay;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 1000));
      setWebText(formatNum(value * (1 - Math.pow(1 - k, 3)), decimals, separator));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals, separator, delay, reduce, finalText]);
  const flat = StyleSheet.flatten([{ fontFamily: font.black }, style]);
  if (WEB) return <Text style={flat} accessibilityLabel={finalText}>{webText}</Text>;
  return <AnimatedInput editable={false} underlineColorAndroid="transparent" accessibilityLabel={finalText} defaultValue={finalText}
    animatedProps={animatedProps} style={[flat, { padding: 0, margin: 0 }]} />;
}

const APath = Reanimated.createAnimatedComponent(Path);
const ARect = Reanimated.createAnimatedComponent(Rect);
const ACircle = Reanimated.createAnimatedComponent(Circle);

/** Sparkline that draws itself left→right. Gaps (null) break the line. */
export function Sparkline({ values, width, height, color, strokeWidth = 2.5, dot = true, min, max }: {
  values: (number | null)[]; width: number; height: number; color: string; strokeWidth?: number; dot?: boolean; min?: number; max?: number;
}) {
  const nums = values.filter((v): v is number => v != null);
  const lo = min ?? Math.min(...nums), hi = max ?? Math.max(...nums);
  const pad = 4;
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (height - pad * 2);
  let d = ''; let len = 0; let last: [number, number] | null = null; let end: [number, number] | null = null;
  values.forEach((v, i) => {
    if (v == null) { last = null; return; }
    const pt: [number, number] = [x(i), y(v)];
    d += `${last ? 'L' : 'M'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
    if (last) len += Math.hypot(pt[0] - last[0], pt[1] - last[1]);
    last = pt; end = pt;
  });
  const p = useProgress(d);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  if (!nums.length) return <Svg width={width} height={height} />;
  return (
    <Svg width={width} height={height}>
      <APath d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${len} ${len}`} animatedProps={props} />
      {dot && end ? <Circle cx={(end as [number, number])[0]} cy={(end as [number, number])[1]} r={4} fill="#fff" stroke={color} strokeWidth={2.5} /> : null}
    </Svg>
  );
}

function Bar({ x, w, h, H, color, i, radius }: { x: number; w: number; h: number; H: number; color: string; i: number; radius: number }) {
  const p = useProgress(h, i * STAGGER, 700);
  const props = useAnimatedProps(() => ({ y: H - h * p.value, height: h * p.value }));
  return <ARect x={x} width={w} rx={radius} fill={color} animatedProps={props} />;
}

/** Bars that rise with a short stagger. Highlight marks the last (current) value; nulls render as faint stubs. */
export function MiniBars({ values, width, height, color, faint, highlightLast = true, max }: {
  values: (number | null)[]; width: number; height: number; color: string; faint: string; highlightLast?: boolean; max?: number;
}) {
  const hi = max ?? Math.max(1, ...values.map((v) => v ?? 0));
  const gap = 6; const n = values.length;
  const w = Math.max(3, (width - gap * (n - 1)) / n);
  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = v == null ? 3 : Math.max(3, (v / hi) * (height - 2));
        return <Bar key={i} i={i} x={i * (w + gap)} w={w} h={h} H={height} radius={Math.min(4, w / 2)}
          color={v == null ? faint : highlightLast && i === n - 1 ? color : color + 'AA'} />;
      })}
    </Svg>
  );
}

/** Progress ring that sweeps clockwise. */
export function Ring({ progress, size, stroke = 10, color, track, delay = 0, children }: {
  progress: number; size: number; stroke?: number; color: string; track: string; delay?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, progress));
  const p = useProgress(target, delay, 1000);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - target * p.value) }));
  return (
    <Reanimated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} animatedProps={props} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      {children}
    </Reanimated.View>
  );
}

/** Glass that fills to `progress` with a soft spring. */
export function Glass({ progress, width = 54, height = 70, color, track }: { progress: number; width?: number; height?: number; color: string; track: string }) {
  const level = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => { const t = Math.max(0, Math.min(1, progress)); level.value = reduce || WEB ? t : withSpring(t, { damping: 14, stiffness: 90 }); }, [progress, reduce, level]);
  const props = useAnimatedProps(() => ({ y: 4 + (height - 8) * (1 - level.value), height: (height - 8) * level.value }));
  return (
    <Svg width={width} height={height}>
      <Rect x={2} y={2} width={width - 4} height={height - 4} rx={12} fill={track} stroke={color} strokeWidth={2} />
      <ARect x={4} width={width - 8} rx={10} fill={color} opacity={0.85} animatedProps={props} />
    </Svg>
  );
}
