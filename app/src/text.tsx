import React, { forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { font } from './theme';
import { rtl } from './i18n';

/**
 * Brand text: maps fontWeight/fontSize onto the loaded font files (custom fonts ignore fontWeight on Android),
 * and caps Dynamic Type scaling so layouts stay intact at the largest accessibility sizes.
 */
function familyFor(style: TextProps['style']) {
  const f = (StyleSheet.flatten(style) ?? {}) as { fontWeight?: string | number; fontSize?: number; fontFamily?: string };
  if (f.fontFamily) return null;
  const w = Number(f.fontWeight === 'bold' ? 700 : f.fontWeight ?? 400);
  const size = f.fontSize ?? 14;
  if (w >= 700 && size >= 20) return font.heading;
  if (w >= 800) return font.black;
  if (w >= 700) return font.bold;
  if (w >= 500) return font.medium;
  return font.body;
}

/**
 * In right-to-left layouts, text with no explicit alignment starts on the right, even when it holds only
 * Latin text such as a brand or a name (the web otherwise aligns those by their own direction).
 */
const startAligned = (style: TextProps['style']) => rtl && !(StyleSheet.flatten(style) as { textAlign?: string } | undefined)?.textAlign;

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const fam = familyFor(style);
  const extra = { ...(fam ? { fontFamily: fam, fontWeight: 'normal' as const } : null), ...(startAligned(style) ? { textAlign: 'right' as const } : null) };
  return <RNText ref={ref} maxFontSizeMultiplier={1.6} {...rest} style={Object.keys(extra).length ? [style, extra] : style} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={1.6} {...rest} style={[{ fontFamily: font.body, minWidth: 0 }, rtl && { textAlign: 'right' }, style]} />;
});
