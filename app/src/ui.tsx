import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, radius } from './theme';

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;
export const Muted = ({ children, style }: { children: React.ReactNode; style?: object }) => <Text style={[s.muted, style]}>{children}</Text>;

export function Btn({ title, onPress, kind = 'primary', disabled }: { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={[s.btn, kind === 'primary' && s.btnP, kind === 'ghost' && s.btnG, kind === 'danger' && s.btnD, disabled && { opacity: 0.5 }]}>
      <Text style={[s.btnT, kind !== 'primary' && { color: kind === 'danger' ? colors.danger : colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipT, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export const Field = (p: TextInputProps & { label: string }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={s.label}>{p.label}</Text>
    <TextInput accessibilityLabel={p.label} placeholderTextColor={colors.muted} autoCapitalize="none" {...p} style={[s.input, p.style]} />
  </View>
);

export function Stepper({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <View style={s.stepRow}>
      <Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{label}</Text>
      <Pressable accessibilityLabel={`Decrease ${label}`} style={s.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}><Text style={s.stepT}>−</Text></Pressable>
      <Text style={{ width: 70, textAlign: 'center', fontSize: 16, color: colors.text }}>{value}{suffix ?? ''}</Text>
      <Pressable accessibilityLabel={`Increase ${label}`} style={s.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}><Text style={s.stepT}>+</Text></Pressable>
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  h: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  btn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', marginVertical: 4 },
  btnP: { backgroundColor: colors.primary },
  btnG: { backgroundColor: colors.primarySoft },
  btnD: { backgroundColor: '#FCE8E6' },
  btnT: { color: '#fff', fontWeight: '600', fontSize: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { color: colors.text, fontSize: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, backgroundColor: '#fff' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 22, color: colors.primary, fontWeight: '700' },
});
