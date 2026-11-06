import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Text } from '../text';
import { addDays, derivePeriods, dropSource, exportRows, lmpFromDueDate, predict, pregnancyStatus, today as todayFn, writeXlsx, type Condition, type Contraception, type CycleProfile, type ReminderPrefs, type TimeOfDay } from '@avelune/core';
import { FadeIn, PressScale } from '../anim';
import { fmtDay } from '../components';
import { Icon, type IconName } from '../icons';
import { resume, type SettingsPage } from '../nav';
import { ensurePermission, remindersSupported } from '../reminders';
import { ServerForm } from '../ServerForm';
import { Connections } from './Connections';
import { ImportCSV } from './ImportCSV';
import { labelOf } from '../catalog';
import { selectLogs, selectSettings, useStore } from '../store';
import { saveFile, XLSX_MIME } from '../files';
import { useHealth } from '../health/store';
import { colors, type ThemePref } from '../theme';
import { LANGUAGES, t, type LangPref } from '../i18n';
import { Btn, Card, Chip, Field, Muted, Page, Row, Section, Stepper, TopBar } from '../ui';
import { BackupSettings } from './Backup';
import { AboutPage, DonateBox } from './About';
import { DoctorReport, MedsSettings, SecuritySettings } from './SettingsExtra';

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) ok(); }
  else Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: ok }]);
};

const hhmm = (t: { hour: number; minute: number }) => {
  const h = t.hour % 12 || 12;
  return `${h}:${String(t.minute).padStart(2, '0')} ${t.hour < 12 ? 'am' : 'pm'}`;
};

export function Settings({ page: initial, onClose }: { page: SettingsPage; onClose: () => void }) {
  const [page, setPage] = useState<SettingsPage>(initial);
  const back = () => (page === 'main' || initial !== 'main' ? onClose() : setPage('main'));
  const titles: Record<SettingsPage, string> = {
    main: 'Settings', appearance: 'Appearance', language: 'Language', profile: 'Health profile', backup: 'Backups', security: 'Privacy & security', meds: 'Contraception & meds', report: 'Doctor report', health: 'Health connections', import: 'Import data', cycle: 'Cycle and ovulation', reminders: 'Reminders', pregnancy: 'Pregnancy & after', content: 'Hide content', sync: 'Sync & encryption', data: 'Your data', units: 'Units', about: 'About Avelune',
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={titles[page]} onBack={back} />
      {page === 'main' && <Main go={setPage} />}
      {page === 'appearance' && <Appearance />}
      {page === 'language' && <LanguagePage />}
      {page === 'profile' && <Profile />}
      {page === 'backup' && <BackupSettings />}
      {page === 'security' && <SecuritySettings />}
      {page === 'meds' && <MedsSettings openProfile={() => setPage('profile')} />}
      {page === 'report' && <DoctorReport />}
      {page === 'cycle' && <CycleSettings />}
      {page === 'reminders' && <Reminders />}
      {page === 'pregnancy' && <Pregnancy />}
      {page === 'content' && <HideContent />}
      {page === 'units' && <Units />}
      {page === 'sync' && <Sync />}
      {page === 'health' && <Connections onClose={back} embedded onImport={() => setPage('import')} />}
      {page === 'data' && <Data go={setPage} />}
      {page === 'import' && <ImportCSV />}
      {page === 'about' && <AboutPage />}
    </View>
  );
}

