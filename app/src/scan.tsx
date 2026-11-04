import React, { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text } from './text';
import { colors } from './theme';
import { Btn, Muted } from './ui';

export const scanSupported = Platform.OS !== 'web';

/** Camera QR scanner. Calls `onCode` once with the first QR content it reads. */
export function QRScanner({ onCode, onCancel }: { onCode: (text: string) => void; onCancel: () => void }) {
  const [perm, request] = useCameraPermissions();
  const done = useRef(false);
  const [err, setErr] = useState('');
  if (!perm) return null;
  if (!perm.granted) {
    return (
      <View style={{ paddingVertical: 8 }}>
        <Muted style={{ color: colors.text }}>Avelune needs the camera only to read your partner’s QR code. Nothing is recorded or saved.</Muted>
        {perm.canAskAgain ? <Btn icon="scan" title="Allow camera" onPress={() => void request()} style={{ marginTop: 8 }} /> : <Muted style={{ marginTop: 8, color: colors.danger }}>Camera access is off for Avelune. Turn it on in your phone settings, or paste the code instead.</Muted>}
        <Btn kind="ghost" title="Cancel" onPress={onCancel} />
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 280, height: 280, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(r) => {
            if (done.current || !r.data) return;
            if (!/avelune-partner:|cyclo-partner:|avelune:\/\/partner/.test(r.data)) { setErr('That QR code is not an Avelune invite.'); return; }
            done.current = true;
            onCode(r.data);
          }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 40, top: 40, right: 40, bottom: 40, borderRadius: 18, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' }} />
      </View>
      <Text style={{ fontSize: 15, color: colors.text, marginTop: 10, textAlign: 'center' }}>Point the camera at the QR code on your partner’s phone.</Text>
      {err ? <Muted style={{ color: colors.danger, marginTop: 4 }}>{err}</Muted> : null}
      <Btn kind="ghost" title="Cancel" onPress={onCancel} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
