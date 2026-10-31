import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { fitbitRedirectUri } from '../health/fitbit';
import { openHealthConnect } from '../health/healthconnect';
import { PROVIDER_INFO, PROVIDERS, useHealth } from '../health/store';
import type { ProviderId } from '../health/types';
import { ago, useNow } from '../components';
import { Icon } from '../icons';
import { STAGGER } from '../motion';
import { Text } from '../text';
import { colors } from '../theme';
import { Btn, Card, Field, Muted, Page, Row, TopBar } from '../ui';

export function Connections({ onClose, embedded }: { onClose: () => void; embedded?: boolean }) {
  const st = useHealth();
  const now = useNow();
  const [avail, setAvail] = useState<Partial<Record<ProviderId, { ok: boolean; reason?: string }>>>({});
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [msg, setMsg] = useState<Partial<Record<ProviderId, string>>>({});
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Partial<Record<ProviderId, string>>>({});
  useEffect(() => {
    (Object.keys(PROVIDERS) as ProviderId[]).forEach((id) => PROVIDERS[id].available().then((a) => setAvail((s) => ({ ...s, [id]: a }))).catch(() => undefined));
  }, [st.fitbitClientId]);

  const connect = async (id: ProviderId) => {
    setBusy(id); setMsg((m) => ({ ...m, [id]: '' }));
    const r = await st.connect(id);
    if (!r.ok) setMsg((m) => ({ ...m, [id]: r.reason ?? 'Could not connect.' }));
    else setDone((m) => ({ ...m, [id]: r.days ? `Connected. Imported ${r.days} day${r.days === 1 ? '' : 's'} of data.` : 'Connected, but no data was found yet. Check that your tracker app syncs to this source, then tap Sync now.' }));
    setBusy(null);
  };
  const order: ProviderId[] = Platform.OS === 'ios' ? ['appleHealth', 'fitbit', 'healthConnect'] : Platform.OS === 'android' ? ['healthConnect', 'fitbit', 'appleHealth'] : ['fitbit', 'healthConnect', 'appleHealth'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!embedded && <TopBar title="Health connections" onBack={onClose} />}
      <Page>
        <Muted style={{ marginBottom: 14, color: colors.text }}>Health data is read on this device only. It is not uploaded to your Avelune server or shared with your partner.</Muted>
        {order.map((id, i) => {
          const info = PROVIDER_INFO[id];
          const c = st.connections[id];
          const a = avail[id];
          return (
            <Reanimated.View key={id} entering={FadeInDown.delay(i * STAGGER * 2).springify().damping(18)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Icon name={info.icon} size={26} color={colors.heading} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.heading }}>{info.name}</Text>
                    <Text style={{ fontSize: 14, color: c ? colors.fertile : colors.muted, fontWeight: '600' }}>
                      {c ? `Connected${c.lastSync ? ` · synced ${ago(c.lastSync, now)}` : ''}` : a && !a.ok ? 'Not available here' : 'Not connected'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, color: colors.text, marginTop: 10, lineHeight: 21 }}>{info.detail}</Text>
                {id === 'fitbit' && !c && (
                  <View style={{ marginTop: 12 }}>
                    <Field label="Fitbit app Client ID" value={st.fitbitClientId} onChangeText={st.setFitbitClientId} placeholder="e.g. 23ABCD" autoCorrect={false} />
                    <Muted style={{ color: colors.text }}>Create a free “Client” app at dev.fitbit.com and set its redirect URL to:</Muted>
                    <Text selectable style={{ fontSize: 13, color: colors.heading, marginVertical: 6 }}>{fitbitRedirectUri()}</Text>
                    <Btn kind="ghost" icon={copied ? 'check' : 'content-copy'} title={copied ? 'Copied' : 'Copy redirect URL'} onPress={() => { void Clipboard.setStringAsync(fitbitRedirectUri()); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
                  </View>
                )}
                {a && !a.ok && !c ? <Muted style={{ marginTop: 8, color: colors.text }}>{a.reason}</Muted> : null}
                {c?.error ? <Muted style={{ marginTop: 8, color: colors.danger }}>Last sync failed: {c.error}</Muted> : null}
                {msg[id] ? <Muted style={{ marginTop: 8, color: colors.danger }}>{msg[id]}</Muted> : null}
                {done[id] ? <Muted style={{ marginTop: 8, color: colors.fertile }}>{done[id]}</Muted> : null}
                {c ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Btn style={{ flex: 1 }} kind="ghost" icon="refresh" title={st.syncing ? 'Syncing…' : 'Sync now'} disabled={st.syncing} onPress={() => void st.sync()} />
                    <Btn style={{ flex: 1 }} kind="danger" title="Disconnect" onPress={() => void st.disconnect(id)} />
                  </View>
                ) : a?.ok ? (
                  <Btn style={{ marginTop: 10 }} title={busy === id ? 'Connecting…' : `Connect ${info.name}`} disabled={!!busy} onPress={() => void connect(id)} />
                ) : null}
                {id === 'healthConnect' && Platform.OS === 'android' ? <Btn kind="ghost" icon="open-in-new" title={c ? 'Manage Health Connect permissions' : 'Open Health Connect'} onPress={openHealthConnect} /> : null}
              </Card>
            </Reanimated.View>
          );
        })}
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading, marginBottom: 4 }}>Samsung Health and Google</Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 21 }}>
            Samsung Health and Google’s health apps share data through Health Connect on Android. In Samsung Health, turn on Settings → Health Connect, then connect Health Connect above. Google Fit’s old APIs are retired, so Health Connect is the supported route.
          </Text>
        </Card>
        <Card>
          <Row title="Show sample data" subtitle="Preview widgets with clearly-labelled demo values. Never mixed with real data." value={st.sample} onValueChange={st.setSample} />
        </Card>
      </Page>
    </View>
  );
}
