import React, { useState } from 'react';
import { Platform } from 'react-native';
import { MIN_PASSPHRASE } from '@avelune/core';
import { useStore } from './store';
import { Btn, Field, Muted } from './ui';
import { colors } from './theme';
import { t } from './i18n';

/** Messages for server error codes (built when shown, so they follow the current language). */
const errors = (): Record<string, string> => ({
  invalid_credentials: t('Wrong email or password.'),
  email_taken: t('That email is already registered.'),
  weak_password: t('Use an account password of at least 8 characters.'),
  invalid_email: t('Enter a valid email.'),
  registration_disabled: t('This server has registration turned off.'),
  weak_passphrase: t('Use an encryption passphrase of at least {n} characters.', { n: MIN_PASSPHRASE }),
  same_passphrase: t('The encryption passphrase must be different from your account password.'),
  wrong_passphrase: t('That encryption passphrase does not match this account.'),
  mismatch: t('The two encryption passphrases do not match.'),
});

export function ServerForm({ allowRegister = true }: { allowRegister?: boolean }) {
  const connect = useStore((s) => s.connect);
  const [url, setUrl] = useState(Platform.OS === 'web' ? window.location.origin : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const go = async (mode: 'login' | 'register') => {
    if (mode === 'register' && pass !== pass2) return setMsg(errors().mismatch);
    setBusy(true); setMsg('');
    try { await connect(url, email, password, pass, mode); setPassword(''); setPass(''); setPass2(''); }
    catch (e) { setMsg(errors()[(e as Error).message] ?? t('Could not reach the server ({error}).', { error: (e as Error).message })); }
    setBusy(false);
  };
  const disabled = busy || !url || !email || !password || !pass;
  return (
    <>
      <Muted>{t('Run the Avelune server on your own machine and sign in to sync between devices. Your data is end-to-end encrypted on this device before it is uploaded. Without a server, everything stays on this device.')}</Muted>
      <Field label={t('Server URL')} value={url} onChangeText={setUrl} placeholder="https://avelune.example.com" keyboardType="url" />
      <Field label={t('Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label={t('Account password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Field label={t('Encryption passphrase')} value={pass} onChangeText={setPass} secureTextEntry />
      {allowRegister && <Field label={t('Confirm encryption passphrase (new accounts)')} value={pass2} onChangeText={setPass2} secureTextEntry />}
      <Muted style={{ marginBottom: 8 }}>{t('The passphrase never leaves your device and cannot be recovered. If you forget it, your synced data cannot be read by anyone, including you. Use the same passphrase on every device.')}</Muted>
      {msg ? <Muted style={{ color: colors.danger }}>{msg}</Muted> : null}
      <Btn title={busy ? t('Working…') : t('Sign in')} onPress={() => void go('login')} disabled={disabled} />
      {allowRegister && <Btn kind="ghost" title={t('Create account on this server')} onPress={() => void go('register')} disabled={disabled || !pass2} />}
    </>
  );
}
