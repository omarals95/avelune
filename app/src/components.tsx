import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from './text';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { addDays, diffDays, parseDate, type DateStr, type DayKind, type LifeStage, type NoForecast, type Phase } from '@avelune/core';
import { FadeIn, ND, PressScale, useLoop, usePop, useReduceMotion } from './anim';
import { Icon, type IconName } from './icons';
import { blobColor, circleFill, colors, phaseGradient, scheme, shadow, type Mood, themed } from './theme';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const fmtDay = (d: DateStr) => `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1]}`;
export const fmtShort = (d: DateStr) => `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1].slice(0, 3)}`;
/** Monday-based weekday index 0..6 */
export const mondayIndex = (d: DateStr) => (parseDate(d).getDay() + 6) % 7;
export const weekStart = (d: DateStr) => addDays(d, -mondayIndex(d));

export interface StatusInput {
  hasData: boolean;
  today: DateStr;
  date: DateStr;
  kind: DayKind;
  cycleDay: number | null;
  phase: Phase | null;
  daysUntilPeriod: number | null;
  fertileWindow: [DateStr, DateStr] | null;
  ovulationDate: DateStr | null;
  inPeriod: boolean;
  /** Days past the END of the likely window (null = not late). */
  lateBy?: number | null;
  lateDismissed?: boolean;
  noForecast?: NoForecast | null;
  stage?: LifeStage;
}
export interface Status { mood: Mood; kicker: string; big: string; sub: string }

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Copy + colour mood for the big circle, for today or any selected day. */
export function statusFor(i: StatusInput): Status {
  if (!i.hasData) return { mood: 'none', kicker: 'Welcome', big: 'Log your period', sub: 'Predictions start after your first logged period' };
  if (i.date !== i.today) {
    const cd = i.cycleDay ? `Cycle day ${i.cycleDay}` : fmtDay(i.date);
    const map: Record<DayKind, Status> = {
      period: { mood: 'menstrual', kicker: cd, big: 'Period', sub: 'Logged period day' },
      'predicted-period': { mood: 'menstrual', kicker: cd, big: 'Period', sub: 'Predicted period day' },
      fertile: { mood: 'fertile', kicker: cd, big: 'Fertile', sub: 'Higher chance of getting pregnant' },
      ovulation: { mood: 'ovulation', kicker: cd, big: 'Ovulation', sub: 'Estimated ovulation day' },
      none: { mood: 'none', kicker: fmtDay(i.date), big: i.cycleDay ? `Day ${i.cycleDay}` : '—', sub: 'Lower chance of getting pregnant' },
    };
    return map[i.kind];
  }
  if (i.inPeriod) return { mood: 'menstrual', kicker: 'Period', big: `Day ${i.cycleDay ?? 1}`, sub: 'Log your flow and how you feel' };
  const cd = i.cycleDay ? `Day ${i.cycleDay}` : '—';
  switch (i.noForecast) {
    case 'paused': return { mood: 'none', kicker: 'Tracking paused', big: cd, sub: 'since your last period' };
    case 'postpartum': {
      const wk = i.stage?.kind === 'postpartum' ? Math.floor(diffDays(i.stage.since, i.today) / 7) + 1 : null;
      return { mood: 'follicular', kicker: 'After birth', big: wk ? `Week ${wk}` : 'Postpartum', sub: i.stage?.kind === 'postpartum' && i.stage.breastfeeding ? 'Breastfeeding' : 'Log bleeding any time' };
    }
    case 'loss': return { mood: 'none', kicker: 'Be gentle with yourself', big: cd, sub: 'Predictions return after your next period' };
    case 'no-uterus': return { mood: 'none', kicker: 'Today', big: 'Check in', sub: 'No period forecast' };
    case 'user': return { mood: 'none', kicker: 'Since your last period', big: cd, sub: 'Forecast off' };
    default: break;
  }
  const d = i.daysUntilPeriod;
  if (i.lateBy && !i.lateDismissed) return { mood: 'late', kicker: 'Period not started', big: cd, sub: `${plural(i.lateBy, 'day')} past your likely window` };
  if (d != null && d < 0 && i.lateDismissed) return { mood: i.phase ?? 'none', kicker: 'Cycle', big: cd, sub: 'No period logged yet' };
  if (d != null && d < 0) return { mood: 'menstrual', kicker: 'Period', big: 'Due any day', sub: 'Within your likely window' };
  if (d === 0) return { mood: 'menstrual', kicker: 'Period', big: 'Expected today', sub: 'Log it when it starts' };
  if (i.fertileWindow && i.ovulationDate && i.date >= i.fertileWindow[0] && i.date <= i.fertileWindow[1]) {
    const toOv = diffDays(i.date, i.ovulationDate);
    return {
      mood: toOv === 0 ? 'ovulation' : 'fertile', kicker: 'Fertile window',
      big: toOv > 0 ? `Ovulation in ${plural(toOv, 'day')}` : toOv === 0 ? 'Ovulation today' : 'High chance',
      sub: 'Higher chance of getting pregnant',
    };
  }
  if (d == null) return { mood: i.phase ?? 'none', kicker: 'Cycle', big: cd, sub: 'No forecast' };
  return { mood: i.phase ?? 'none', kicker: 'Period in', big: plural(d, 'day'), sub: i.fertileWindow ? 'Lower chance of getting pregnant' : 'Based on your recent cycles' };
}

