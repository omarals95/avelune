import React, { forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { font } from './theme';

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

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const fam = familyFor(style);
  return <RNText ref={ref} maxFontSizeMultiplier={1.6} {...rest} style={fam ? [style, { fontFamily: fam, fontWeight: 'normal' }] : style} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={1.6} {...rest} style={[{ fontFamily: font.body, minWidth: 0 }, style]} />;
});
