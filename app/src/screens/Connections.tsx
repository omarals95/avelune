import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { fitbitRedirectUri } from '../health/fitbit';
import { ouraRedirectUri } from '../health/oura';
import { openHealthConnect } from '../health/healthconnect';
import { PROVIDER_INFO, PROVIDERS, useHealth } from '../health/store';
import type { ProviderId } from '../health/types';
import { ago, useNow } from '../components';
import { t, tn } from '../i18n';
import { Icon } from '../icons';
import { STAGGER } from '../motion';
import { Text } from '../text';
import { colors } from '../theme';
import { Btn, Card, Field, Muted, Page, Row, TopBar } from '../ui';

export function Connections({ onClose, embedded, onImport }: { onClose: () => void; embedded?: boolean; onImport?: () => void }) {
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
    if (!r.ok) setMsg((m) => ({ ...m, [id]: r.reason ?? t('Could not connect.') }));
    else setDone((m) => ({ ...m, [id]: r.days ? tn(r.days, 'Connected. Imported {n} day of data.|Connected. Imported {n} days of data.') : t('Connected, but no data was found yet. Check that your tracker app syncs to this source, then tap Sync now.') }));
    setBusy(null);
  };
  const order: ProviderId[] = Platform.OS === 'ios' ? ['appleHealth', 'oura', 'fitbit', 'healthConnect'] : Platform.OS === 'android' ? ['healthConnect', 'oura', 'fitbit', 'appleHealth'] : ['oura', 'fitbit', 'healthConnect', 'appleHealth'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!embedded && <TopBar title={t('Health connections')} onBack={onClose} />}
      <Page>
        <Muted style={{ marginBottom: 14, color: colors.text }}>{t('Health data is read on this device only. It is not uploaded to your Avelune server or shared with your partner.')}</Muted>
        {order.map((id, i) => {
          const info = PROVIDER_INFO[id];
          const c = st.connections[id];
          const a = avail[id];
          return (
            <Reanimated.View key={id} entering={FadeInDown.delay(i * STAGGER * 2).springify().damping(18)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}>
                    <Icon name={info.icon} size={26} color={colors.heading} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.heading }}>{t(info.name)}</Text>
                    <Text style={{ fontSize: 14, color: c ? colors.fertile : colors.muted, fontWeight: '600' }}>
                      {c ? (c.lastSync ? t('Connected · synced {ago}', { ago: ago(c.lastSync, now) }) : t('Connected')) : a && !a.ok ? t('Not available here') : t('Not connected')}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, color: colors.text, marginTop: 10, lineHeight: 21 }}>{t(info.detail)}</Text>
                {id === 'fitbit' && !c && (
                  <View style={{ marginTop: 12 }}>
                    <Field label={t('Fitbit app Client ID')} value={st.fitbitClientId} onChangeText={st.setFitbitClientId} placeholder={t('e.g. 23ABCD')} autoCorrect={false} />
                    <Muted style={{ color: colors.text }}>{t('Create a free “Client” app at dev.fitbit.com and set its redirect URL to:')}</Muted>
                    <Text selectable style={{ fontSize: 13, color: colors.heading, marginVertical: 6 }}>{fitbitRedirectUri()}</Text>
                    <Btn kind="ghost" icon={copied ? 'check' : 'copy'} title={copied ? t('Copied') : t('Copy redirect URL')} onPress={() => { void Clipboard.setStringAsync(fitbitRedirectUri()); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
                  </View>
                )}
                {id === 'oura' && !c && (
                  <View style={{ marginTop: 12 }}>
                    <Field label={t('Oura app Client ID')} value={st.ouraClientId} onChangeText={st.setOuraClientId} placeholder={t('From cloud.ouraring.com › API applications')} autoCorrect={false} />
                    <Muted style={{ color: colors.text }}>{t('Create an API application at cloud.ouraring.com (Oura membership required for most data) and add this redirect URI:')}</Muted>
                    <Text selectable style={{ fontSize: 13, color: colors.heading, marginVertical: 6 }}>{ouraRedirectUri()}</Text>
                    <Btn kind="ghost" icon={copied ? 'check' : 'copy'} title={copied ? t('Copied') : t('Copy redirect URI')} onPress={() => { void Clipboard.setStringAsync(ouraRedirectUri()); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />
                  </View>
                )}
                {a && !a.ok && !c ? <Muted style={{ marginTop: 8, color: colors.text }}>{a.reason}</Muted> : null}
                {c?.error ? <Muted style={{ marginTop: 8, color: colors.danger }}>{t('Last sync failed: {error}', { error: c.error })}</Muted> : null}
                {msg[id] ? <Muted style={{ marginTop: 8, color: colors.danger }}>{msg[id]}</Muted> : null}
                {done[id] ? <Muted style={{ marginTop: 8, color: colors.fertile }}>{done[id]}</Muted> : null}
                {c ? (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <Btn style={{ flex: 1 }} kind="ghost" icon="refresh" title={st.syncing ? t('Syncing…') : t('Sync now')} disabled={st.syncing} onPress={() => void st.sync()} />
                    <Btn style={{ flex: 1 }} kind="danger" title={t('Disconnect')} onPress={() => void st.disconnect(id)} />
                  </View>
                ) : a?.ok ? (
                  <Btn style={{ marginTop: 10 }} title={busy === id ? t('Connecting…') : t('Connect {name}', { name: t(info.name) })} disabled={!!busy} onPress={() => void connect(id)} />
                ) : null}
                {id === 'healthConnect' && Platform.OS === 'android' ? <Btn kind="ghost" icon="open-in-new" title={c ? t('Manage Health Connect permissions') : t('Open Health Connect')} onPress={openHealthConnect} /> : null}
              </Card>
            </Reanimated.View>
          );
        })}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}>
              <Icon name="watch-variant" size={26} color={colors.heading} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.heading }}>Garmin</Text>
          </View>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 21 }}>
            {t('Garmin only offers its live data service to approved companies, so Avelune reads Garmin data in two private ways:')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 21, marginTop: 6 }}>
            <Text style={{ fontWeight: '700' }}>{t('Automatically:')} </Text>
            {Platform.OS === 'ios'
              ? t('in the Garmin Connect app, open More › Settings › Connected Apps › Apple Health and turn sharing on, then connect Apple Health above.')
              : t('in the Garmin Connect app, open More › Settings › Connected Apps › Health Connect (where your Garmin Connect version offers it), then connect Health Connect above.')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 21, marginTop: 6 }}>
            <Text style={{ fontWeight: '700' }}>{t('Full history:')} </Text>{t('request your data at garmin.com › Account › Data Management › Export your data, then import the .zip in Settings › Your data › Import from file. Steps, distance, calories, resting heart rate, sleep and HRV are read on this device.')}
          </Text>
          {onImport ? <Btn kind="ghost" icon="file-upload-outline" title={t('Import a Garmin export')} onPress={onImport} style={{ marginTop: 8 }} /> : null}
        </Card>
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading, marginBottom: 4 }}>{t('Samsung Health and Google')}</Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 21 }}>
            {t('Samsung Health and Google’s health apps share data through Health Connect on Android. In Samsung Health, turn on Settings → Health Connect, then connect Health Connect above. Google Fit’s old APIs are retired, so Health Connect is the supported route.')}
          </Text>
        </Card>
        <Card>
          <Row title={t('Show sample data')} subtitle={t('Preview widgets with clearly-labelled demo values. Never mixed with real data.')} value={st.sample} onValueChange={st.setSample} />
        </Card>
      </Page>
    </View>
  );
}
