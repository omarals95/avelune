import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../text';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { buildSnapshot, encodeInvite, snapshotKind, today as todayFn, type PartnerSnapshot } from '@cyclo/core';
import { FadeIn, PressScale, useLoop } from '../anim';
import { labelOf } from '../catalog';
import { MoodBackground, StatusCircle, WeekStrip, ago, fmtDay, statusFor, useNow } from '../components';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { colors, shadow } from '../theme';
import { Btn, Card, Muted, Row, Sheet } from '../ui';
import { CalendarView } from './Calendar';
import { Avatar } from './Today';

/** Abstract two-circle mark (original artwork) that gently pulses together. */
function Together() {
  const v = useLoop(2400);
  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] }) }] }}>
        <Svg width={180} height={120} viewBox="0 0 180 120">
          <Circle cx={70} cy={60} r={46} fill={colors.primary} opacity={0.92} />
          <Circle cx={110} cy={60} r={46} fill={colors.accent} opacity={0.85} />
          <Path d="M90 74 C 78 64, 80 50, 90 54 C 100 50, 102 64, 90 74 Z" fill="#fff" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const ERR: Record<string, string> = {
  needs_server: 'Partner sharing goes through your own Avelune server. Set up sync first (Settings → Sync & encryption).',
  share_revoked: 'This share was turned off by its owner.',
  bad_invite: 'That invite code is not valid. Ask for a new one.',
  offline: 'Could not reach the server. Check your connection.',
};

export function PartnerTab() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const share = useStore((s) => s.share);
  const server = useStore((s) => s.server);
  const st = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const now = useNow();
  const code = share && server ? encodeInvite({ url: server.url, id: share.id, key: share.key }) : '';

  const link = async () => {
    setBusy(true); setMsg('');
    try { await st.startShare(); } catch (e) { setMsg(ERR[(e as Error).message] ?? `Could not create the link (${(e as Error).message}).`); }
    setBusy(false);
  };
  const copy = async () => { await Clipboard.setStringAsync(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const send = () => (Platform.OS === 'web' ? copy() : Share.share({ message: `Open Avelune, choose "My partner shared their cycle", and paste this code:\n\n${code}` }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 220, maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Avatar onPress={() => nav.openSettings()} />
          <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', marginLeft: 14, color: colors.heading }}>Partner</Text>
        </View>

        {!share ? (
          <>
            <FadeIn style={[pt.hero]}>
              <Together />
              <Text style={pt.heroT}>Keep your partner in the loop</Text>
              <Text style={pt.heroS}>Share a private, view-only version of your cycle. Only the two of you can read it.</Text>
            </FadeIn>
            <Text style={pt.section}>What your partner sees</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {[
                { t: 'Your daily cycle', s: 'Cycle day and phase predictions, view-only.', c: colors.ovulationSoft },
                { t: 'Your fertile days', s: 'Fertile window and estimated ovulation.', c: colors.fertileSoft },
                { t: 'Your next period', s: 'When it is expected, and if it is late.', c: colors.periodSoft },
                { t: 'How you feel', s: 'Optional: today’s mood and symptoms.', c: '#FFEBD5' },
              ].map((x, i) => (
                <FadeIn key={x.t} delay={i * 80} style={[pt.feature, { backgroundColor: x.c }]}>
                  <Text style={pt.featureT}>{x.t}</Text>
                  <Text style={pt.featureS}>{x.s}</Text>
                </FadeIn>
              ))}
            </ScrollView>
            <Card style={{ marginTop: 18 }}>
              <Row icon="shield-lock-outline" title="End-to-end encrypted" subtitle="Your server stores only ciphertext. The invite code holds the key." />
              <Row icon="eye-outline" title="Never your notes or sex logs" subtitle="Your partner sees predictions, plus mood and symptoms only if you allow it." />
              <Row icon="link-variant-off" title="Revoke any time" subtitle="Turning sharing off stops your partner's view immediately." />
            </Card>
            {!server && <Muted style={{ marginTop: 4 }}>{ERR.needs_server}</Muted>}
            {msg ? <Muted style={{ color: colors.danger, marginTop: 8 }}>{msg}</Muted> : null}
          </>
        ) : (
          <>
            <FadeIn style={pt.hero}>
              <Together />
              <Text style={pt.heroT}>Sharing is on</Text>
              <Text style={pt.heroS}>{share.publishedAt ? `Updated ${ago(share.publishedAt, now)}` : 'Not published yet'}{share.error ? ` · error: ${share.error}` : ''}</Text>
            </FadeIn>
            <Card>
              <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 8, color: colors.text }}>Invite code</Text>
              <Muted>Send this to your partner. They open Avelune, choose “My partner shared their cycle”, and paste it.</Muted>
              <Text selectable style={pt.code} numberOfLines={3}>{code}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn style={{ flex: 1 }} kind="ghost" icon={copied ? 'check' : 'content-copy'} title={copied ? 'Copied' : 'Copy'} onPress={() => void copy()} />
                {Platform.OS !== 'web' && <Btn style={{ flex: 1 }} kind="ghost" icon="share-variant" title="Send" onPress={() => void send()} />}
              </View>
            </Card>
            <Card>
              <Row title="Share today's mood & symptoms" subtitle="Off by default" value={share.includeLog} onValueChange={(v) => st.setShareIncludeLog(v)} />
              <Row title="Preview what your partner sees" onPress={() => { void st.publishShare(); setPreview(true); }} />
              <Row title="Stop sharing" danger onPress={() => void st.stopShare()} />
            </Card>
          </>
        )}
      </ScrollView>
      {!share && (
        <View style={[pt.bottom, { paddingBottom: 16 }]}>
          <Btn title={busy ? 'Linking…' : 'Link your partner'} onPress={() => void link()} disabled={busy || !server} />
        </View>
      )}
      <Sheet visible={preview} onClose={() => setPreview(false)}>
        <PreviewOwn onClose={() => setPreview(false)} />
      </Sheet>
    </View>
  );
}