function Main({ go }: { go: (p: SettingsPage) => void }) {
  const st = useStore();
  const settings = selectSettings(st.records);
  return (
    <Page>
      <Card>
        <Field label="Your name (shown to your partner)" value={st.name} onChangeText={(name) => st.setPrefs({ name })} autoCapitalize="words" placeholder="Optional" />
      </Card>
      <Card>
        <Row icon="translate" title={t('Language')} subtitle={st.language && st.language !== 'system' ? LANGUAGES.find((l) => l.code === st.language)?.name : t('Match phone')} onPress={() => go('language')} />
        <Row icon="palette" title="Appearance" subtitle={({ system: 'Match phone', light: 'Light', dark: 'Dark' } as const)[st.theme ?? 'system']} onPress={() => go('appearance')} />
        <Row icon="stethoscope" title="Health profile" subtitle={profileSummary(settings)} onPress={() => go('profile')} />
        <Row icon="pill" title="Contraception & medication" subtitle={(settings.medications ?? []).filter((m) => m.active).length ? `${(settings.medications ?? []).filter((m) => m.active).length} medication${(settings.medications ?? []).filter((m) => m.active).length === 1 ? '' : 's'}` : undefined} onPress={() => go('meds')} />
        <Row icon="refresh" title="Cycle and ovulation" subtitle={settings.stage?.kind === 'paused' ? 'Tracking paused' : settings.forecastMode === 'off' ? 'Forecast off' : undefined} onPress={() => go('cycle')} />
        <Row icon="bell-outline" title="Reminders" onPress={() => go('reminders')} />
        <Row icon="human-pregnant" title="Pregnancy & after" subtitle={settings.pregnancyLmp ? 'Pregnant' : settings.stage?.kind === 'postpartum' ? 'After birth' : settings.stage?.kind === 'loss' ? 'After a loss' : 'Off'} onPress={() => go('pregnancy')} />
        <Row icon="eye-off-outline" title="Hide content" onPress={() => go('content')} />
        <Row icon="ruler" title="Units" subtitle={`°${st.unit} · ${st.weightUnit}`} onPress={() => go('units')} />
      </Card>
      <Card>
        <Row icon="heart-pulse" title="Health connections" subtitle="Apple Health, Health Connect, Fitbit" onPress={() => go('health')} />
        <Row icon="lock-outline" title="Privacy & security" subtitle={[st.security.lock ? 'App lock on' : null, st.security.blockScreenshots ? 'screenshots blocked' : null].filter(Boolean).join(' · ') || 'App lock, screenshots'} onPress={() => go('security')} />
        <Row icon="shield-lock-outline" title="Backups" subtitle={st.backup.enabled && st.backup.lastAt ? `On · last ${new Date(st.backup.lastAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : st.backup.lastAt ? 'Manual' : 'Off'} onPress={() => go('backup')} />
        <Row icon="cloud-lock-outline" title="Sync & encryption" subtitle={st.server ? `Connected · ${st.server.email}` : 'Off: data stays on this device'} onPress={() => go('sync')} />
        <Row icon="database-export-outline" title="Your data" subtitle="Export, doctor summary, delete" onPress={() => go('data')} />
      </Card>
      <Card>
        <Row icon="hand-heart" title="About Avelune" subtitle="Free & open source · terms · privacy policy" onPress={() => go('about')} />
      </Card>
      <DonateBox compact />
      <Muted style={{ textAlign: 'center' }}>Avelune is a free, independent, open-source tracker. Predictions are estimates and not a method of contraception.</Muted>
    </Page>
  );
}

function LanguagePage() {
  const st = useStore();
  const cur = st.language ?? 'system';
  const opts: [LangPref, string, string][] = [
    ['system', t('Match phone'), t('Uses your phone’s language when Avelune speaks it, otherwise English')],
    ...LANGUAGES.map((l) => [l.code, l.name, l.code === 'ar' ? t('Arabic · right to left') : t('English · left to right')] as [LangPref, string, string]),
  ];
  return (
    <Page>
      <Card>
        {opts.map(([k, name, sub]) => (
          <PressScale key={k} accessibilityRole="radio" accessibilityState={{ checked: cur === k }} accessibilityLabel={name} testID={`lang-${k}`}
            onPress={() => { if (k !== cur) { resume.settings = 'language'; st.setPrefs({ language: k }); } }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, minHeight: 64 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}><Icon name="translate" size={22} color={colors.heading} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.heading }}>{name}</Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{sub}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: cur === k ? colors.primary : colors.faint, alignItems: 'center', justifyContent: 'center' }}>
                {cur === k ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} /> : null}
              </View>
            </View>
          </PressScale>
        ))}
      </Card>
      <Text style={{ fontSize: 14, color: colors.muted, marginHorizontal: 4, lineHeight: 20 }}>{t('Health guidance, the terms and the privacy policy are translated for convenience. If anything differs, the English text applies.')}</Text>
    </Page>
  );
}

function Appearance() {
  const st = useStore();
  const cur = st.theme ?? 'system';
  const opts: [ThemePref, string, string, IconName][] = [
    ['system', 'Match phone', 'Follows your phone’s light or dark setting', 'theme-system'],
    ['light', 'Light', 'Warm ivory with editorial serif headings', 'theme-light'],
    ['dark', 'Dark', 'Deep plum, easy on the eyes at night', 'theme-dark'],
  ];
  return (
    <Page>
      <Card>
        {opts.map(([k, t, sub, icon]) => (
          <PressScale key={k} accessibilityRole="radio" accessibilityState={{ checked: cur === k }} accessibilityLabel={t}
            onPress={() => { if (k !== cur) { resume.settings = 'appearance'; st.setPrefs({ theme: k }); } }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, minHeight: 64 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}><Icon name={icon} size={22} color={colors.heading} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.heading }}>{t}</Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{sub}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: cur === k ? colors.primary : colors.faint, alignItems: 'center', justifyContent: 'center' }}>
                {cur === k ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} /> : null}
              </View>
            </View>
          </PressScale>
        ))}
      </Card>
    </Page>
  );
}

function CycleSettings() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const set = (p: Partial<typeof settings>) => st.saveSettings({ ...settings, ...p });
  return (
    <Page>
      <Card>
        <Row title="Show period forecast" value={settings.forecastMode !== 'off'} onValueChange={(v) => set({ forecastMode: v ? 'auto' : 'off' })} />
        <Muted>Turn off to see only the days since your last period: no predicted dates, ranges or late notices.</Muted>
        <Row title="Pause tracking" value={settings.stage?.kind === 'paused'} onValueChange={(v) => set({ stage: v ? { kind: 'paused', since: todayFn() } : { kind: 'cycling' } })} />
        <Muted>For a break from tracking. Predictions and cycle reminders stop; anything you log is still saved.</Muted>
      </Card>
      <Card>
        <Stepper label="Cycle length" value={settings.cycleLength} min={15} max={90} suffix=" days" onChange={(cycleLength) => set({ cycleLength })} />
        <Stepper label="Period length" value={settings.periodLength} min={1} max={14} suffix=" days" onChange={(periodLength) => set({ periodLength })} />
        <Muted style={{ marginTop: 8 }}>Predictions use these settings at first. Once you have logged a few periods, they use your own cycles instead, leaving out any that look unusual. You can choose which cycles count under Insights › Recent cycle length.</Muted>
      </Card>
      <Card>
        <Row title="Chance of getting pregnant" value={settings.showFertileWindow !== false} onValueChange={(showFertileWindow) => set({ showFertileWindow })} />
        <Muted>If you turn this off, only the estimated ovulation day is shown.</Muted>
      </Card>
      <Card>
        <Stepper label="Luteal phase" value={settings.lutealLength} min={10} max={16} suffix=" days" onChange={(lutealLength) => set({ lutealLength })} />
        <Muted style={{ marginTop: 8 }}>The luteal phase runs from ovulation to the start of your period. If you know yours, set it here for more accurate ovulation estimates.</Muted>
      </Card>
      <Card>
        <Row title="Display cycle sequence" value={!!settings.showCycleDays} onValueChange={(showCycleDays) => set({ showCycleDays })} />
        <Muted>Cycle day numbers (day 1, 2, 3…) appear above the calendar dates.</Muted>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
          {[3, 4, 5, 6, 7, 8, 9].map((n, i) => (
            <FadeIn key={n} delay={i * 60} style={{ alignItems: 'center', marginHorizontal: 2 }}>
              {settings.showCycleDays ? <Text style={{ fontSize: 10, color: colors.muted }}>{n}</Text> : <Text style={{ fontSize: 10 }}> </Text>}
              <View style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
                i < 3 && { backgroundColor: colors.period }, i === 3 && { borderWidth: 2, borderColor: colors.period }, i === 5 && { borderWidth: 2, borderColor: colors.fertile }]}>
                <Text style={{ fontSize: 17, color: i < 3 ? '#fff' : i === 3 ? colors.period : i >= 4 ? colors.fertile : colors.text }}>{n}</Text>
              </View>
            </FadeIn>
          ))}
        </View>
      </Card>
      <Card>
        <Stepper label="Daily water target" value={settings.waterTarget ?? 2250} min={1000} max={4000} step={250} format={(n) => `${(n / 1000).toFixed(2)} L`} onChange={(waterTarget) => set({ waterTarget })} />
      </Card>
    </Page>
  );
}

type Key = Exclude<keyof ReminderPrefs, 'discreet'>;

function Reminders() {
  const st = useStore();
  const r = st.reminders;
  const [open, setOpen] = useState<Key | null>(null);
  const [msg, setMsg] = useState('');
  const toggle = async (k: Key, on: boolean) => {
    if (on && !(await ensurePermission())) return setMsg('Notifications are blocked. Allow them for Avelune in your phone settings.');
    setMsg('');
    st.setReminders({ [k]: { ...r[k], on } } as Partial<ReminderPrefs>);
  };
  const patch = (k: Key, p: Partial<TimeOfDay> & Record<string, number>) => st.setReminders({ [k]: { ...r[k], ...p } } as Partial<ReminderPrefs>);
  const item = (k: Key, title: string, extra?: string) => (
    <View key={k}>
      <Row title={title} subtitle={r[k].on ? `${extra ? extra + ' · ' : ''}${hhmm(r[k])}` : 'Off'} value={r[k].on} onValueChange={(v) => void toggle(k, v)}
        onPress={() => setOpen(open === k ? null : k)} />
      {open === k && (
        <FadeIn style={{ paddingVertical: 6 }}>
          {k === 'periodSoon' && <Stepper label="Days before" value={r.periodSoon.daysBefore} min={0} max={5} onChange={(n) => patch(k, { daysBefore: n })} />}
          <Stepper label={k === 'water' ? 'From' : 'Time'} value={r[k].hour * 60 + r[k].minute} min={0} max={23 * 60 + 45} step={15}
            format={(n) => hhmm({ hour: Math.floor(n / 60), minute: n % 60 })} onChange={(n) => patch(k, { hour: Math.floor(n / 60), minute: n % 60 })} />
          {k === 'water' && <Stepper label="Until" value={r.water.endHour} min={r.water.hour} max={23} format={(n) => hhmm({ hour: n, minute: 0 })} onChange={(n) => patch(k, { endHour: n })} />}
          {k === 'water' && <Stepper label="Every" value={r.water.everyHours} min={1} max={6} suffix=" h" onChange={(n) => patch(k, { everyHours: n })} />}
        </FadeIn>
      )}
    </View>
  );
  return (
    <Page>
      {!remindersSupported && (
        <View style={{ flexDirection: 'row', backgroundColor: colors.pregnancySoft, borderRadius: 18, padding: 16, marginBottom: 12, alignItems: 'center' }}>
          <Icon name="alert" size={26} color={colors.pregnancy} />
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: colors.text }}>Reminders are delivered by the iPhone and Android apps. Set them up in Avelune on your phone.</Text>
        </View>
      )}
      {msg ? <Muted style={{ color: colors.danger, marginBottom: 8 }}>{msg}</Muted> : null}
      <Section title="Cycle" />
      {item('periodSoon', 'Period in a couple of days', `${r.periodSoon.daysBefore} days before`)}
      {item('periodStart', 'Period start')}
      {item('periodEnd', 'Period end')}
      {item('ovulation', 'Ovulation')}
      {item('fertile', 'Fertile window starts')}
      <Section title="Medication and contraception" />
      {item('pill', 'Pill reminder')}
      <Section title="Lifestyle" />
      {item('weight', 'Log weight')}
      {item('sleep', 'Log sleep')}
      {item('water', 'Drink water', `every ${r.water.everyHours} h until ${hhmm({ hour: r.water.endHour, minute: 0 })}`)}
      {item('temperature', 'Log temperature')}
      {item('dailyLog', 'Daily check-in')}
      <Section title="Privacy" />
      <Row title="Discreet notifications" subtitle="Lock screen shows only “You have a reminder”" value={r.discreet} onValueChange={(discreet) => st.setReminders({ discreet })} />
      <Muted style={{ marginTop: 12 }}>Reminders are scheduled on this device from your own data. Nothing goes through a push service.</Muted>
    </Page>
  );
}

function DateRow({ label, value, onChange }: { label: string; value: string; onChange: (d: string) => void }) {
  const today = todayFn();
  const shift = (n: number) => { const v = addDays(value, n); if (v <= today) onChange(v); };
  const months = (m: number) => { const d = new Date(+value.slice(0, 4), +value.slice(5, 7) - 1 + m, +value.slice(8)); const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; onChange(v > today ? today : v); };
  return (
    <View style={{ paddingVertical: 8 }}>
      <Text style={{ fontSize: 15, color: colors.text, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Btn kind="ghost" title="−1 mo" onPress={() => months(-1)} style={{ minHeight: 44, paddingHorizontal: 10, marginVertical: 0 }} />
        <Stepper label="" value={0} min={-100000} max={100000} format={() => `${fmtDay(value)} ${value.slice(0, 4)}`} onChange={(n) => shift(n)} />
        <Btn kind="ghost" title="+1 mo" onPress={() => months(1)} style={{ minHeight: 44, paddingHorizontal: 10, marginVertical: 0 }} />
      </View>
    </View>
  );
}

const CONDITIONS: [Condition, string, string][] = [
  ['pcos', 'PCOS', 'Long or irregular cycles are expected; forecasts become wider ranges.'],
  ['endometriosis', 'Endometriosis', 'Timing stays the same; track pain by cycle day for your doctor.'],
  ['thyroid', 'Thyroid condition', 'Can shift cycle length.'],
  ['perimenopause', 'Perimenopause', 'Cycles often lengthen, shorten or skip.'],
  ['no-uterus', 'No uterus or endometrial ablation', 'No period forecast; you can still log symptoms.'],
];
const METHODS: [Contraception, string][] = [
  ['none', 'None'], ['combined-pill', 'Combined pill'], ['mini-pill', 'Mini pill'], ['hormonal-iud', 'Hormonal IUD'], ['copper-iud', 'Copper IUD'],
  ['implant', 'Implant'], ['ring', 'Ring'], ['patch', 'Patch'], ['injection', 'Injection'], ['barrier', 'Condoms or barrier'], ['fam', 'Fertility awareness'],
];
const HORMONAL: Contraception[] = ['combined-pill', 'mini-pill', 'hormonal-iud', 'implant', 'ring', 'patch', 'injection'];

export function profileSummary(s: ReturnType<typeof selectSettings>) {
  const parts = [...(s.profile?.conditions ?? []).map((c) => CONDITIONS.find((x) => x[0] === c)?.[1].split(' ')[0] ?? c)];
  const m = s.profile?.contraception;
  if (m && m !== 'none') parts.push(METHODS.find((x) => x[0] === m)?.[1] ?? m);
  return parts.length ? parts.join(' · ') : 'Conditions and contraception';
}

/** Settings → Health profile: context that changes how predictions are made. */
function Profile() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const pr = settings.profile ?? {};
  const today = todayFn();
  const set = (patch: Partial<CycleProfile>) => st.updateSettings({ profile: { ...pr, ...patch } });
  const conds = pr.conditions ?? [];
  const method = pr.contraception ?? 'none';
  const p = predict(selectLogs(st.records), settings, today);
  const toggleCond = (c: Condition) => set({ conditions: conds.includes(c) ? conds.filter((x) => x !== c) : [...conds, c] });
  const pickMethod = (m: Contraception) => {
    // Switching away from a hormonal method: remember when, so earlier withdrawal bleeds don't count as cycles.
    // (Only when it was in use for at least a day, so a mis-tap doesn't hide your history.)
    const stopping = HORMONAL.includes(method) && !HORMONAL.includes(m) && !!pr.contraceptionSince && pr.contraceptionSince < today;
    set({ contraception: m, contraceptionSince: m === 'none' ? null : today, ...(stopping ? { stoppedHormonalOn: today } : {}) });
  };
  return (
    <Page>
      <Muted style={{ marginBottom: 12 }}>This stays on your device (and your own encrypted sync). It changes which cycles count, how wide the forecast range is and what Avelune says when a period is late.</Muted>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading, marginBottom: 8 }}>Conditions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {CONDITIONS.map(([c, label]) => <Chip key={c} label={label} on={conds.includes(c)} onPress={() => toggleCond(c)} />)}
        </View>
        {conds.map((c) => <Muted key={c} style={{ marginTop: 4 }}>{CONDITIONS.find((x) => x[0] === c)?.[1]}: {CONDITIONS.find((x) => x[0] === c)?.[2]}</Muted>)}
        {conds.includes('perimenopause') ? <Row title="Taking HRT" value={!!pr.hrt} onValueChange={(hrt) => set({ hrt })} /> : null}
        <Row title="In fertility treatment (IVF, IUI)" value={!!pr.fertilityTreatment} onValueChange={(fertilityTreatment) => set({ fertilityTreatment })} />
      </Card>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading, marginBottom: 8 }}>Contraception</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {METHODS.map(([m, label]) => <Chip key={m} label={label} on={method === m} onPress={() => pickMethod(m)} />)}
        </View>
        {method !== 'none' && method !== 'barrier' && method !== 'fam' && pr.contraceptionSince ? (
          <DateRow label="Started or inserted on" value={pr.contraceptionSince} onChange={(contraceptionSince) => set({ contraceptionSince })} />
        ) : null}
        <Row title="I recently stopped hormonal birth control" value={!!pr.stoppedHormonalOn} onValueChange={(v) => set({ stoppedHormonalOn: v ? today : null })} />
        {pr.stoppedHormonalOn ? <DateRow label="Stopped on" value={pr.stoppedHormonalOn} onChange={(stoppedHormonalOn) => set({ stoppedHormonalOn })} /> : null}
        <Muted>Bleeds before this date are withdrawal bleeds and are not counted as cycles.</Muted>
      </Card>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>Effect on your forecast</Text>
        {p.noForecast ? <Muted style={{ marginTop: 6 }}>{p.notes[0]}</Muted> : (
          <>
            <Text style={{ fontSize: 15, color: colors.text, marginTop: 6 }}>
              {p.nextPeriodRange ? `Next period ${fmtDay(p.nextPeriodRange[0])} – ${fmtDay(p.nextPeriodRange[1])} · ${p.confidence} confidence` : 'Log a period to see a forecast.'}
            </Text>
            {p.notes.slice(1).map((n, i) => <Muted key={i} style={{ marginTop: 4 }}>• {n}</Muted>)}
          </>
        )}
      </Card>
    </Page>
  );
}

function Pregnancy() {
  const st = useStore();
  const settings = selectSettings(st.records);
  const logs = selectLogs(st.records);
  const today = todayFn();
  const lastStart = derivePeriods(logs).pop()?.start ?? addDays(today, -28);
  const [lmp, setLmp] = useState(settings.pregnancyLmp ?? lastStart);
  const [ending, setEnding] = useState<null | 'birth' | 'loss'>(null);
  const [endDate, setEndDate] = useState(today);
  const [feeding, setFeeding] = useState(false);
  const set = (pregnancyLmp: string | null) => st.saveSettings({ ...settings, pregnancyLmp, stage: pregnancyLmp ? { kind: 'cycling' } : settings.stage });
  const ps = pregnancyStatus(lmp, today);
  const stage = settings.stage;
  return (
    <Page>
      {settings.pregnancyLmp ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>You're pregnant · week {ps.week}</Text>
          <Muted style={{ marginTop: 4 }}>When your pregnancy ends, tell Avelune so it can switch to the right kind of tracking.</Muted>
          {!ending ? (
            <>
              <Btn icon="baby" title="My baby was born" onPress={() => { setEnding('birth'); setEndDate(today); }} style={{ marginTop: 12 }} />
              <Btn kind="ghost" title="My pregnancy ended (loss)" onPress={() => { setEnding('loss'); setEndDate(today); }} />
              <Btn kind="ghost" title="Turn off pregnancy mode" onPress={() => st.endPregnancy('ended', today)} />
            </>
          ) : (
            <View style={{ marginTop: 10 }}>
              {ending === 'loss' ? (
                <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 6 }}>
                  We’re so sorry. Avelune will hide pregnancy content, stop any “late” notices and wait for your next period before predicting again. Take your time.
                </Text>
              ) : null}
              <DateRow label={ending === 'birth' ? 'Date of birth' : 'Date'} value={endDate} onChange={setEndDate} />
              {ending === 'birth' ? <Row title="Breastfeeding" value={feeding} onValueChange={setFeeding} /> : null}
              <Btn title="Confirm" onPress={() => { st.endPregnancy(ending, endDate, feeding); setEnding(null); }} />
              <Btn kind="ghost" title="Cancel" onPress={() => setEnding(null)} />
            </View>
          )}
        </Card>
      ) : (
        <Card>
          <Row title="I'm pregnant" value={false} onValueChange={(v) => v && set(lmp)} />
          <Muted>Pregnancy mode switches Today to week-by-week updates and pauses period predictions and cycle reminders.</Muted>
        </Card>
      )}

      {!settings.pregnancyLmp && stage?.kind === 'postpartum' ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>After birth · since {fmtDay(stage.since)}</Text>
          <Muted style={{ marginTop: 4 }}>{stage.returnedOn ? `Your period came back on ${fmtDay(stage.returnedOn)}. Early cycles are often irregular, so forecasts are wide ranges for now.` : 'Bleeding in the first weeks is not a period, so it is not counted. Predictions start again with your first period.'}</Muted>
          <Row title="Breastfeeding" value={!!stage.breastfeeding} onValueChange={(breastfeeding) => st.updateSettings({ stage: { ...stage, breastfeeding } })} />
          {!stage.returnedOn ? <Btn title="My period is back" onPress={() => st.updateSettings({ stage: { ...stage, returnedOn: today } })} style={{ marginTop: 8 }} /> : null}
          <Btn kind="ghost" title="Back to regular tracking" onPress={() => st.updateSettings({ stage: { kind: 'cycling' } })} />
        </Card>
      ) : null}
      {!settings.pregnancyLmp && stage?.kind === 'loss' ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>After your loss</Text>
          <Muted style={{ marginTop: 4 }}>Predictions resume after your next period, and there are no “late” notices until then. The cycle that included the pregnancy is not counted in your averages.</Muted>
          <Btn kind="ghost" title="Back to regular tracking" onPress={() => st.updateSettings({ stage: { kind: 'cycling' } })} />
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 17, marginBottom: 6, color: colors.text }}>First day of your last period</Text>
        <Stepper label={fmtDay(lmp)} value={0} min={-300} max={300} format={() => ''} onChange={(n) => { const v = addDays(lmp, n); if (v <= today) { setLmp(v); if (settings.pregnancyLmp) set(v); } }} />
        <Muted>Week {ps.week}, day {ps.day + 1}</Muted>
        <Text style={{ fontWeight: '700', fontSize: 17, marginTop: 14, marginBottom: 6, color: colors.text }}>Or set the due date</Text>
        <Stepper label={`${fmtDay(ps.dueDate)} ${ps.dueDate.slice(0, 4)}`} value={0} min={-300} max={300} format={() => ''}
          onChange={(n) => { const v = lmpFromDueDate(addDays(ps.dueDate, n)); if (v <= today) { setLmp(v); if (settings.pregnancyLmp) set(v); } }} />
      </Card>
      <Muted>{'Week-by-week notes are general information, not medical advice. Your care team’s dates take priority.'}</Muted>
    </Page>
  );
}

function HideContent() {
  const st = useStore();
  return (
    <Page>
      <Muted style={{ textAlign: 'center', marginBottom: 16 }}>Turn off topics you don't want to see. Hidden categories also disappear from logging and quick actions.</Muted>
      <Card><Row title="Sex content" value={!st.hideSex} onValueChange={(v) => st.setPrefs({ hideSex: !v })} /></Card>
    </Page>
  );
}

function Units() {
  const st = useStore();
  return (
    <Page>
      <Card>
        <Row title="Temperature in °F" value={st.unit === 'F'} onValueChange={(v) => st.setPrefs({ unit: v ? 'F' : 'C' })} />
        <Row title="Weight in lb" value={st.weightUnit === 'lb'} onValueChange={(v) => st.setPrefs({ weightUnit: v ? 'lb' : 'kg' })} />
      </Card>
    </Page>
  );
}

function Sync() {
  const st = useStore();
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockMsg, setUnlockMsg] = useState('');
  return (
    <Page>
      <Card>
        {st.server ? (
          <>
            <Row icon="shield-lock-outline" title="End-to-end encrypted" subtitle={`Connected to ${st.server.url} as ${st.server.email}`} />
            <Muted style={{ marginTop: 8 }}>{st.server.lastSync ? `Last synced ${new Date(st.server.lastSync).toLocaleTimeString()}.` : 'Not synced yet.'}</Muted>
            {st.syncError === 'locked' ? (
              <>
                <Muted style={{ color: colors.danger, marginTop: 8 }}>This device has no encryption key. Enter your encryption passphrase to resume syncing.</Muted>
                <Field label="Encryption passphrase" value={unlockPass} onChangeText={setUnlockPass} secureTextEntry />
                {unlockMsg ? <Muted style={{ color: colors.danger }}>{unlockMsg}</Muted> : null}
                <Btn title="Unlock" disabled={!unlockPass} onPress={() => { setUnlockMsg(''); st.unlock(unlockPass).then(() => setUnlockPass('')).catch((e: Error) => setUnlockMsg(e.message === 'wrong_passphrase' ? 'That passphrase does not match this account.' : e.message)); }} />
              </>
            ) : st.syncError ? <Muted style={{ color: colors.danger, marginTop: 8 }}>Sync error: {st.syncError}</Muted> : null}
            <Btn title={st.syncing ? 'Syncing…' : 'Sync now'} onPress={() => void st.sync()} disabled={st.syncing} style={{ marginTop: 12 }} />
            <Btn kind="ghost" title="Disconnect (keep data on this device)" onPress={() => void st.disconnect()} />
          </>
        ) : <ServerForm />}
      </Card>
    </Page>
  );
}

function Data({ go }: { go: (p: SettingsPage) => void }) {
  const st = useStore();
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const run = async (f: () => Promise<string>) => {
    setNote('');
    try { setNote(await f()); } catch (e) { setNote(`Could not export (${(e as Error).message}).`); }
  };
  /** Real .xlsx with the template's columns ("Your data") plus an About sheet; re-imports as is. */
  const exportExcel = () => {
    const health = Object.values(dropSource(useHealth.getState().days, 'sample'));
    const rows = exportRows(selectLogs(st.records), labelOf, health);
    const about = [
      ['Avelune export'], [''],
      ['Exported', `${todayFn()}`], ['Days', `${rows.length - 1}`],
      ['Units', 'Temperature in °C, weight in kg, water in ml, sleep in hours, distance in km'],
      ['Import it again', 'Settings → Your data → Import from file. The "Your data" sheet is read; this sheet is ignored.'],
    ];
    const bytes = writeXlsx([
      { name: 'Your data', rows, widths: [12, 10, 30, 22, 26, 9, 11, 11, 12, 13, 9, 11, 40] },
      { name: 'About', rows: about, widths: [18, 90], header: false },
    ]);
    return saveFile(`Avelune export ${todayFn()}.xlsx`, XLSX_MIME, bytes);
  };
  const summary = () => {
    const logs = selectLogs(st.records);
    const settings = selectSettings(st.records);
    const p = predict(logs, settings, todayFn());
    const periods = derivePeriods(logs);
    return [
      'Avelune cycle summary', `Generated ${todayFn()}`, '',
      `Average cycle: ${p.stats.avgCycle} days (${p.stats.regularity})`, `Average period: ${p.stats.avgPeriod} days`, '',
      'Recent periods:', ...periods.slice(-12).map((x) => `- ${x.start} to ${x.end} (${x.length} days)`),
    ].join('\n');
  };
  return (
    <Page>
      <Card>
        <Row icon="file-upload-outline" title="Import from file" subtitle="Excel (.xlsx) or CSV · example template included" onPress={() => go('import')} />
        <Row icon="file-xls" title="Export to Excel (.xlsx)" subtitle="Every logged day, in the same columns as the import template" onPress={() => void run(exportExcel)} />
        <Row icon="code-json" title="Export all data (JSON)" subtitle="Full copy for developers or other apps" onPress={() => void run(() => saveFile(`Avelune data ${todayFn()}.json`, 'application/json', JSON.stringify({ version: 2, records: Object.values(st.records) }, null, 2)))} />
        <Row icon="file-pdf" title="Report for my doctor (PDF)" subtitle="Cycles, symptoms, medication, temperatures" onPress={() => go('report')} />
      </Card>
      <Card>
        <Row icon="delete-outline" danger title="Delete data on this device" onPress={() => confirm('Delete data on this device?', 'This cannot be undone. Data already synced stays on your server.', () => void st.wipe(false))} />
        {st.server && <Row icon="account-remove-outline" danger title="Delete my account and server data" onPress={() => confirm('Delete account?', 'This permanently deletes your server account, every synced record and any partner share.', () => void st.wipe(true).catch((e) => setMsg(String(e.message))))} />}
        {msg ? <Muted style={{ color: colors.danger }}>{msg}</Muted> : null}
      </Card>
      {note ? <Muted style={{ textAlign: 'center' }}>{note}</Muted> : null}
    </Page>
  );
}
