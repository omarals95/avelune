import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  addDays, buildDoctorReport, contraceptionEvents, contraceptionStatus, today as todayFn,
  type CycleProfile, type MedKind, type Medication, type PillPack,
} from '@avelune/core';
import { labelOf } from '../catalog';
import { dayMonth, t, tc, tn } from '../i18n';
import { Icon } from '../icons';
import { PinSetup, biometricsAvailable, clearPin, hasPin } from '../lock';
import { ensurePermission } from '../reminders';
import { selectLogs, selectSettings, useStore } from '../store';
import { Text } from '../text';
import { colors } from '../theme';
import { Btn, Card, Chip, Field, Muted, Page, Row, Segmented, Stepper } from '../ui';

const hhmm = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? t('am') : t('pm')}`;

/** Date picker by day steps (−/+) and month jumps; future dates allowed when `future`. */
function DateStepper({ label, value, onChange, future }: { label: string; value: string; onChange: (d: string) => void; future?: boolean }) {
  const today = todayFn();
  const ok = (v: string) => (future || v <= today ? v : today);
  const months = (m: number) => { const d = new Date(+value.slice(0, 4), +value.slice(5, 7) - 1 + m, +value.slice(8)); onChange(ok(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)); };
  return (
    <View style={{ paddingVertical: 6 }}>
      <Text style={{ fontSize: 15, color: colors.text, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Btn kind="ghost" title={t('−1 mo')} onPress={() => months(-1)} style={{ minHeight: 44, paddingHorizontal: 10, marginVertical: 0 }} />
        <View style={{ flex: 1 }}><Stepper label="" value={0} min={-100000} max={100000} format={() => `${dayMonth(value)} ${value.slice(0, 4)}`} onChange={(n) => onChange(ok(addDays(value, n)))} /></View>
        <Btn kind="ghost" title={t('+1 mo')} onPress={() => months(1)} style={{ minHeight: 44, paddingHorizontal: 10, marginVertical: 0 }} />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ Privacy & security

export function SecuritySettings() {
  const sec = useStore((s) => s.security);
  const setSecurity = useStore((s) => s.setSecurity);
  const [settingPin, setSettingPin] = useState(false);
  const [bio, setBio] = useState<{ ok: boolean; label: string }>({ ok: false, label: '' });
  const [pinSet, setPinSet] = useState(false);
  useEffect(() => { void biometricsAvailable().then(setBio); void hasPin().then(setPinSet); }, []);
  return (
    <Page>
      <Card>
        <Row icon="lock-outline" title={t('App lock')} subtitle={sec.lock ? t('On: PIN needed to open Avelune') : tc('status', 'Off')} value={sec.lock}
          onValueChange={(v) => { if (v) setSettingPin(true); else { setSecurity({ lock: false }); void clearPin(); setPinSet(false); } }} />
        {settingPin ? (
          <PinSetup onCancel={() => setSettingPin(false)} onDone={() => { setSettingPin(false); setPinSet(true); setSecurity({ lock: true }); }} />
        ) : null}
        {sec.lock && pinSet ? (
          <>
            {bio.ok ? <Row icon="fingerprint" title={t('Unlock with {method}', { method: tc('biometric', bio.label) })} value={sec.biometrics} onValueChange={(biometrics) => setSecurity({ biometrics })} /> : null}
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, color: colors.text, marginBottom: 8 }}>{t('Lock again after leaving the app')}</Text>
              <Segmented options={[['0', t('At once')], ['60', t('1 min')], ['300', t('5 min')]]} value={String(sec.lockAfter) as '0' | '60' | '300'} onChange={(v) => setSecurity({ lockAfter: +v })} />
            </View>
            <Btn kind="ghost" title={t('Change PIN')} onPress={() => setSettingPin(true)} />
          </>
        ) : null}
        <Muted style={{ marginTop: 6 }}>{t('Your PIN is never stored, only a protected fingerprint of it in the phone’s secure storage. If you forget it, reinstalling the app removes the lock and your local data, so keep a backup.')}</Muted>
      </Card>
      <Card>
        <Row icon="eye-off-outline" title={t('Block screenshots')} subtitle={Platform.OS === 'web' ? t('Not available in the browser') : sec.blockScreenshots ? tc('status', 'On') : tc('status', 'Off')} value={sec.blockScreenshots} disabled={Platform.OS === 'web'}
          onValueChange={(blockScreenshots) => setSecurity({ blockScreenshots })} />
        <Muted>
          {Platform.OS === 'ios'
            ? t('Hides Avelune from screen recordings and screen mirroring, and covers it in the app switcher. iOS does not let apps fully block screenshots.')
            : t('Stops screenshots and screen recordings of Avelune and blanks its preview in the recent-apps screen.')}
        </Muted>
      </Card>
      <Muted style={{ textAlign: 'center' }}>{t('With either option on, Avelune also shows a plain cover whenever it goes to the background.')}</Muted>
    </Page>
  );
}

// ------------------------------------------------------------------ Contraception & medication

// English labels; translated with t() where shown.
const PACKS: [PillPack, string][] = [['21+7', '21 + 7 break'], ['24+4', '24 + 4'], ['28', '28 every day'], ['continuous', 'No breaks']];
const KINDS: [MedKind, string][] = [['pain', 'Pain relief'], ['hrt', 'HRT'], ['supplement', 'Supplement'], ['fertility', 'Fertility'], ['thyroid', 'Thyroid'], ['other', 'Other']];
const METHOD_NAME: Record<string, string> = {
  none: 'None', 'combined-pill': 'Combined pill', 'mini-pill': 'Mini pill', 'hormonal-iud': 'Hormonal IUD', 'copper-iud': 'Copper IUD',
  implant: 'Implant', ring: 'Ring', patch: 'Patch', injection: 'Injection', barrier: 'Condoms or barrier', fam: 'Fertility awareness',
};

export function MedsSettings({ openProfile }: { openProfile: () => void }) {
  const records = useStore((s) => s.records);
  const updateSettings = useStore((s) => s.updateSettings);
  const settings = selectSettings(records);
  const pr: CycleProfile = settings.profile ?? {};
  const today = todayFn();
  const m = pr.contraception ?? 'none';
  const setPr = (p: Partial<CycleProfile>) => updateSettings({ profile: { ...pr, ...p } });
  const status = contraceptionStatus(pr, today);
  const events = contraceptionEvents(pr, today, 400).slice(0, 4);
  const meds = settings.medications ?? [];
  const [editing, setEditing] = useState<Medication | null>(null);
  const saveMed = (x: Medication) => {
    const list = meds.some((y) => y.id === x.id) ? meds.map((y) => (y.id === x.id ? x : y)) : [...meds, x];
    updateSettings({ medications: list });
    setEditing(null);
  };
  const usesPack = m === 'combined-pill' || m === 'ring' || m === 'patch';
  const usesDate = m === 'injection' || m === 'hormonal-iud' || m === 'copper-iud' || m === 'implant';
  return (
    <Page>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>{t('Contraception')}</Text>
        <Row title={METHOD_NAME[m] ? tc('contraception', METHOD_NAME[m]) : m} subtitle={status ?? t('Change your method in Health profile')} onPress={openProfile} />
        {usesPack ? (
          <>
            {m === 'combined-pill' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {PACKS.map(([k, l]) => <Chip key={k} label={t(l)} on={(pr.pillPack ?? '21+7') === k} onPress={() => setPr({ pillPack: k })} />)}
              </View>
            ) : null}
            <DateStepper label={m === 'combined-pill' ? t('First day of this pack') : m === 'ring' ? t('Day you inserted this ring') : t('Day you applied this cycle’s first patch')}
              value={pr.packStart ?? today} onChange={(packStart) => setPr({ packStart })} />
          </>
        ) : null}
        {usesDate ? <DateStepper label={m === 'injection' ? t('Date of your last injection') : t('Date it was inserted')} value={pr.contraceptionSince ?? today} onChange={(contraceptionSince) => setPr({ contraceptionSince })} /> : null}
        {usesPack || usesDate ? (
          <Row title={t('Contraception reminders')} subtitle={usesPack ? t('New pack, breaks, ring or patch changes') : m === 'injection' ? t('A week before the next injection') : t('Before the replacement date')}
            value={!!pr.contraReminders} onValueChange={(v) => { if (v) void ensurePermission(); setPr({ contraReminders: v }); }} />
        ) : null}
        {events.length ? (
          <View style={{ marginTop: 8 }}>
            {events.map((e) => (
              <View key={e.date + e.kind} style={{ flexDirection: 'row', paddingVertical: 4 }}>
                <Text style={{ width: 92, fontSize: 14, color: colors.heading, fontWeight: '600' }}>{dayMonth(e.date)}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{e.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {m === 'mini-pill' || m === 'combined-pill' ? <Muted style={{ marginTop: 6 }}>{t('For a daily pill reminder, turn on “Pill reminder” in Reminders.')}</Muted> : null}
        {usesDate && m !== 'injection' ? <Muted style={{ marginTop: 6 }}>{t('Replacement dates use typical licensed durations (hormonal IUD 8 years, copper IUD 10, implant 3). Check yours with your clinic.')}</Muted> : null}
      </Card>

      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading, marginBottom: 4 }}>{t('Medication and supplements')}</Text>
        <Muted style={{ marginBottom: 6 }}>{t('Log doses in the daily log. Avelune warns you if you log more than your daily limit.')}</Muted>
        {meds.map((x) => (
          <Row key={x.id} icon="pill" title={`${x.name}${x.dose ? ` · ${x.dose}` : ''}`}
            subtitle={[(() => { const l = KINDS.find((k) => k[0] === x.kind)?.[1]; return l ? tc('medKind', l) : undefined; })(), x.maxPerDay ? t('max {n}/day', { n: x.maxPerDay }) : null, x.reminder ? t('reminder {time}', { time: hhmm(x.reminder.hour, x.reminder.minute) }) : null, x.active ? null : t('paused')].filter(Boolean).join(' · ')}
            onPress={() => setEditing(x)} />
        ))}
        {editing ? <MedForm med={editing} onSave={saveMed} onCancel={() => setEditing(null)} onDelete={meds.some((y) => y.id === editing.id) ? () => { updateSettings({ medications: meds.filter((y) => y.id !== editing.id) }); setEditing(null); } : undefined} />
          : <Btn kind="ghost" icon="plus" title={t('Add medication')} onPress={() => setEditing({ id: `m${Date.now().toString(36)}`, name: '', kind: 'pain', active: true })} style={{ marginTop: 8 }} />}
      </Card>
    </Page>
  );
}

function MedForm({ med, onSave, onCancel, onDelete }: { med: Medication; onSave: (m: Medication) => void; onCancel: () => void; onDelete?: () => void }) {
  const [m, setM] = useState<Medication>(med);
  const set = (p: Partial<Medication>) => setM((x) => ({ ...x, ...p }));
  return (
    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Field label={t('Name')} value={m.name} onChangeText={(name) => set({ name })} autoCapitalize="words" placeholder={t('e.g. Ibuprofen')} />
      <Field label={t('Dose (optional)')} value={m.dose ?? ''} onChangeText={(dose) => set({ dose: dose || undefined })} placeholder={t('e.g. 400 mg')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {KINDS.map(([k, l]) => <Chip key={k} label={tc('medKind', l)} on={m.kind === k} onPress={() => set({ kind: k })} />)}
      </View>
      <Stepper label={t('Daily limit')} value={m.maxPerDay ?? 0} min={0} max={12} format={(n) => (n ? tn(n, '{n} dose|{n} doses') : tc('limit', 'None'))} onChange={(n) => set({ maxPerDay: n || undefined })} />
      <Row title={t('Daily reminder')} value={!!m.reminder} onValueChange={(v) => { if (v) void ensurePermission(); set({ reminder: v ? { hour: 9, minute: 0 } : null }); }} />
      {m.reminder ? (
        <Stepper label={t('Time')} value={m.reminder.hour * 60 + m.reminder.minute} min={0} max={23 * 60 + 45} step={15}
          format={(n) => hhmm(Math.floor(n / 60), n % 60)} onChange={(n) => set({ reminder: { hour: Math.floor(n / 60), minute: n % 60 } })} />
      ) : null}
      <Row title={t('Currently taking')} value={m.active} onValueChange={(active) => set({ active })} />
      <Btn title={t('Save')} disabled={!m.name.trim()} onPress={() => onSave({ ...m, name: m.name.trim() })} style={{ marginTop: 8 }} />
      <Btn kind="ghost" title={t('Cancel')} onPress={onCancel} />
      {onDelete ? <Btn kind="danger" title={t('Delete')} onPress={onDelete} /> : null}
    </View>
  );
}

// ------------------------------------------------------------------ Doctor report (PDF)

export function DoctorReport() {
  const records = useStore((s) => s.records);
  const name = useStore((s) => s.name);
  const unit = useStore((s) => s.unit);
  const [months, setMonths] = useState<'3' | '6' | '12'>('6');
  const [withName, setWithName] = useState(!!name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const html = () => buildDoctorReport(selectLogs(records), selectSettings(records), { today: todayFn(), months: +months, name: withName ? name : undefined, label: labelOf, unit });
  const fileName = `Avelune cycle report ${todayFn()}.pdf`;

  const share = async () => {
    setBusy(true); setMsg('');
    try {
      if (Platform.OS === 'web') { openWebPrint(html()); setMsg(t('Choose “Save as PDF” in the print dialog.')); return; }
      const { uri } = await Print.printToFileAsync({ html: html(), width: 595, height: 842 });
      const dest = `${FileSystem.cacheDirectory}${fileName.replace(/ /g, '-')}`;
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Share cycle report') });
      else setMsg(t('Saved to {path}', { path: dest }));
    } catch (e) { setMsg(t('Could not create the PDF ({error}).', { error: (e as Error).message })); } finally { setBusy(false); }
  };
  const preview = async () => {
    setMsg('');
    try { if (Platform.OS === 'web') openWebPrint(html()); else await Print.printAsync({ html: html() }); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <Page>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginEnd: 12 }}><Icon name="file-pdf" size={22} color={colors.heading} /></View>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.heading }}>{t('Report for your doctor')}</Text>
        </View>
        <Muted>{t('A clear PDF with your cycle and period lengths, a cycle chart, symptoms by cycle day, ovulation, medication, temperatures and your health profile. It is created on this device; you decide who gets it.')}</Muted>
        <Text style={{ fontSize: 15, color: colors.text, marginTop: 14, marginBottom: 8 }}>{t('Period covered')}</Text>
        <Segmented options={[['3', tn(3, '{n} month|{n} months')], ['6', tn(6, '{n} month|{n} months')], ['12', tn(12, '{n} month|{n} months')]]} value={months} onChange={setMonths} />
        {name ? <Row title={t('Include your name (“{name}”)', { name })} value={withName} onValueChange={setWithName} /> : null}
        <Btn icon="share-variant" title={busy ? t('Creating…') : Platform.OS === 'web' ? t('Create PDF') : t('Create and share PDF')} disabled={busy} onPress={() => void share()} style={{ marginTop: 12 }} />
        {Platform.OS !== 'web' ? <Btn kind="ghost" icon="printer" title={t('Preview or print')} onPress={() => void preview()} /> : null}
        {msg ? <Muted style={{ marginTop: 6, color: colors.text }}>{msg}</Muted> : null}
      </Card>
    </Page>
  );
}

function openWebPrint(html: string) {
  const w = window.open('', '_blank');
  if (!w) throw new Error(t('Allow pop-ups to open the report.'));
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* closed */ } }, 600);
}