/** Phase-tinted gradient with slowly drifting soft blobs. Cross-fades when the mood changes. */
export function MoodBackground({ mood }: { mood: Mood }) {
  const a = useLoop(5200);
  const b = useLoop(6800, 600);
  const fade = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(mood);
  const [prev, setPrev] = useState<Mood | null>(null);
  useEffect(() => {
    if (mood === shown) return;
    setPrev(shown); setShown(mood); fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => setPrev(null));
  }, [mood, shown, fade]);
  const blob = (v: Animated.Value, size: number, style: object, dx: number, dy: number) => (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: blobColor[shown], opacity: 0.55 }, style,
      { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-dy, dy] }) }] }]} />
  );
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {prev ? <LinearGradient colors={phaseGradient[prev]} style={StyleSheet.absoluteFill} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <LinearGradient colors={phaseGradient[shown]} style={StyleSheet.absoluteFill} />
        {blob(a, 420, { top: -160, right: -170 }, 18, 14)}
        {blob(b, 360, { top: 300, left: -200 }, 14, 22)}
      </Animated.View>
    </View>
  );
}

/** Horizontally pageable week strip (Mon–Sun), coloured by day kind. */
export function WeekStrip({ today, selected, onSelect, kindOf }: {
  today: DateStr; selected: DateStr; onSelect: (d: DateStr) => void; kindOf: (d: DateStr) => DayKind;
}) {
  const { width: winW } = useWindowDimensions();
  const [w, setW] = useState(Math.min(winW, 640));
  const ref = useRef<ScrollView>(null);
  const WEEKS = 13, MID = 6;
  const base = weekStart(today);
  useEffect(() => { requestAnimationFrame(() => ref.current?.scrollTo({ x: MID * w, animated: false })); }, [w]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: MID * w, y: 0 }}>
        {Array.from({ length: WEEKS }, (_, wi) => {
          const start = addDays(base, (wi - MID) * 7);
          return (
            <View key={wi} style={{ width: w, flexDirection: 'row', paddingHorizontal: 8 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(start, i);
                const kind = kindOf(d);
                const sel = d === selected;
                const k = KIND_STYLE[kind];
                return (
                  <PressScale key={d} accessibilityRole="button" accessibilityState={{ selected: sel }}
                    accessibilityLabel={`${fmtDay(d)}${d === today ? ', today' : ''}${kind !== 'none' ? `, ${KIND_LABEL[kind]}` : ''}`} onPress={() => onSelect(d)} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={[ws.col, sel && ws.colSel]}>
                      <Text style={[ws.dow, sel && ws.dowSel]} numberOfLines={1} maxFontSizeMultiplier={1.1}>{DOW3[i]}</Text>
                      <View style={[ws.day, sel && ws.daySel]}>
                        <Text style={[ws.dayT, sel && ws.dayTSel, d === today && !sel && { fontWeight: '700' }]} maxFontSizeMultiplier={1.15}>{+d.slice(8)}</Text>
                      </View>
                    </View>
                    <KindDot kind={kind} today={d === today} />
                  </PressScale>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Day kinds use shape + colour (filled, dashed ring, soft fill) so meaning never relies on colour alone. */
export const KIND_LABEL: Record<DayKind, string> = { period: 'period', 'predicted-period': 'predicted period', fertile: 'fertile window', ovulation: 'ovulation', none: '' };
export const KIND_STYLE: Record<DayKind, { box: object; color: string }> = themed(() => ({
  period: { box: { backgroundColor: colors.period }, color: colors.white },
  'predicted-period': { box: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.period }, color: colors.period },
  fertile: { box: { backgroundColor: colors.fertileSoft }, color: colors.fertile },
  ovulation: { box: { backgroundColor: colors.ovulationSoft, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ovulation }, color: colors.ovulation },
  none: { box: {}, color: colors.text },
}));

const DOW3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Small marker under each day: shape + colour (filled dot, ring, or soft dot) so meaning never relies on colour alone. */
function KindDot({ kind, today }: { kind: DayKind; today: boolean }) {
  const c = kind === 'period' || kind === 'predicted-period' ? colors.period : kind === 'fertile' ? colors.fertile : kind === 'ovulation' ? colors.ovulation : today ? colors.heading : colors.faint;
  const ring = kind === 'predicted-period' || kind === 'ovulation';
  const size = kind === 'none' ? 4 : 7;
  return <View style={{ height: 12, justifyContent: 'center' }}><View style={{ width: size, height: size, borderRadius: size, backgroundColor: ring ? 'transparent' : c, borderWidth: ring ? 1.5 : 0, borderColor: c, opacity: kind === 'none' && !today ? 0.7 : 1 }} /></View>;
}

const ws = themed(() => StyleSheet.create({
  col: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 18, minWidth: 46 },
  colSel: scheme === 'dark' ? { backgroundColor: colors.tileSelected } : { backgroundColor: colors.primarySoft },
  dow: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  dowSel: { color: colors.heading, fontWeight: '700' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  daySel: scheme === 'dark' ? {} : { backgroundColor: colors.primary },
  dayT: { fontSize: 19, color: colors.heading },
  dayTSel: { color: scheme === 'dark' ? colors.heading : colors.onPrimary, fontWeight: '700' },
}));

/** The big breathing circle. `children` renders extra content (e.g. the pregnancy growth mark). */
export function StatusCircle({ status, celebrateKey, ring, children }: {
  status: Status; celebrateKey?: number; ring?: number; children?: React.ReactNode;
}) {
  const breathe = useLoop(3200);
  const pop = usePop(celebrateKey);
  const [showPop, setShowPop] = useState(false);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!celebrateKey) return;
    setShowPop(true);
    const t = setTimeout(() => setShowPop(false), 1800);
    return () => clearTimeout(t);
  }, [celebrateKey]);
  const fill = circleFill[status.mood];
  const fertile = !!fill; // filled circles use white text
  const late = status.mood === 'late';
  const D = 280;
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, reduce ? 1 : 1.025] });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: D + 30 }}>
      <Animated.View style={[cs.circle, { width: D, height: D, borderRadius: D / 2, transform: [{ scale }] },
        fill ? { backgroundColor: fill, borderColor: 'rgba(255,255,255,0.6)' } : null, late && { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
        {ring != null ? <ProgressRing size={D} progress={ring} /> : null}
        {showPop ? (
          <Animated.View accessibilityLiveRegion="polite" style={{ alignItems: 'center', opacity: pop, transform: [{ scale: pop }] }}>
            <Icon name="check-bold" size={72} color={fertile ? '#fff' : colors.text} />
            <Text style={[cs.sub, { fontSize: 20, marginTop: 6 }, fertile && { color: '#fff' }]}>Predictions updated!</Text>
          </Animated.View>
        ) : (
          <FadeIn key={status.kicker + status.big} style={{ alignItems: 'center', paddingHorizontal: 22 }} from={8}>
            <View accessible accessibilityLabel={`${status.kicker} ${status.big}. ${status.sub}`} style={{ alignItems: 'center' }}>
            {children}
            <Text style={[cs.kicker, fertile && { color: '#fff' }]} maxFontSizeMultiplier={1.25}>{status.kicker}</Text>
            <Text style={[cs.big, fertile && { color: '#fff' }, status.big.length > 10 && { fontSize: 34 }]} adjustsFontSizeToFit numberOfLines={2} maxFontSizeMultiplier={1.2}>{status.big}</Text>
            <Text style={[cs.sub, fertile && { color: '#fff' }]} maxFontSizeMultiplier={1.25}>{status.sub}</Text>
            </View>
          </FadeIn>
        )}
      </Animated.View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function ProgressRing({ size, progress }: { size: number; progress: number }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: Math.max(0, Math.min(1, progress)), duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [progress, v]);
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.6)" strokeWidth={6} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={colors.pregnancy} strokeWidth={6} fill="none" strokeLinecap="round"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [c, 0] })}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
  );
}

