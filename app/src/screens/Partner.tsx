import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Image, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../text';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { DEFAULT_SHARE_ITEMS, addDays, pregnancyView, buildSnapshot, cycleDayOf, decodeInvite, encodeInvite, inviteLink, predict, snapshotKind, today as todayFn, type PartnerSnapshot, type Phase, type ShareItems } from '@cyclo/core';
import { FadeIn, PressScale, useLoop } from '../anim';
import { labelOf } from '../catalog';
import { WeekStrip, ago, fmtDay, statusFor, useNow } from '../components';
import { BloomCircle } from '../bloom';
import { Icon } from '../icons';
import { useNav } from '../nav';
import { selectLogs, selectSettings, useStore } from '../store';
import { bloomFor, colors, flowers, shadow, themed } from '../theme';
import { Btn, Card, Field, Muted, Row, Sheet } from '../ui';
import { CalendarView } from './Calendar';
import { QR } from '../qr';
import { PregnancyCaption, PregnancyIllustration } from '../pregnancyArt';
import { QRScanner, scanSupported } from '../scan';
import { TabHeader, centre } from './Today';
import { CornerBloom } from './Insights';

/** Two blooms leaning together, gently breathing. */
function Together() {
  const v = useLoop(2600);
  return (
    <View style={{ alignItems: 'center', marginVertical: 6, height: 150, justifyContent: 'center' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }] }}>
        <Image source={flowers.menstrual} style={{ width: 130, height: 130, marginRight: -26, transform: [{ rotate: '-12deg' }] }} resizeMode="contain" />
        <Image source={flowers.ovulation} style={{ width: 130, height: 130, transform: [{ rotate: '14deg' }] }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const SHARE_ROWS: [keyof ShareItems, string, string][] = [
  ['period', 'Period dates', 'Logged and expected periods'],
  ['fertile', 'Fertile window', 'Fertile days and estimated ovulation'],
  ['phase', 'Cycle day and phase', 'For example “day 12, follicular”'],
  ['pregnancy', 'Pregnancy week', 'Only while pregnancy mode is on'],
  ['moods', 'Today’s mood', 'What you log today'],
  ['symptoms', 'Today’s symptoms', 'What you log today'],
  ['tips', 'Support tips', 'Gentle ideas for each phase'],
];

/** Supportive ideas a partner sees for each phase (general, not medical advice). */
const SUPPORT: Record<Phase, { title: string; tips: string[] }> = {
  menstrual: { title: 'Ways to help during a period', tips: ['Offer warmth: a hot-water bottle or a warm drink.', 'Take a chore off the list without being asked.', 'Plan something cosy and low-key.'] },
  follicular: { title: 'Energy often rises now', tips: ['A good time to plan something active or new together.', 'Ask what they would like to do this week.'] },
  ovulation: { title: 'Around ovulation', tips: ['Many people feel more social and confident now.', 'If you are trying for a baby (or avoiding one), these are the key days.'] },
  luteal: { title: 'Before a period', tips: ['Energy can dip and patience run shorter: give a little extra slack.', 'Keep snacks, sleep and quiet time easy to come by.', 'Check in kindly rather than guessing.'] },
};

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
  const [showQR, setShowQR] = useState(false);
  const now = useNow();
  const code = share && server ? encodeInvite({ url: server.url, id: share.id, key: share.key }) : '';

  const link = async () => {
    setBusy(true); setMsg('');
    try { await st.startShare(); } catch (e) { setMsg(ERR[(e as Error).message] ?? `Could not create the link (${(e as Error).message}).`); }
    setBusy(false);
  };
  const copy = async () => { await Clipboard.setStringAsync(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const send = () => (Platform.OS === 'web' ? copy() : Share.share({ message: `Open Avelune, choose "My partner shared their cycle", and paste this code:\n\n${code}` }));

  const logs = useMemo(() => selectLogs(st.records), [st.records]);
  const settings = selectSettings(st.records);
  const p = useMemo(() => predict(logs, settings, todayFn()), [logs, settings]);
  const cd = cycleDayOf(todayFn(), logs);
  const next = p.daysUntilPeriod == null ? '—' : p.lateBy && !p.lateDismissed ? 'not started yet' : p.daysUntilPeriod <= 0 ? 'any day now' : `in ${p.daysUntilPeriod} day${p.daysUntilPeriod === 1 ? '' : 's'}`;
  const who = st.partnerName?.trim() || 'Your partner';
  const items: ShareItems = { ...DEFAULT_SHARE_ITEMS, ...(share?.includeLog ? { moods: true, symptoms: true } : {}), ...share?.items };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <CornerBloom top={insets.top} bloom="follicular" />
        <TabHeader title="Partner" onAvatar={() => nav.openSettings()} />
        <View style={{ paddingHorizontal: 16 }}>
        {!share ? (
          <>
            <FadeIn style={pt.hero}>
              <Together />
              <Text style={pt.heroT}>Keep your partner in the loop</Text>
              <Text style={pt.heroS}>Share a private, view-only version of your cycle. Only the two of you can read it.</Text>
            </FadeIn>
            <Text style={pt.section}>What your partner sees</Text>
            {[
              { t: 'Your daily cycle', s: 'Cycle day and phase predictions, view-only.', c: colors.ovulation, i: 'chart-donut' as const },
              { t: 'Your fertile days', s: 'Fertile window and estimated ovulation.', c: colors.fertile, i: 'sprout' as const },
              { t: 'Your next period', s: 'When it is expected, and if it is late.', c: colors.period, i: 'water-outline' as const },
              { t: 'How you feel', s: 'Optional: today’s mood and symptoms.', c: colors.pregnancy, i: 'emoticon-outline' as const },
            ].map((x, i) => (
              <FadeIn key={x.t} delay={i * 70} style={pt.feature}>
                <View style={[pt.featureDisc, { borderColor: x.c }]}><Icon name={x.i} size={22} color={x.c} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={pt.featureT}>{x.t}</Text>
                  <Text style={pt.featureS}>{x.s}</Text>
                </View>
              </FadeIn>
            ))}
            <Card style={{ marginTop: 6 }}>
              <Row icon="shield-lock-outline" title="End-to-end encrypted" subtitle="Your server stores only ciphertext. The invite code holds the key." />
              <Row icon="eye-outline" title="Never your notes or sex logs" subtitle="Your partner sees predictions, plus mood and symptoms only if you allow it." />
              <Row icon="link-variant-off" title="Revoke any time" subtitle="Turning sharing off stops your partner's view immediately." />
            </Card>
            {msg ? <Muted style={{ color: colors.danger, marginTop: 8 }}>{msg}</Muted> : null}
            {server ? (
              <Btn title={busy ? 'Linking…' : 'Link your partner'} icon="link-variant" onPress={() => void link()} disabled={busy} style={{ marginTop: 8 }} />
            ) : (
              <Card style={{ marginTop: 8, backgroundColor: colors.primarySoft }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.heading }}>One step first</Text>
                <Text style={{ fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 21 }}>Partner sharing travels through your own encrypted Avelune server. Set up sync, then come back to link your partner.</Text>
                <Btn icon="cloud-lock-outline" title="Set up sync" onPress={() => nav.openSettings('sync')} style={{ marginTop: 10 }} />
              </Card>
            )}
          </>
        ) : (
          <>
            <FadeIn style={pt.paired}>
              <View style={pt.pAvatar}>
                {st.partnerName?.trim() ? <Text style={pt.pInitial}>{st.partnerName.trim()[0].toUpperCase()}</Text> : <Icon name="users" size={38} weight="light" color={colors.heading} />}
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={pt.pLabel}>Paired with</Text>
                <Text style={pt.pName} numberOfLines={1}>{who}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View style={[pt.dot, share.error ? { backgroundColor: colors.danger } : null]} />
                  <Text style={[pt.pActive, share.error ? { color: colors.danger } : null]}>{share.error ? 'Sync problem' : 'Sharing is active'}</Text>
                </View>
                <Text style={pt.pMeta}>View only · {share.publishedAt ? `updated ${ago(share.publishedAt, now)}` : 'not published yet'}</Text>
              </View>
            </FadeIn>

            <PressScale accessibilityRole="button" accessibilityLabel="Cycle day and predictions" onPress={() => { void st.publishShare(); setPreview(true); }} scaleTo={0.98} style={pt.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={pt.cardT}>Cycle day and predictions</Text>
                <Icon name="chevron-right" size={18} color={colors.muted} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={pt.kLabel}>Cycle day</Text>
                  <Text style={pt.kValue}>{cd ?? '—'}</Text>
                </View>
                <View style={pt.vRule} />
                <View style={{ flex: 1, paddingLeft: 18 }}>
                  <Text style={pt.kLabel}>Next period</Text>
                  <Text style={[pt.kValue, { fontSize: 22, marginTop: 8 }]}>{next}</Text>
                </View>
              </View>
            </PressScale>

            <View style={pt.card}>
              <Text style={pt.cardT}>What {who === 'Your partner' ? 'your partner' : who} sees</Text>
              <Muted style={{ marginTop: 2, marginBottom: 4 }}>Changes update their view right away.</Muted>
              {SHARE_ROWS.map(([k, title, sub]) => (
                <Row key={k} title={title} subtitle={sub} value={items[k]} onValueChange={(v) => st.setShareItems({ [k]: v })} />
              ))}
              <Row icon="lock-outline" title="Notes and sex logs" subtitle="Never shared" />
            </View>
            <View style={pt.card}>
              <Row icon="eye-outline" title="Preview shared view" onPress={() => { void st.publishShare(); setPreview(true); }} />
            </View>

            <View style={pt.card}>
              <Text style={pt.cardT}>Invite code</Text>
              <Muted style={{ marginTop: 4 }}>Send this to your partner. They open Avelune, choose “My partner shared their cycle”, and paste it.</Muted>
              {showQR ? (
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <QR value={inviteLink(decodeInvite(code))} size={240} label="Partner invite QR code" />
                  <Muted style={{ textAlign: 'center', marginTop: 8 }}>Your partner scans this with their phone camera, or in Avelune under “My partner shared their cycle”. Anyone with this code can view your shared cycle, so only show it to them.</Muted>
                </View>
              ) : <Text selectable style={pt.code} numberOfLines={3}>{code}</Text>}
              <Btn kind="ghost" icon="qr" title={showQR ? 'Show code as text' : 'Show QR code'} onPress={() => setShowQR(!showQR)} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn style={{ flex: 1 }} kind="ghost" icon={copied ? 'check' : 'copy'} title={copied ? 'Copied' : 'Copy'} onPress={() => void copy()} />
                {Platform.OS !== 'web' && <Btn style={{ flex: 1 }} kind="ghost" icon="share-variant" title="Send" onPress={() => void send()} />}
              </View>
              <Field label="Partner's name (only on this device)" value={st.partnerName ?? ''} onChangeText={(partnerName) => st.setPrefs({ partnerName })} autoCapitalize="words" placeholder="Optional" />
            </View>

            <Btn kind="danger" icon="cancel" title="Stop sharing" onPress={() => void st.stopShare()} style={{ marginTop: 4 }} />
            <View style={pt.private}>
              <Icon name="lock-outline" size={16} color={colors.muted} />
              <Text style={pt.privateT}>Notes and sex logs stay private.</Text>
            </View>
          </>
        )}
        </View>
      </ScrollView>
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
  const snap = useMemo(() => buildSnapshot(selectLogs(records), selectSettings(records), todayFn(), { name, includeLog: share?.includeLog, items: share?.items }), [records, name, share?.includeLog, share?.items]);
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
  const selCycleDay = s.cycleDay != null ? s.cycleDay + Math.round((Date.parse(selected) - Date.parse(s.today)) / 86400000) : null;
  const status = statusFor({
    hasData: !!s.nextPeriodStart || s.cycleDay != null, today, date: selected, kind, cycleDay: s.cycleDay != null ? s.cycleDay + Math.round((Date.parse(selected) - Date.parse(s.today)) / 86400000) : null,
    phase: s.phase, daysUntilPeriod: daysUntil, fertileWindow: s.fertileWindow, ovulationDate: s.ovulationDate, inPeriod: snapshotKind(s, today) === 'period' && selected === today,
  });
  const who = s.name || 'Your partner';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: (preview ? 0 : insets.top) + 8, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <View style={pt.head}>
          {onClose ? <PressScale accessibilityLabel="Close" onPress={onClose} style={{ padding: 8 }}><Icon name="close" size={28} color={colors.heading} /></PressScale> : <View style={{ width: 44 }} />}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.heading }}>{who}'s cycle</Text>
            <Text style={{ color: colors.muted }}>{preview ? 'Preview · view only' : fetchedAt ? `Updated ${ago(fetchedAt, now)}` : 'View only'}</Text>
          </View>
          <PressScale accessibilityLabel="Open calendar" onPress={() => setCal(true)} style={{ padding: 8 }}><Icon name="calendar-month-outline" size={28} color={colors.heading} /></PressScale>
        </View>
        <WeekStrip today={today} selected={selected} onSelect={setSelected} kindOf={(d) => snapshotKind(s, d)} />
        {s.pregnancy ? (
          (() => {
            // The snapshot carries week/day/due date; rebuild the same view as the owner's Today screen.
            const v = pregnancyView(addDays(s.pregnancy.dueDate, -280), today);
            return v ? <><PregnancyIllustration stage={v.stage} /><PregnancyCaption view={v} /></> : null;
          })()
        ) : (
          <BloomCircle bloom={bloomFor(status.mood)} {...centre(status, selCycleDay, snapshotKind(s, selected) === 'period', selected === today)}
            progress={selCycleDay && daysUntil != null && daysUntil >= 0 ? Math.min(1, selCycleDay / (s.cycleDay! + daysUntil)) : null}
            a11y={`${status.kicker} ${status.big}. ${status.sub}`} />
        )}
        {(s.todayMoods?.length || s.todaySymptoms?.length) && s.today === today ? (
          <FadeIn style={[pt.feel]}>
            <Text style={{ fontWeight: '600', fontSize: 18, marginBottom: 8, color: colors.heading }}>How {who} feels today</Text>
            <Text style={{ fontSize: 16, color: colors.text }}>{[...(s.todayMoods ?? []), ...(s.todaySymptoms ?? [])].map(labelOf).join(' · ')}</Text>
          </FadeIn>
        ) : null}
        {s.items?.tips !== false && s.phase && !s.pregnancy && s.today === today ? (
          <FadeIn style={[pt.feel]}>
            <Text style={{ fontWeight: '600', fontSize: 18, marginBottom: 8, color: colors.heading }}>{SUPPORT[s.phase].title}</Text>
            {SUPPORT[s.phase].tips.map((t, i) => <Text key={i} style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginTop: i ? 4 : 0 }}>• {t}</Text>)}
            <Muted style={{ marginTop: 8 }}>Everyone is different: the best support is to ask what helps.</Muted>
          </FadeIn>
        ) : null}
        {s.items && (!s.items.period || !s.items.fertile) ? (
          <Muted style={{ textAlign: 'center', marginTop: 10, marginHorizontal: 20 }}>{who} has chosen not to share {[!s.items.period && 'period dates', !s.items.fertile && 'the fertile window'].filter(Boolean).join(' or ')}.</Muted>
        ) : null}
        {error ? <Muted style={{ textAlign: 'center', color: colors.danger, marginTop: 10 }}>{ERR[error] ?? error}</Muted> : null}
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          {onRefresh && <Btn kind="ghost" icon="refresh" title="Refresh" onPress={onRefresh} />}
          {onLeave && <Btn kind="ghost" icon="logout" title="Stop viewing" onPress={onLeave} />}
        </View>
      </ScrollView>
      <Sheet visible={cal} onClose={() => setCal(false)}>
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

