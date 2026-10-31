import React, { useState } from 'react';
import { Platform } from 'react-native';
import { MIN_PASSPHRASE } from '@cyclo/core';
import { useStore } from './store';
import { Btn, Field, Muted } from './ui';

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'That email is already registered.',
  weak_password: 'Use an account password of at least 8 characters.',
  invalid_email: 'Enter a valid email.',
  registration_disabled: 'This server has registration turned off.',
  weak_passphrase: `Use an encryption passphrase of at least ${MIN_PASSPHRASE} characters.`,
  same_passphrase: 'The encryption passphrase must be different from your account password.',
  wrong_passphrase: 'That encryption passphrase does not match this account.',
  mismatch: 'The two encryption passphrases do not match.',
};

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
    if (mode === 'register' && pass !== pass2) return setMsg(ERRORS.mismatch);
    setBusy(true); setMsg('');
    try { await connect(url, email, password, pass, mode); setPassword(''); setPass(''); setPass2(''); }
    catch (e) { setMsg(ERRORS[(e as Error).message] ?? `Could not reach the server (${(e as Error).message}).`); }
    setBusy(false);
  };
  const disabled = busy || !url || !email || !password || !pass;
  return (
    <>
      <Muted>Run the Cyclo server on your own machine and sign in to sync between devices. Your data is end-to-end encrypted on this device before it is uploaded. Without a server, everything stays on this device.</Muted>
      <Field label="Server URL" value={url} onChangeText={setUrl} placeholder="https://cyclo.example.com" keyboardType="url" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Account password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Field label="Encryption passphrase" value={pass} onChangeText={setPass} secureTextEntry />
      {allowRegister && <Field label="Confirm encryption passphrase (new accounts)" value={pass2} onChangeText={setPass2} secureTextEntry />}
      <Muted style={{ marginBottom: 8 }}>The passphrase never leaves your device and cannot be recovered. If you forget it, your synced data cannot be read by anyone, including you. Use the same passphrase on every device.</Muted>
      {msg ? <Muted style={{ color: '#B3261E' }}>{msg}</Muted> : null}
      <Btn title={busy ? 'Working…' : 'Sign in'} onPress={() => void go('login')} disabled={disabled} />
      {allowRegister && <Btn kind="ghost" title="Create account on this server" onPress={() => void go('register')} disabled={disabled || !pass2} />}
    </>
  );
}
