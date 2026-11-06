import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Platform, StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, randomBytes, utf8ToBytes } from '@noble/hashes/utils';
import { create } from 'zustand';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressScale } from './anim';
import { Icon } from './icons';
import { secure } from './secure';
import { useStore } from './store';
import { Text } from './text';
import { colors, scheme, themed } from './theme';
import { t } from './i18n';

/**
 * App lock (PIN, optionally Face ID / fingerprint), a privacy cover in the app switcher, and screenshot blocking.
 *
 * - The PIN is never stored: only a salted PBKDF2-SHA256 hash, in the Keychain/Keystore.
 * - The lock engages on launch and when you come back after the chosen delay.
 * - While the app is in the background a plain cover hides your data from the app-switcher preview.
 * - Screenshot blocking uses the OS secure flag (Android: also blanks the recents thumbnail;
 *   iOS: blanks screen recordings and mirroring).
 */
const PIN_KEY = 'avelune.lock.pin.v1';
export const PIN_LENGTH = 4;
const MAX_TRIES = 5;

interface LockRuntime { locked: boolean; covered: boolean; set: (p: Partial<LockRuntime>) => void }
export const useLock = create<LockRuntime>((set) => ({ locked: false, covered: false, set: (p) => set(p) }));

const hash = (pin: string, saltHex: string) => bytesToHex(pbkdf2(sha256, utf8ToBytes(pin), utf8ToBytes(saltHex), { c: 30000, dkLen: 32 }));

export async function setPin(pin: string) {
  const salt = bytesToHex(randomBytes(16));
  await secure.set(PIN_KEY, JSON.stringify({ salt, hash: hash(pin, salt) }));
}
export async function hasPin() { return !!(await secure.get(PIN_KEY)); }
export async function clearPin() { await secure.del(PIN_KEY); }
async function checkPin(pin: string) {
  const raw = await secure.get(PIN_KEY);
  if (!raw) return false;
  const { salt, hash: h } = JSON.parse(raw) as { salt: string; hash: string };
  return hash(pin, salt) === h;
}

export async function biometricsAvailable(): Promise<{ ok: boolean; label: string }> {
  if (Platform.OS === 'web') return { ok: false, label: t('Biometrics') };
  try {
    const [hw, enrolled, types] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    return { ok: hw && enrolled, label: Platform.OS === 'ios' ? (face ? 'Face ID' : 'Touch ID') : face ? t('face unlock') : t('fingerprint') };
  } catch { return { ok: false, label: t('Biometrics') }; }
}

/** Mount once at the root: wires launch/resume locking, the app-switcher cover and screenshot blocking. */
export function useAppLock(hydrated: boolean) {
  const sec = useStore((s) => s.security);
  const set = useLock((s) => s.set);
  const hiddenAt = useRef<number | null>(null);
  const first = useRef(true);
  // Lock on launch, once the saved settings have loaded.
  useEffect(() => {
    if (hydrated && first.current) { first.current = false; if (sec.lock) set({ locked: true }); }
  }, [hydrated, sec.lock, set]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const s = useStore.getState().security;
      if (st === 'active') {
        const away = hiddenAt.current != null ? (Date.now() - hiddenAt.current) / 1000 : 0;
        hiddenAt.current = null;
        set({ covered: false, ...(s.lock && away >= s.lockAfter ? { locked: true } : {}) });
      } else {
        if (hiddenAt.current == null) hiddenAt.current = Date.now();
        if (s.lock || s.blockScreenshots) set({ covered: true });
      }
    });
    return () => sub.remove();
  }, [set]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (sec.blockScreenshots) void ScreenCapture.preventScreenCaptureAsync('avelune').catch(() => undefined);
    else void ScreenCapture.allowScreenCaptureAsync('avelune').catch(() => undefined);
  }, [sec.blockScreenshots]);
}

/** Full-screen lock or privacy cover; renders nothing when unlocked and visible. */
export function LockLayer() {
  const { locked, covered } = useLock();
  if (locked) return <LockScreen />;
  if (covered) return <Cover />;
  return null;
}

function Cover() {
  return (
    <View style={[StyleSheet.absoluteFill, l.cover]} pointerEvents="none">
      <Image source={require('../assets/symbol.png')} style={{ width: 72, height: 74, tintColor: scheme === 'dark' ? colors.primary : undefined }} resizeMode="contain" />
    </View>
  );
}