const cs = themed(() => StyleSheet.create({
  // No elevation on Android: shadows on semi-transparent views render as a grey polygon there.
  circle: { backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'android' ? {} : shadow) },
  kicker: { fontSize: 19, fontWeight: '600', color: colors.text, marginBottom: 4 },
  big: { fontSize: 44, fontWeight: '700', color: colors.heading, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 8, fontWeight: '500' },
}));

export function QuickAction({ icon, label, onPress, filled, tint = colors.primary }: { icon: IconName; label: string; onPress: () => void; filled?: boolean; tint?: string }) {
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', width: 96 }}>
      <View style={[qa.btn, filled && { backgroundColor: tint }]}>
        <Icon name={icon} size={34} color={filled ? '#fff' : colors.text} />
      </View>
      <Text style={qa.label} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>{label}</Text>
    </PressScale>
  );
}
const qa = themed(() => StyleSheet.create({
  btn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  label: { marginTop: 8, fontSize: 16, color: colors.text, fontWeight: '500', textAlign: 'center' },
}));

export function StoryCard({ title, tint, ink, icon, onPress, art }: { title: string; tint: string; ink: string; icon?: IconName; art?: React.ReactNode; onPress: () => void }) {
  const floaty = useLoop(2600);
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[sc.wrap]}>
      <View style={[sc.card, { backgroundColor: tint }]}>
        <Text style={sc.t} numberOfLines={3} maxFontSizeMultiplier={1.2}>{title}</Text>
        <Animated.View style={{ position: 'absolute', right: 12, bottom: 12, transform: [{ translateY: floaty.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
          {art ?? (icon ? <Icon name={icon} size={60} color={ink} /> : null)}
        </Animated.View>
      </View>
    </PressScale>
  );
}
const sc = themed(() => StyleSheet.create({
  wrap: { marginRight: 12, padding: 3, borderRadius: 24, borderWidth: 2, borderColor: colors.accent },
  card: { width: 150, height: 178, borderRadius: 18, padding: 14, overflow: 'hidden' },
  t: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 21 },
}));

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  return now;
}

export const ago = (ts: number, now: number) => {
  const m = Math.round((now - ts) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export const useStable = <T,>(v: T) => useMemo(() => v, [JSON.stringify(v)]);
