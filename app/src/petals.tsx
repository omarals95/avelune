import React, { useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { scheme } from './theme';
import { rtl } from './i18n';

/**
 * Petal artwork for the light and dark themes (originals in design/petals/).
 * The full-screen corner images are split into a top and a bottom piece so each can be pinned to its corner
 * on any screen shape (phones are taller than the 9:16 artwork, tablets and desktops are wider).
 */
type Piece = { src: ImageSourcePropType; ratio: number; side: 'left' | 'right' };
const CORNERS: Record<'light' | 'dark', { top: Piece; bottom: Piece }> = {
  light: {
    top: { src: require('../assets/petals/corner-light-top.webp'), ratio: 1.6804, side: 'left' },
    bottom: { src: require('../assets/petals/corner-light-bottom.webp'), ratio: 1.3216, side: 'right' },
  },
  dark: {
    top: { src: require('../assets/petals/corner-dark-top.webp'), ratio: 1.1256, side: 'right' },
    bottom: { src: require('../assets/petals/corner-dark-bottom.webp'), ratio: 1.1256, side: 'left' },
  },
};
const CARD: Record<'light' | 'dark', { src: ImageSourcePropType; ratio: number }> = {
  light: { src: require('../assets/petals/card-light.webp'), ratio: 3.5982 },
  dark: { src: require('../assets/petals/card-dark.webp'), ratio: 3.4578 },
};
const themeKey = () => (scheme === 'dark' ? 'dark' : 'light');
/** In right-to-left layouts the artwork is mirrored, so it sits on the opposite side. */
const mirror = () => (rtl ? [{ scaleX: -1 }] : undefined);
const sideOf = (side: 'left' | 'right') => (rtl ? (side === 'left' ? 'right' : 'left') : side);

/**
 * Petals in the screen corners, behind everything else on a tab screen. Fixed in place (they do not scroll)
 * and purely decorative, so screen readers skip them.
 */
export function PetalBackdrop() {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520);
  const { top, bottom } = CORNERS[themeKey()];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="petal-backdrop">
      <Image source={top.src} resizeMode="contain" fadeDuration={0}
        style={{ position: 'absolute', top: 0, [sideOf(top.side)]: 0, width: w, height: w / top.ratio, transform: mirror() }} />
      <Image source={bottom.src} resizeMode="contain" fadeDuration={0}
        style={{ position: 'absolute', bottom: 0, [sideOf(bottom.side)]: 0, width: w, height: w / bottom.ratio, transform: mirror() }} />
    </View>
  );
}

/** Card petals filling a card's height from the end edge (right, or left in RTL). Place it first inside a card with overflow hidden. */
export function CardPetals() {
  const [h, setH] = useState(0);
  const art = CARD[themeKey()];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="card-petals">
      {h > 0 ? <Image source={art.src} resizeMode="contain" fadeDuration={0} style={{ position: 'absolute', [sideOf('right')]: 0, top: 0, height: h, width: h * art.ratio, transform: mirror() }} /> : null}
    </View>
  );
}
