import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text, TextInput } from './text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ND, PressScale } from './anim';
import { Icon, type IconName } from './icons';
import { colors, radius, scheme, shadow, themed } from './theme';
import { flipX, rtl, t } from './i18n';

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const H = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h, style]}>{children}</Text>;
export const Title = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.title, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.muted, style]}>{children}</Text>;

export function Btn({ title, onPress, kind = 'primary', disabled, icon, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'dark'; disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'primary' || kind === 'dark' ? colors.onPrimary : kind === 'danger' ? colors.danger : colors.heading;
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled} scaleTo={0.97}
      style={[s.btn, kind === 'primary' && s.btnP, kind === 'ghost' && s.btnG, kind === 'danger' && s.btnD, kind === 'dark' && s.btnDark, disabled && { opacity: 0.45 }, style]}>
      {icon ? <View style={{ marginEnd: 10 }}><Icon name={icon} size={20} color={fg} /></View> : null}
      <Text style={[s.btnT, { color: fg }]}>{title}</Text>
    </PressScale>
  );
}

/** Outlined pill chip: quiet tile at rest, blush fill + accent outline + check when selected. */
export function Chip({ label, icon, on, onPress, ink = colors.primary }: {
  label: string; icon?: IconName; on: boolean; onPress: () => void; tint?: string; ink?: string;
}) {
  const accent = scheme === 'dark' ? colors.primary : ink;
  return (
    <PressScale accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={{ marginEnd: 8, marginBottom: 10 }}>
      <View style={[s.chip, on && { backgroundColor: colors.tileSelected, borderColor: accent }]}>
        {icon ? <View style={s.chipIcon}><Icon name={icon} size={20} color={on ? accent : colors.heading} weight={on ? 'fill' : 'regular'} /></View> : null}
        <Text style={[s.chipT, on && { color: colors.heading, fontWeight: '600' }]} maxFontSizeMultiplier={1.3}>{label}</Text>
        {on ? <View style={[s.chipCheck, { backgroundColor: accent }]}><Icon name="check-bold" size={11} color={colors.onPrimary} /></View> : null}
      </View>
    </PressScale>
  );
}

export const Field = (p: TextInputProps & { label: string }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={s.label}>{p.label}</Text>
    <TextInput accessibilityLabel={p.label} placeholderTextColor={colors.faint} autoCapitalize="none" {...p} style={[s.input, p.style]} />
  </View>
);

export function Stepper({ label, value, min, max, onChange, suffix, step = 1, format }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string; step?: number; format?: (n: number) => string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  return (
    <View style={s.stepRow}>
      <Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{label}</Text>
      <PressScale accessibilityLabel={t('Decrease {label}', { label })} style={s.stepBtn} onPress={() => onChange(clamp(value - step))}><Icon name="minus" size={20} color={colors.primary} /></PressScale>
      <Text style={s.stepVal}>{format ? format(value) : `${value}${suffix ?? ''}`}</Text>
      <PressScale accessibilityLabel={t('Increase {label}', { label })} style={s.stepBtn} onPress={() => onChange(clamp(value + step))}><Icon name="plus" size={20} color={colors.primary} /></PressScale>
    </View>
  );
}

/** Settings-style row: title, optional subtitle, optional switch or chevron. */
export function Row({ title, subtitle, value, onValueChange, onPress, icon, disabled, danger }: {
  title: string; subtitle?: string; value?: boolean; onValueChange?: (v: boolean) => void; onPress?: () => void; icon?: IconName; disabled?: boolean; danger?: boolean;
}) {
  const body = (
    <View style={[s.row, disabled && { opacity: 0.45 }]}>
      {icon ? <View style={s.rowIcon}><Icon name={icon} size={22} color={danger ? colors.danger : colors.heading} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.rowT, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.rowS}>{subtitle}</Text> : null}
      </View>
      {onValueChange ? (
        <Switch accessibilityLabel={title} value={!!value} onValueChange={onValueChange} disabled={disabled}
          trackColor={{ true: colors.primary, false: colors.switchOff }} thumbColor="#fff" ios_backgroundColor={colors.switchOff} {...(Platform.OS === 'web' ? { activeThumbColor: '#fff' } as object : {})} />
      ) : onPress ? <Icon name="chevron-right" size={20} color={colors.muted} /> : null}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}>{body}</Pressable> : body;
}

export const Section = ({ title }: { title: string }) => <Text style={s.section}>{title}</Text>;

