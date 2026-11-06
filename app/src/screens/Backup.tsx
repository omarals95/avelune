import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { toDateStr, type BackupPayload } from '@avelune/core';
import { MIN_BACKUP_PASSPHRASE, backupErrorText, backupCaps, backupError, backupNow, chooseBackupFolder, forgetBackupKey, loadBackupKey, readBackup, setBackupPassphrase, verifyLatestBackup } from '../backup';
import { dayMonth, t, tc, tn } from '../i18n';
import { Icon } from '../icons';
import { useStore } from '../store';
import { Text } from '../text';
import { colors } from '../theme';
import { Btn, Card, Field, Muted, Page, Row } from '../ui';

const when = (ms: number) => {
  const d = new Date(ms);
  return t('{date}, {time}', { date: `${dayMonth(toDateStr(d), true)} ${d.getFullYear()}`, time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
};

/** Settings → Backups. */
export function BackupSettings() {
  const b = useStore((s) => s.backup);
  const setBackup = useStore((s) => s.setBackup);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { void loadBackupKey().then((k) => setHasKey(!!k)); }, []);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); } catch (e) { setMsg({ ok: false, text: backupError(e) }); }
    setBusy(false);
  };
  const savePass = () => run(async () => {
    if (pass !== pass2) throw new Error('mismatch');
    await setBackupPassphrase(pass);
    setPass(''); setPass2(''); setHasKey(true);
    return t('Backup passphrase saved on this device.');
  });

  return (
    <Page>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginEnd: 12 }}>
            <Icon name="shield-lock-outline" size={22} color={colors.heading} />
          </View>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.heading }}>{t('Encrypted backups')}</Text>
        </View>
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 8 }}>
          {Platform.OS === 'android'
            ? t('Avelune saves an encrypted copy of your data to a folder you choose, once a day when something changed. Pick a folder that survives a new phone, such as one synced to your cloud drive or an SD card.')
            : Platform.OS === 'ios'
              ? t('Avelune saves an encrypted copy of your data once a day when something changed. Find the files in the Files app under On My iPhone › Avelune; they are also included in your iCloud device backup.')
              : t('Download an encrypted copy of your data. In the browser, backups are made when you tap the button.')}
          {' '}{t('No server needed.')}
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.heading, marginBottom: 6 }}>{hasKey ? t('Backup passphrase is set') : t('Choose a backup passphrase')}</Text>
        <Muted style={{ marginBottom: 10 }}>{t('You need it to restore. It is never stored in the backup and cannot be recovered, so write it down somewhere safe.')}</Muted>
        {hasKey === false ? (
          <>
            <Field label={t('Backup passphrase')} value={pass} onChangeText={setPass} secureTextEntry placeholder={t('At least {n} characters', { n: MIN_BACKUP_PASSPHRASE })} />
            <Field label={t('Repeat passphrase')} value={pass2} onChangeText={setPass2} secureTextEntry />
            <Btn title={t('Save passphrase')} disabled={busy || pass.length < MIN_BACKUP_PASSPHRASE || !pass2} onPress={() => void savePass()} />
          </>
        ) : hasKey ? (
          <Btn kind="ghost" title={t('Change passphrase')} onPress={() => setHasKey(false)} />
        ) : null}
      </Card>

      {hasKey ? (
        <Card>
          {backupCaps.auto ? (
            <Row title={t('Automatic daily backup')} subtitle={b.enabled ? tc('status', 'On') : tc('status', 'Off')} value={b.enabled} onValueChange={(v) => setBackup({ enabled: v })} />
          ) : null}
          {backupCaps.pickFolder ? (
            <Row icon="file-upload-outline" title={t('Backup folder')} subtitle={b.dirLabel ?? t('Not chosen')}
              onPress={() => void run(async () => { const f = await chooseBackupFolder(); if (!f) return t('No folder chosen.'); setBackup({ dirUri: f.uri, dirLabel: f.label }); return t('Backups will be saved in {folder}.', { folder: f.label }); })} />
          ) : null}
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, color: colors.text }}>
              {b.lastAt ? t('Last backup: {when} · {days}', { when: when(b.lastAt), days: tn(b.lastDays ?? 0, '{n} day|{n} days') }) : t('No backup yet.')}
            </Text>
            {b.verifiedAt ? <Muted style={{ marginTop: 2 }}>{t('Last checked: {when}', { when: when(b.verifiedAt) })}</Muted> : null}
            {b.lastError ? <Muted style={{ marginTop: 2, color: colors.danger }}>{t('Last attempt failed: {error}', { error: backupErrorText(b.lastError) ?? b.lastError })}</Muted> : null}
          </View>
          <Btn icon="shield-lock-outline" title={busy ? t('Working…') : Platform.OS === 'web' ? t('Download backup') : t('Back up now')} disabled={busy}
            onPress={() => void run(async () => { const r = await backupNow(); return tn(r.days, 'Saved {n} day.|Saved {n} days.'); })} />
          {Platform.OS !== 'web' && b.lastFile ? (
            <Btn kind="ghost" icon="check" title={t('Test restore')} disabled={busy}
              onPress={() => void run(async () => { const n = await verifyLatestBackup(); return tn(n, 'Backup opened successfully: {n} day inside. Nothing was changed.|Backup opened successfully: {n} days inside. Nothing was changed.'); })} />
          ) : null}
          <Btn kind="ghost" title={t('Forget passphrase on this device')} onPress={() => void forgetBackupKey().then(() => { setHasKey(false); setBackup({ enabled: false }); })} />
        </Card>
      ) : null}
      {msg ? <Muted style={{ color: msg.ok ? colors.text : colors.danger, marginBottom: 12 }} >{msg.text}</Muted> : null}

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.heading, marginBottom: 6 }}>{t('Restore from a backup')}</Text>
        <RestoreBackup />
      </Card>
    </Page>
  );
}

