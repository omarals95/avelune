import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Reanimated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from './anim';
import { NavContext, type Nav } from './nav';
import { colors } from './theme';

/**
 * Full-screen sheets rendered inside the app's own window (not an Android Modal/Dialog window).
 * A separate Modal window on Android 15 edge-to-edge did not receive scroll gestures until it was
 * tapped once and flipped the system navigation bar to black, so sheets are drawn by a root-level
 * outlet instead. `<Sheet>` only registers its content; `<SheetOutlet>` draws it above everything.
 */
interface Entry { id: string; visible: boolean; node: React.ReactNode; onClose: () => void; bg?: string; nav: Nav | null; seq: number }

const entries = new Map<string, Entry>();
const subs = new Set<() => void>();
let seq = 0;
let nextId = 0;
const emit = () => subs.forEach((f) => f());
const drop = (id: string) => { const e = entries.get(id); if (e && !e.visible) { entries.delete(id); emit(); } };

export function Sheet({ visible, onClose, children, bg }: { visible: boolean; onClose: () => void; children: React.ReactNode; bg?: string }) {
  const id = useRef(`s${nextId++}`).current;
  const nav = useContext(NavContext);
  useLayoutEffect(() => {
    const prev = entries.get(id);
    if (!visible && !prev) return;
    entries.set(id, {
      id, visible, onClose, bg, nav,
      node: visible ? children : prev?.node ?? null,
      seq: visible && !prev?.visible ? ++seq : prev?.seq ?? ++seq,
    });
    emit();
  });
  useEffect(() => () => { entries.delete(id); emit(); }, [id]);
  return null;
}

/** Draws every open sheet, newest on top. Mount once at the app root. */
export function SheetOutlet() {
  const [, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const list = [...entries.values()].sort((a, b) => a.seq - b.seq);
  if (!list.length) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {list.map((e) => <Layer key={e.id} e={e} />)}
    </View>
  );
}

/** Android 15 edge-to-edge no longer resizes the window for the keyboard, so sheets pad themselves. */
function useKeyboardInset() {
  const [h, setH] = useState(0);
  useEffect(() => {
    // Older Android versions still resize the window themselves; padding there would double up.
    if (Platform.OS !== 'android' || (Platform.Version as number) < 35) return;
    const show = Keyboard.addListener('keyboardDidShow', (ev) => setH(ev.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return h;
}

function Layer({ e }: { e: Entry }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardInset();
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const y = useSharedValue(reduce ? 0 : height);
  const close = useRef(e.onClose);
  close.current = e.onClose;
  const last = useRef<React.ReactNode>(e.node);
  if (e.visible && e.node) last.current = e.node;

  useEffect(() => {
    if (e.visible) {
      y.value = reduce ? 0 : withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else if (reduce) {
      drop(e.id);
    } else {
      y.value = withTiming(height, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => { if (done) runOnJS(drop)(e.id); });
    }
  }, [e.visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!e.visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close.current(); return true; });
    return () => sub.remove();
  }, [e.visible]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Reanimated.View pointerEvents={e.visible ? 'auto' : 'none'} accessibilityViewIsModal={e.visible}
      style={[StyleSheet.absoluteFill, { backgroundColor: e.bg ?? colors.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, kb) }, style]}>
      <NavContext.Provider value={e.nav}>{last.current}</NavContext.Provider>
    </Reanimated.View>
  );
}
