import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text, TextInput } from './text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ND, PressScale } from './anim';
import { Icon, type IconName } from './icons';
import { colors, radius, shadow } from './theme';

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const H = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.h, style]}>{children}</Text>;
export const Title = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.title, style]}>{children}</Text>;
export const Muted = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.muted, style]}>{children}</Text>;

export function Btn({ title, onPress, kind = 'primary', disabled, icon, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'dark'; disabled?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'primary' || kind === 'dark' ? '#fff' : kind === 'danger' ? colors.danger : colors.primary;
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled} scaleTo={0.97}
      style={[s.btn, kind === 'primary' && s.btnP, kind === 'ghost' && s.btnG, kind === 'danger' && s.btnD, kind === 'dark' && s.btnDark, disabled && { opacity: 0.45 }, style]}>
      {icon ? <Icon name={icon} size={20} color={fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[s.btnT, { color: fg }]}>{title}</Text>
    </PressScale>
  );
}

/** Pill chip with a round icon badge, tinted by category; springs and fills when selected. */
export function Chip({ label, icon, on, onPress, tint = colors.primarySoft, ink = colors.primary }: {
  label: string; icon?: IconName; on: boolean; onPress: () => void; tint?: string; ink?: string;
}) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start(); }, [on, v]);
  const bg = v.interpolate({ inputRange: [0, 1], outputRange: [tint, ink] });
  return (
    <PressScale accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={{ marginRight: 8, marginBottom: 10 }}>
      <Animated.View style={[s.chip, { backgroundColor: bg }]}>
        {icon ? (
          <View style={[s.chipIcon, { backgroundColor: on ? 'rgba(255,255,255,0.25)' : '#fff' }]}>
            <Icon name={icon} size={18} color={on ? '#fff' : ink} />
          </View>
        ) : null}
        <Text style={[s.chipT, on && { color: '#fff', fontWeight: '600' }]}>{label}</Text>
        {on ? <Icon name="check" size={16} color="#fff" style={{ marginLeft: 6 }} /> : null}
      </Animated.View>
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
      <PressScale accessibilityLabel={`Decrease ${label}`} style={s.stepBtn} onPress={() => onChange(clamp(value - step))}><Icon name="minus" size={20} color={colors.primary} /></PressScale>
      <Text style={s.stepVal}>{format ? format(value) : `${value}${suffix ?? ''}`}</Text>
      <PressScale accessibilityLabel={`Increase ${label}`} style={s.stepBtn} onPress={() => onChange(clamp(value + step))}><Icon name="plus" size={20} color={colors.primary} /></PressScale>
    </View>
  );
}

/** Settings-style row: title, optional subtitle, optional switch or chevron. */
export function Row({ title, subtitle, value, onValueChange, onPress, icon, disabled, danger }: {
  title: string; subtitle?: string; value?: boolean; onValueChange?: (v: boolean) => void; onPress?: () => void; icon?: IconName; disabled?: boolean; danger?: boolean;
}) {
  const body = (
    <View style={[s.row, disabled && { opacity: 0.45 }]}>
      {icon ? <View style={s.rowIcon}><Icon name={icon} size={20} color={danger ? colors.danger : colors.text} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.rowT, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.rowS}>{subtitle}</Text> : null}
      </View>
      {onValueChange ? (
        <Switch accessibilityLabel={title} value={!!value} onValueChange={onValueChange} disabled={disabled}
          trackColor={{ true: '#B79BB8', false: '#D8CED6' }} thumbColor={value ? colors.primary : '#fff'} {...(Platform.OS === 'web' ? { activeThumbColor: colors.primary } as object : {})} />
      ) : onPress ? <Icon name="chevron-right" size={22} color={colors.faint} /> : null}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}>{body}</Pressable> : body;
}

export const Section = ({ title }: { title: string }) => <Text style={s.section}>{title}</Text>;

/** Two-option segmented control with an animated sliding pill. */
export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  const [w, setW] = useState(0);
  const idx = options.findIndex(([k]) => k === value);
  const v = useRef(new Animated.Value(idx)).current;
  useEffect(() => { Animated.spring(v, { toValue: idx, useNativeDriver: ND, speed: 18, bounciness: 6 }).start(); }, [idx, v]);
  const seg = w / options.length;
  return (
    <View style={s.seg} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[s.segPill, { width: seg, transform: [{ translateX: v.interpolate({ inputRange: [0, Math.max(1, options.length - 1)], outputRange: [0, seg * Math.max(1, options.length - 1)] }) }] }]} />}
      {options.map(([k, l]) => (
        <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: k === value }} style={s.segBtn} onPress={() => onChange(k)}>
          <Text style={[s.segT, k === value && { color: colors.text, fontWeight: '700' }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Full-screen sheet that slides up (native modal animation on mobile, fade on web). */
export function Sheet({ visible, onClose, children, bg = colors.bg }: { visible: boolean; onClose: () => void; children: React.ReactNode; bg?: string }) {
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType={Platform.OS === 'web' ? 'fade' : 'slide'} presentationStyle="fullScreen" transparent={false}>
      <SheetBody bg={bg}>{children}</SheetBody>
    </Modal>
  );
}
function SheetBody({ children, bg }: { children: React.ReactNode; bg: string }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>{children}</View>;
}

export function TopBar({ title, onBack, onClose, right, subtitle }: { title?: string; subtitle?: string; onBack?: () => void; onClose?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.topBar}>
      <View style={{ width: 48 }}>
        {onBack ? <PressScale accessibilityLabel="Back" onPress={onBack} style={s.iconBtn}><Icon name="arrow-left" size={26} color={colors.text} /></PressScale> : null}
        {onClose ? <PressScale accessibilityLabel="Close" onPress={onClose} style={s.iconBtn}><Icon name="close" size={28} color={colors.text} /></PressScale> : null}
      </View>
      <View style={{ flex: 1, alignItems: onBack ? 'flex-start' : 'center' }}>
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

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, marginBottom: 14, ...shadow },
  h: { fontSize: 20, fontWeight: '700', color: colors.heading, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '700', color: colors.heading, marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  btn: { borderRadius: 999, minHeight: 52, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginVertical: 5, flexDirection: 'row' },
  btnP: { backgroundColor: colors.primary },
  btnG: { backgroundColor: colors.primarySoft },
  btnD: { backgroundColor: '#F6E1E1' },
  btnDark: { backgroundColor: colors.today },
  btnT: { fontWeight: '700', fontSize: 17 },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingVertical: 6, paddingLeft: 6, paddingRight: 16, borderRadius: radius.chip },
  chipIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  chipT: { color: colors.text, fontSize: 16 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 84, textAlign: 'center', fontSize: 17, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowT: { fontSize: 17, color: colors.text },
  rowS: { fontSize: 14, color: colors.muted, marginTop: 2 },
  section: { color: colors.heading, fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 4, letterSpacing: 0.3 },
  seg: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: 999, padding: 4, width: 220 },
  segPill: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 999, backgroundColor: '#fff', ...shadow },
  segBtn: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  segT: { color: colors.text, fontSize: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, minHeight: 60 },
  topTitle: { fontSize: 22, fontWeight: '700', color: colors.heading },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});

export const fadeEasing = Easing.out(Easing.cubic);