export function JoinPartner({ onCancel, initialCode }: { onCancel: () => void; initialCode?: string | null }) {
  const join = useStore((s) => s.joinAsPartner);
  const [code, setCode] = useState(initialCode ?? '');
  const [scanning, setScanning] = useState(false);
  const go = async (c = code) => {
    setBusy(true); setMsg('');
    try { await join(c); } catch (e) { setMsg(ERR[(e as Error).message] ?? ERR.bad_invite); }
    setBusy(false);
  };
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  return (
    <Card>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 6, color: colors.text }}>Connect to your partner</Text>
      <Muted>Scan the QR code on their phone (Partner › Show QR code), or paste the invite code they sent you.</Muted>
      {scanSupported ? (scanning
        ? <QRScanner onCancel={() => setScanning(false)} onCode={(c) => { setScanning(false); setCode(c); void go(c); }} />
        : <Btn icon="scan" title="Scan QR code" onPress={() => setScanning(true)} style={{ marginTop: 12 }} />) : null}
      <TextInput accessibilityLabel="Invite code" value={code} onChangeText={setCode} multiline autoCapitalize="none" autoCorrect={false}
        placeholder="avelune-partner:…" placeholderTextColor={colors.faint} style={pt.codeIn} />
      {msg ? <Muted style={{ color: colors.danger }}>{msg}</Muted> : null}
      <Btn kind={scanSupported ? 'ghost' : 'primary'} title={busy ? 'Connecting…' : 'Connect with pasted code'} onPress={() => void go()} disabled={busy || !code.trim()} />
      <Btn kind="ghost" title="Back" onPress={onCancel} />
    </Card>
  );
}