function PreviewOwn({ onClose }: { onClose: () => void }) {
  const records = useStore((s) => s.records);
  const name = useStore((s) => s.name);
  const share = useStore((s) => s.share);
  const snap = useMemo(() => buildSnapshot(selectLogs(records), selectSettings(records), todayFn(), { name, includeLog: share?.includeLog }), [records, name, share?.includeLog]);
  return <PartnerView snapshot={snap} onClose={onClose} preview />;
}

/** The read-only screen a partner sees. Used both on the partner's device and as the owner's preview. */
export function PartnerView({ snapshot, onClose, preview, onRefresh, fetchedAt, error, onLeave }: {
  snapshot: PartnerSnapshot; onClose?: () => void; preview?: boolean; onRefresh?: () => void; fetchedAt?: number | null; error?: string | null; onLeave?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const today = todayFn();
  const [selected, setSelected] = useState(today);
  const [cal, setCal] = useState(false);
  const now = useNow();
  const s = snapshot;
  const daysUntil = s.nextPeriodStart && s.today !== today && s.daysUntilPeriod != null ? s.daysUntilPeriod - Math.round((Date.parse(today) - Date.parse(s.today)) / 86400000) : s.daysUntilPeriod;
  const kind = snapshotKind(s, selected);
  const status = statusFor({
    hasData: !!s.nextPeriodStart, today, date: selected, kind, cycleDay: s.cycleDay != null ? s.cycleDay + Math.round((Date.parse(selected) - Date.parse(s.today)) / 86400000) : null,
    phase: s.phase, daysUntilPeriod: daysUntil, fertileWindow: s.fertileWindow, ovulationDate: s.ovulationDate, inPeriod: snapshotKind(s, today) === 'period' && selected === today,
  });
  const who = s.name || 'Your partner';
  return (
    <View style={{ flex: 1 }}>
      <MoodBackground mood={s.pregnancy ? 'pregnancy' : status.mood} />
      <ScrollView contentContainerStyle={{ paddingTop: (preview ? 0 : insets.top) + 8, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <View style={pt.head}>
          {onClose ? <PressScale accessibilityLabel="Close" onPress={onClose} style={{ padding: 8 }}><Icon name="close" size={28} color={colors.text} /></PressScale> : <View style={{ width: 44 }} />}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{who}'s cycle</Text>
            <Text style={{ color: colors.muted }}>{preview ? 'Preview · view only' : fetchedAt ? `Updated ${ago(fetchedAt, now)}` : 'View only'}</Text>
          </View>
          <PressScale accessibilityLabel="Open calendar" onPress={() => setCal(true)} style={{ padding: 8 }}><Icon name="calendar-month-outline" size={30} color={colors.text} /></PressScale>
        </View>
        <WeekStrip today={today} selected={selected} onSelect={setSelected} kindOf={(d) => snapshotKind(s, d)} />
        {s.pregnancy ? (
          <StatusCircle status={{ mood: 'pregnancy', kicker: `Week ${s.pregnancy.week}`, big: `Day ${s.pregnancy.day + 1}`, sub: `Due ${fmtDay(s.pregnancy.dueDate)}` }} ring={(s.pregnancy.week * 7 + s.pregnancy.day) / 280} />
        ) : <StatusCircle status={status} />}
        {(s.todayMoods?.length || s.todaySymptoms?.length) && s.today === today ? (
          <FadeIn style={[pt.feel]}>
            <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 8, color: colors.text }}>How {who} feels today</Text>
            <Text style={{ fontSize: 16, color: colors.text }}>{[...(s.todayMoods ?? []), ...(s.todaySymptoms ?? [])].map(labelOf).join(' · ')}</Text>
          </FadeIn>
        ) : null}
        {error ? <Muted style={{ textAlign: 'center', color: colors.danger, marginTop: 10 }}>{ERR[error] ?? error}</Muted> : null}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          {onRefresh && <Btn kind="ghost" icon="refresh" title="Refresh" onPress={onRefresh} />}
          {onLeave && <Btn kind="ghost" icon="logout" title="Stop viewing" onPress={onLeave} />}
        </View>
      </ScrollView>
      <Sheet visible={cal} onClose={() => setCal(false)} bg="#fff">
        <CalendarView readOnly title={`${who}'s calendar`} onClose={() => setCal(false)} kindOf={(d) => snapshotKind(s, d)} />
      </Sheet>
    </View>
  );
}

/** Root used when this device is set up only to view a partner's cycle. */
export function PartnerRoot() {
  const partner = useStore((s) => s.partner)!;
  const refresh = useStore((s) => s.refreshPartner);
  const leave = useStore((s) => s.leavePartner);
  useEffect(() => { void refresh(); const t = setInterval(() => void refresh(), 60000); return () => clearInterval(t); }, [refresh]);
  if (!partner.snapshot) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Muted>{partner.error ? ERR[partner.error] ?? partner.error : 'Loading…'}</Muted><Btn kind="ghost" title="Stop viewing" onPress={leave} /></View>;
  return <PartnerView snapshot={partner.snapshot} fetchedAt={partner.fetchedAt} error={partner.error} onRefresh={() => void refresh()} onLeave={leave} />;
}

export function JoinPartner({ onCancel }: { onCancel: () => void }) {
  const join = useStore((s) => s.joinAsPartner);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const go = async () => {
    setBusy(true); setMsg('');
    try { await join(code); } catch (e) { setMsg(ERR[(e as Error).message] ?? ERR.bad_invite); }
    setBusy(false);
  };
  return (
    <Card>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 6, color: colors.text }}>Paste your partner's invite code</Text>
      <Muted>They can find it in Avelune under Partner → Link your partner.</Muted>
      <TextInput accessibilityLabel="Invite code" value={code} onChangeText={setCode} multiline autoCapitalize="none" autoCorrect={false}
        placeholder="avelune-partner:…" placeholderTextColor={colors.faint} style={pt.codeIn} />
      {msg ? <Muted style={{ color: colors.danger }}>{msg}</Muted> : null}
      <Btn title={busy ? 'Connecting…' : 'Connect'} onPress={() => void go()} disabled={busy || !code.trim()} />
      <Btn kind="ghost" title="Back" onPress={onCancel} />
    </Card>
  );
}

const pt = StyleSheet.create({
  hero: { backgroundColor: '#fff', borderRadius: 26, padding: 22, alignItems: 'center', ...shadow },
  heroT: { fontSize: 26, fontWeight: '700', color: colors.heading, textAlign: 'center', marginTop: 6 },
  heroS: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  section: { fontSize: 22, fontWeight: '700', color: colors.heading, marginTop: 24, marginBottom: 12 },
  feature: { width: 250, minHeight: 150, borderRadius: 24, padding: 20, marginRight: 12, justifyContent: 'center' },
  featureT: { fontSize: 21, fontWeight: '700', color: colors.heading, textAlign: 'center', marginBottom: 8 },
  featureS: { fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 22 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 96, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(252,248,245,0.96)' },
  code: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, color: colors.text, backgroundColor: colors.bg, padding: 12, borderRadius: 12, marginVertical: 12 },
  codeIn: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 14, marginVertical: 12, textAlignVertical: 'top', color: colors.text, backgroundColor: '#fff' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 12 },
  feel: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 16, marginHorizontal: 20, marginTop: 8 },
});
