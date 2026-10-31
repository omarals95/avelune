import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLoop } from './anim';
import { brand, phase } from './theme';

/**
 * Abstract growth mark for pregnancy weeks (replaces emoji): a seed that grows with the week,
 * cradled by two petals in the Avelune plum/rose. Decorative; the week and size are always also in text.
 */
export function GrowthMark({ week, size = 120, animate = true }: { week: number; size?: number; animate?: boolean }) {
  const t = Math.max(0, Math.min(1, (week - 4) / 36));
  const r = 6 + t * 30;
  const pulse = useLoop(1800);
  const scale = animate ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) : 1;
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50 92 C 18 88, 8 60, 22 38 C 28 56, 40 66, 50 70 Z" fill={brand.deepPlum} opacity={0.9} />
        <Path d="M50 92 C 82 88, 92 60, 78 38 C 72 56, 60 66, 50 70 Z" fill={brand.dustyRose} />
        <Circle cx={50} cy={58 - r * 0.55} r={r + 6} fill={phase.pregnancy.soft} opacity={0.9} />
        <Circle cx={50} cy={58 - r * 0.55} r={r} fill={phase.pregnancy.accent} />
        <Circle cx={50 - r * 0.35} cy={58 - r * 0.9} r={Math.max(1.5, r * 0.22)} fill="#fff" opacity={0.45} />
      </Svg>
    </Animated.View>
  );
}
