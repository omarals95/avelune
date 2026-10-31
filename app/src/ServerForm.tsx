import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useStore } from './store';
import { Btn, Field, Muted } from './ui';

const ERRORS: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'That email is already registered.',
  weak_password: 'Use a password of at least 8 characters.',
  invalid_email: 'Enter a valid email.',
  registration_disabled: 'This server has registration turned off.',
};

export function ServerForm({ allowRegister = true }: { allowRegister?: boolean }) {
  const connect = useStore((s) => s.connect);
  const [url, setUrl] = useState(Platform.OS === 'web' ? window.location.origin : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const go = async (mode: 'login' | 'register') => {
    setBusy(true); setMsg('');
    try { await connect(url, email, password, mode); setPassword(''); }
    catch (e) { setMsg(ERRORS[(e as Error).message] ?? `Could not reach the server (${(e as Error).message}).`); }
    setBusy(false);
  };
  const disabled = busy || !url || !email || !password;
  return (
    <>
      <Muted>Run the Cyclo server on your own machine and sign in to sync between phone and web. Without it, everything stays on this device.</Muted>
      <Field label="Server URL" value={url} onChangeText={setUrl} placeholder="https://cyclo.example.com" keyboardType="url" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      {msg ? <Muted style={{ color: '#B3261E' }}>{msg}</Muted> : null}
      <Btn title="Sign in" onPress={() => void go('login')} disabled={disabled} />
      {allowRegister && <Btn kind="ghost" title="Create account on this server" onPress={() => void go('register')} disabled={disabled} />}
    </>
  );
}