async function readPicked(a: DocumentPicker.DocumentPickerAsset) {
  if (Platform.OS === 'web') {
    const f = (a as unknown as { file?: File }).file;
    return f ? f.text() : (await fetch(a.uri)).text();
  }
  return FileSystem.readAsStringAsync(a.uri);
}

/** Pick a .avelune file, unlock it and merge or replace. Used in Settings and during onboarding. */
export function RestoreBackup({ onboarding, onDone }: { onboarding?: boolean; onDone?: () => void }) {
  const restore = useStore((s) => s.restoreBackup);
  const [text, setText] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [data, setData] = useState<BackupPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState('');

  const pick = async () => {
    setMsg(''); setDone(''); setData(null);
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    try { setText(await readPicked(res.assets[0])); setName(res.assets[0].name); } catch (e) { setMsg(backupError(e)); }
  };
  const unlock = async () => {
    if (!text) return;
    setBusy(true); setMsg('');
    try { setData(await readBackup(text, pass)); } catch (e) { setMsg(backupError(e)); }
    setBusy(false);
  };
  const apply = (mode: 'merge' | 'replace') => {
    if (!data) return;
    const n = restore(data, mode);
    setDone(tn(n, 'Restored {n} record.|Restored {n} records.'));
    setText(null); setData(null); setPass('');
    onDone?.();
  };
  const days = data ? data.records.filter((r) => r.id.startsWith('day:') && !r.deleted).length : 0;
  return (
    <View>
      {!text ? (
        <>
          <Muted style={{ marginBottom: 6 }}>{t('Choose an Avelune backup file (.avelune) and enter its passphrase.')}</Muted>
          <Btn kind={onboarding ? 'primary' : 'ghost'} icon="file-upload-outline" title={t('Choose backup file')} onPress={() => void pick()} />
        </>
      ) : !data ? (
        <>
          <Text style={{ fontSize: 15, color: colors.text, marginBottom: 8 }}>{name}</Text>
          <Field label={t('Backup passphrase')} value={pass} onChangeText={setPass} secureTextEntry />
          <Btn title={busy ? t('Unlocking…') : t('Unlock backup')} disabled={busy || !pass} onPress={() => void unlock()} />
          <Btn kind="ghost" title={t('Choose a different file')} onPress={() => void pick()} />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>{tn(days, 'Backup from {when} with {n} logged day.|Backup from {when} with {n} logged days.', { when: when(data.createdAt) })}</Text>
          {onboarding ? (
            <Btn title={t('Restore')} onPress={() => apply('replace')} style={{ marginTop: 10 }} />
          ) : (
            <>
              <Btn title={t('Merge with this device')} onPress={() => apply('merge')} style={{ marginTop: 10 }} />
              <Muted>{t('Keeps your newer edits and adds anything missing.')}</Muted>
              <Btn kind="danger" title={t('Replace everything on this device')} onPress={() => apply('replace')} style={{ marginTop: 10 }} />
            </>
          )}
        </>
      )}
      {msg ? <Muted style={{ color: colors.danger, marginTop: 6 }}>{msg}</Muted> : null}
      {done ? <Muted style={{ color: colors.text, marginTop: 6 }}>{done}</Muted> : null}
    </View>
  );
}