function LockScreen() {
  const insets = useSafeAreaInsets();
  const sec = useStore((s) => s.security);
  const set = useLock((s) => s.set);
  const [pin, setPinText] = useState('');
  const [msg, setMsg] = useState('');
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [bio, setBio] = useState<{ ok: boolean; label: string }>({ ok: false, label: '' });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const tryBio = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('Unlock Avelune'), cancelLabel: t('Use PIN'), disableDeviceFallback: true }).catch(() => null);
    if (r?.success) set({ locked: false });
  }, [set]);
  useEffect(() => {
    void biometricsAvailable().then((b) => {
      setBio(b);
      if (b.ok && sec.biometrics && AppState.currentState === 'active') void tryBio();
    });
  }, [sec.biometrics, tryBio]);

  const press = async (d: string) => {
    if (now < waitUntil) return;
    const next = (pin + d).slice(0, PIN_LENGTH);
    setPinText(next); setMsg('');
    if (next.length < PIN_LENGTH) return;
    if (await checkPin(next)) { set({ locked: false }); setPinText(''); setTries(0); return; }
    const n = tries + 1;
    setTries(n); setPinText('');
    if (n >= MAX_TRIES) { setWaitUntil(Date.now() + 30000); setTries(0); setMsg(t('Too many tries. Wait 30 seconds.')); }
    else setMsg(t('Wrong PIN. Try again.'));
  };
  const wait = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];
  return (
    <View style={[StyleSheet.absoluteFill, l.lock, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} accessibilityViewIsModal>
      <Image source={require('../assets/symbol.png')} style={{ width: 56, height: 58, tintColor: scheme === 'dark' ? colors.primary : undefined }} resizeMode="contain" />
      <Text style={l.title} accessibilityRole="header">{t('Avelune is locked')}</Text>
      <Text style={l.sub}>{wait ? t('Try again in {n} s', { n: wait }) : t('Enter your PIN')}</Text>
      <View style={l.dots} accessible accessibilityLabel={t('{n} of {total} digits entered', { n: pin.length, total: PIN_LENGTH })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => <View key={i} style={[l.dot, i < pin.length && l.dotOn]} />)}
      </View>
      <Text style={[l.sub, { color: colors.danger, minHeight: 22 }]} accessibilityLiveRegion="polite">{msg}</Text>
      <View style={l.pad}>
        {keys.map((k) => (
          <View key={k} style={l.keyWrap}>
            {k === 'bio' ? (
              bio.ok && sec.biometrics ? (
                <PressScale accessibilityRole="button" accessibilityLabel={t('Unlock with {method}', { method: bio.label })} onPress={() => void tryBio()} style={l.key}><Icon name="fingerprint" size={30} color={colors.heading} /></PressScale>
              ) : null
            ) : k === 'del' ? (
              <PressScale accessibilityRole="button" accessibilityLabel={t('Delete digit')} onPress={() => setPinText(pin.slice(0, -1))} style={l.key}><Icon name="backspace" size={28} color={colors.heading} /></PressScale>
            ) : (
              <PressScale accessibilityRole="button" accessibilityLabel={k} disabled={!!wait} onPress={() => void press(k)} style={[l.key, l.keyNum]}><Text style={l.keyT}>{k}</Text></PressScale>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/** PIN entry used when turning the lock on (enter twice). */
export function PinSetup({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinText] = useState('');
  const [msg, setMsg] = useState('');
  const press = async (d: string) => {
    const next = (pin + d).slice(0, PIN_LENGTH);
    setPinText(next); setMsg('');
    if (next.length < PIN_LENGTH) return;
    if (!first) { setFirst(next); setPinText(''); return; }
    if (next !== first) { setFirst(null); setPinText(''); setMsg(t('The PINs did not match. Start again.')); return; }
    await setPin(next);
    onDone();
  };
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Text style={l.sub}>{first ? t('Enter the same PIN again') : t('Choose a {n}-digit PIN', { n: PIN_LENGTH })}</Text>
      <View style={l.dots}>{Array.from({ length: PIN_LENGTH }, (_, i) => <View key={i} style={[l.dot, i < pin.length && l.dotOn]} />)}</View>
      <Text style={[l.sub, { color: colors.danger, minHeight: 22 }]}>{msg}</Text>
      <View style={[l.pad, { maxWidth: 300 }]}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'del'].map((k) => (
          <View key={k} style={l.keyWrap}>
            {k === 'x' ? <PressScale accessibilityRole="button" accessibilityLabel={t('Cancel')} onPress={onCancel} style={l.key}><Icon name="close" size={26} color={colors.heading} /></PressScale>
              : k === 'del' ? <PressScale accessibilityRole="button" accessibilityLabel={t('Delete digit')} onPress={() => setPinText(pin.slice(0, -1))} style={l.key}><Icon name="backspace" size={26} color={colors.heading} /></PressScale>
                : <PressScale accessibilityRole="button" accessibilityLabel={k} onPress={() => void press(k)} style={[l.key, l.keyNum]}><Text style={l.keyT}>{k}</Text></PressScale>}
          </View>
        ))}
      </View>
    </View>
  );
}

const l = themed(() => StyleSheet.create({
  cover: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 1000, elevation: 1000 },
  lock: { backgroundColor: colors.bg, alignItems: 'center', zIndex: 1000, elevation: 1000, paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700', color: colors.heading, marginTop: 18 },
  sub: { fontSize: 16, color: colors.text, marginTop: 8, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 16, marginTop: 22, direction: 'ltr' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.heading },
  dotOn: { backgroundColor: colors.heading },
  // Number pads keep 1-2-3 left to right in every language, like the phone's own keypad.
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: 320, marginTop: 12, direction: 'ltr' },
  keyWrap: { width: '33.33%', alignItems: 'center', paddingVertical: 8 },
  key: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  keyNum: { backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border },
  keyT: { fontSize: 28, color: colors.heading, fontWeight: '500' },
}));
