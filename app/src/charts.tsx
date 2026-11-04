import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from './text';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { ND, useReduceMotion } from './anim';
import { colors } from './theme';

export interface Pt { i: number; y: number | null }

/** Bar path with rounded top corners only. */
export function roundTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, h, w / 2));
  return `M${x},${y + h}L${x},${y + rr}Q${x},${y} ${x + rr},${y}L${x + w - rr},${y}Q${x + w},${y} ${x + w},${y + rr}L${x + w},${y + h}Z`;
}

function useGrow(deps: unknown) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    v.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [deps, v, reduce]);
  return v;
}

/** Shared frame: y-axis ticks, gridlines, x labels, optional dotted target line, "no data" message. */
export function Chart({ points, kind, yMin, yMax, ticks = 6, target, markers = [], color = colors.primary, xLabels, empty, digits = 0, height = 360, valueLabels, targetLabel = 'Goal' }: {
  points: Pt[]; kind: 'line' | 'bar'; yMin: number; yMax: number; ticks?: number; target?: number; markers?: { i: number; label: string; color: string }[];
  color?: string; xLabels: string[]; empty?: boolean; digits?: number; height?: number; valueLabels?: boolean; targetLabel?: string;
}) {
  const [w, setW] = useState(0);
  const grow = useGrow(JSON.stringify(points));
  const L = 48, R = 12, T = 16, B = 30;
  const n = Math.max(1, xLabels.length);
  const cw = Math.max(0, w - L - R);
  const ch = height - T - B;
  const x = (i: number) => L + (n === 1 ? cw / 2 : (i + 0.5) * (cw / n));
  const y = (v: number) => T + ch - ((v - yMin) / (yMax - yMin || 1)) * ch;
  // Thin x labels by available width (≈38px per label) so they never collide.
  const step = Math.max(1, Math.ceil((n * 38) / Math.max(1, cw)));
  const pts = points.filter((p) => p.y != null) as { i: number; y: number }[];
  let path = '';
  for (const p of pts) path += `${path ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.y).toFixed(1)}`;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Animated.View style={{ opacity: grow, transform: [{ translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={1} />
                <Stop offset="1" stopColor={color} stopOpacity={0.55} />
              </LinearGradient>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.32} />
                <Stop offset="1" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {Array.from({ length: ticks + 1 }, (_, k) => {
              const v = yMin + ((yMax - yMin) * k) / ticks;
              return (
                <G key={k}>
                  <Line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke={colors.divider} strokeWidth={1} />
                  <SvgText x={L - 10} y={y(v) + 4} fontSize={12} fontFamily="NunitoSans_400Regular" fill={colors.muted} textAnchor="end">{v.toFixed(digits)}</SvgText>
                </G>
              );
            })}
            <Line x1={L} x2={w - R} y1={T + ch} y2={T + ch} stroke={colors.faint} strokeWidth={1} />
            {xLabels.map((l, i) => i % step === 0 ? <SvgText key={i} x={x(i)} y={height - 6} fontSize={12} fontFamily="NunitoSans_400Regular" fill={colors.muted} textAnchor="middle">{l}</SvgText> : null)}
            {markers.map((m, k) => (
              <G key={k}>
                <Rect x={x(m.i) - cw / n / 2} y={T} width={Math.max(4, cw / n)} height={ch} fill={m.color} opacity={0.13} />
                <SvgText x={x(m.i)} y={T + 12} fontSize={11} fill={m.color} textAnchor="middle" fontWeight="bold">{m.label}</SvgText>
              </G>
            ))}
            {target != null && <Line x1={L} x2={w - R} y1={y(target)} y2={y(target)} stroke={colors.muted} strokeDasharray="3 5" strokeWidth={1.2} />}
            {kind === 'bar' && pts.map((p) => {
              const bw = Math.max(3, Math.min(56, (cw / n) * 0.58));
              const top = y(Math.max(yMin, p.y));
              return (
                <G key={p.i}>
                  <Path d={roundTop(x(p.i) - bw / 2, top, bw, T + ch - top, Math.min(8, bw / 2))} fill="url(#barFill)" />
                  {valueLabels ? <SvgText x={x(p.i)} y={top - 8} fontSize={15} fontFamily="NunitoSans_600SemiBold" fill={colors.heading} textAnchor="middle">{p.y.toFixed(digits)}</SvgText> : null}
                </G>
              );
            })}
            {kind === 'line' && pts.length > 1 && <Path d={`${path}L${x(pts[pts.length - 1].i).toFixed(1)},${T + ch}L${x(pts[0].i).toFixed(1)},${T + ch}Z`} fill="url(#areaFill)" />}
            {kind === 'line' && pts.length > 1 && <Path d={path} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" />}
            {kind === 'line' && pts.map((p) => <Circle key={p.i} cx={x(p.i)} cy={y(p.y)} r={4} fill={color} stroke={colors.card} strokeWidth={1.5} />)}
          </Svg>
        </Animated.View>
      )}
      {target != null && w > 0 && (
        <View style={{ position: 'absolute', left: 0, top: y(target) - 11, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: colors.onPrimary, fontSize: 12, fontWeight: '600' }}>{targetLabel}</Text>
        </View>
      )}
      {empty && <View style={{ position: 'absolute', left: 48, right: 0, top: 0, bottom: 30, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted, fontSize: 18, textAlign: 'center' }}>No data for this cycle</Text></View>}
    </View>
  );
}

/** Horizontal bar for one cycle: period segment + rest, with an animated fill. */
export function CycleBar({ label, length, periodDays, max, current }: { label: string; length: number; periodDays: number; max: number; current?: boolean }) {
  const grow = useGrow(length);
  const pct = Math.min(1, length / max);
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ fontSize: 15, color: colors.muted, fontWeight: '700', marginBottom: 8 }}>{current ? 'CURRENT CYCLE: ' : ''}<Text style={{ fontWeight: '400' }}>{label}</Text></Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, overflow: 'hidden' }}>
          <Animated.View style={{ height: 26, width: `${pct * 100}%`, borderRadius: 13, flexDirection: 'row', overflow: 'hidden', backgroundColor: colors.fertileSoft,
            transform: [{ translateX: grow.interpolate({ inputRange: [0, 1], outputRange: [-240, 0] }) }] }}>
            <View style={{ width: `${Math.min(100, (periodDays / Math.max(1, length)) * 100)}%`, backgroundColor: colors.period }} />
          </Animated.View>
        </View>
        <Text style={{ width: 86, textAlign: 'right', fontSize: 18, color: colors.text }}><Text style={{ fontWeight: '800', fontSize: 22 }}>{length}</Text> days</Text>
      </View>
    </View>
  );
}

/** Mini sparkline-style bars used on the Graphs & reports tile. */
export function MiniBars({ values, highlight }: { values: number[]; highlight: number }) {
  const max = Math.max(1, ...values);
  return (
    <Svg width="100%" height={80} viewBox={`0 0 ${values.length * 22} 80`} preserveAspectRatio="none">
      {values.map((v, i) => {
        const h = 20 + (v / max) * 56;
        return i === highlight
          ? <Rect key={i} x={i * 22 + 3} y={78 - h} width={14} height={h} rx={3} fill={colors.accent} />
          : <Rect key={i} x={i * 22 + 4} y={79 - h} width={12} height={h - 2} rx={3} fill="none" stroke={colors.primary} strokeWidth={2.5} />;
      })}
    </Svg>
  );
}