const pt = themed(() => StyleSheet.create({
  hero: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 26, padding: 22, alignItems: 'center', marginTop: 8, ...shadow },
  heroT: { fontSize: 26, fontWeight: '700', color: colors.heading, textAlign: 'center', marginTop: 6 },
  heroS: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  section: { fontSize: 22, fontWeight: '700', color: colors.heading, marginTop: 24, marginBottom: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 16, marginBottom: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  featureDisc: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  featureT: { fontSize: 17, fontWeight: '600', color: colors.heading },
  featureS: { fontSize: 15, color: colors.muted, marginTop: 2, lineHeight: 20 },
  paired: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 26, padding: 18, marginTop: 8, marginBottom: 12, ...shadow },
  pAvatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  pInitial: { fontSize: 36, color: colors.heading, fontWeight: '700' },
  pLabel: { fontSize: 15, color: colors.text },
  pName: { fontSize: 28, fontWeight: '700', color: colors.heading, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, marginRight: 8 },
  pActive: { fontSize: 16, color: colors.success, fontWeight: '600' },
  pMeta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12, ...shadow },
  cardT: { flex: 1, fontSize: 19, fontWeight: '600', color: colors.heading },
  kLabel: { fontSize: 15, color: colors.muted },
  kValue: { fontSize: 34, fontWeight: '600', color: colors.heading, marginTop: 2 },
  vRule: { width: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginVertical: 4 },
  private: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  privateT: { fontSize: 14, color: colors.muted },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 96, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.bg },
  code: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, color: colors.text, backgroundColor: colors.input, padding: 12, borderRadius: 12, marginVertical: 12 },
  codeIn: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 14, marginVertical: 12, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.input },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 12 },
  feel: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, marginHorizontal: 20, marginTop: 8 },
}));