/** Two-option segmented control with an animated sliding pill. */
export function Segmented<T extends string>({ options, value, onChange, width }: { options: [T, string][]; value: T; onChange: (v: T) => void; width?: number }) {
  const [w, setW] = useState(0);
  const idx = options.findIndex(([k]) => k === value);
  const v = useRef(new Animated.Value(idx)).current;
  useEffect(() => { Animated.spring(v, { toValue: idx, useNativeDriver: ND, speed: 18, bounciness: 6 }).start(); }, [idx, v]);
  const seg = w / options.length;
  return (
    <View style={[s.seg, { width: width ?? Math.max(220, options.length * 104) }]} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[s.segPill, { width: seg, transform: [{ translateX: v.interpolate({ inputRange: [0, Math.max(1, options.length - 1)], outputRange: [0, flipX(seg * Math.max(1, options.length - 1))] }) }] }]} />}
      {options.map(([k, l]) => (
        <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: k === value }} style={s.segBtn} onPress={() => onChange(k)}>
          <Text style={[s.segT, k === value && { color: colors.heading, fontWeight: '700' }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Text tabs in a rounded track (Overview · Activity · Sleep…). Scrolls when there are more than fit. */
export function PillTabs<T extends string>({ options, value, onChange, fill }: { options: [T, string][]; value: T; onChange: (v: T) => void; fill?: boolean }) {
  const ref = useRef<ScrollView>(null);
  const xs = useRef<Record<string, number>>({});
  const ws = useRef<Record<string, number>>({});
  const viewW = useRef(0);
  const atEnd = useRef(false);
  // The scroller stays left-to-right (scroll offsets differ between platforms in RTL); in RTL the tabs run
  // right-to-left inside it, start scrolled to the right end, and keep the selected tab clear of the right edge.
  useEffect(() => {
    const x = xs.current[value];
    if (x == null) return;
    if (!rtl) ref.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
    else ref.current?.scrollTo({ x: Math.max(0, 16 + x + (ws.current[value] ?? 0) + 60 - viewW.current), animated: true });
  }, [value]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ paddingHorizontal: 16 }, fill && { flexGrow: 1 }]}
      {...(rtl ? {
        style: { direction: 'ltr' as const },
        onLayout: (e: { nativeEvent: { layout: { width: number } } }) => { viewW.current = e.nativeEvent.layout.width; },
        onContentSizeChange: () => { if (!atEnd.current) { atEnd.current = true; ref.current?.scrollToEnd({ animated: false }); } },
      } : {})}>
      <View style={[s.pt, fill && { flex: 1 }, rtl && { direction: 'rtl' }]} accessibilityRole="tablist">
        {options.map(([k, l]) => {
          const on = k === value;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(k)} onLayout={(e) => { xs.current[k] = e.nativeEvent.layout.x; ws.current[k] = e.nativeEvent.layout.width; }}
              style={[s.ptBtn, fill && { flex: 1, paddingHorizontal: 8 }, on && s.ptOn]}>
              <Text style={[s.ptT, on && s.ptTOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export { Sheet } from './sheet';

export function TopBar({ title, onBack, onClose, right, subtitle }: { title?: string; subtitle?: string; onBack?: () => void; onClose?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.topBar}>
      <View style={{ width: 48 }}>
        {onBack ? <PressScale accessibilityLabel={t('Back')} onPress={onBack} style={s.iconBtn}><Icon name="chevron-left" size={26} color={colors.heading} /></PressScale> : null}
        {onClose ? <PressScale accessibilityLabel={t('Close')} onPress={onClose} style={s.iconBtn}><Icon name="close" size={28} color={colors.heading} /></PressScale> : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? <Text style={s.topTitle} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
      </View>
      <View style={{ minWidth: 48, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export const Page = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <ScrollView contentContainerStyle={[{ padding: 20, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' }, style]}>{children}</ScrollView>
);

export const s = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  h: { fontSize: 20, fontWeight: '700', color: colors.heading, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  btn: { borderRadius: 999, minHeight: 54, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginVertical: 5, flexDirection: 'row' },
  btnP: { backgroundColor: colors.primary },
  btnG: { backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border },
  btnD: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.danger },
  btnDark: { backgroundColor: colors.primaryDark },
  btnT: { fontWeight: '600', fontSize: 17 },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingVertical: 6, paddingStart: 12, paddingEnd: 14, borderRadius: radius.chip, backgroundColor: colors.tile, borderWidth: 1.5, borderColor: 'transparent' },
  chipIcon: { marginEnd: 8 },
  chipCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginStart: 8 },
  chipT: { color: colors.text, fontSize: 16 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.input },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 84, textAlign: 'center', fontSize: 17, color: colors.heading, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginEnd: 14 },
  rowT: { fontSize: 17, color: colors.heading },
  rowS: { fontSize: 14, color: colors.muted, marginTop: 2, lineHeight: 19 },
  section: { color: colors.heading, fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 6 },
  seg: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: 999, padding: 4, width: 220, borderWidth: 1, borderColor: colors.border },
  segPill: { position: 'absolute', top: 4, start: 4, bottom: 4, borderRadius: 999, backgroundColor: colors.primarySoft, borderWidth: scheme === 'dark' ? 1.5 : 0, borderColor: colors.primary },
  segBtn: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  segT: { color: colors.muted, fontSize: 16 },
  pt: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: scheme === 'dark' ? colors.input : 'transparent', borderWidth: scheme === 'dark' ? 1 : 0, borderColor: colors.border },
  ptBtn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  ptOn: { backgroundColor: colors.primarySoft, borderColor: scheme === 'dark' ? colors.primary : 'transparent' },
  ptT: { fontSize: 16, color: colors.muted },
  ptTOn: { color: colors.heading, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, minHeight: 64 },
  topTitle: { fontSize: 26, fontWeight: '700', color: colors.heading },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
}));

export const fadeEasing = Easing.out(Easing.cubic);
