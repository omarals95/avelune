import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { t } from './i18n';
// The package entry pulls in Node-only renderers; the core encoder is plain JS.
import { create as createQR } from 'qrcode/lib/core/qrcode';

/** QR code drawn with react-native-svg (always dark on white so any camera can read it). */
export function QR({ value, size = 240, label }: { value: string; size?: number; label?: string }) {
  const { n, d } = useMemo(() => {
    const q = createQR(value, { errorCorrectionLevel: 'M' });
    const n = q.modules.size;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.modules.get(x, y)) d += `M${x + 4},${y + 4}h1v1h-1z`;
    return { n: n + 8, d };
  }, [value]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label ?? t('QR code')} style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`}>
        <Rect width={n} height={n} fill="#FFFFFF" />
        <Path d={d} fill="#1B131C" />
      </Svg>
    </View>
  );
}
