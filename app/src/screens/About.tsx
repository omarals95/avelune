import React, { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeIn, PressScale } from '../anim';
import { MoodBackground } from '../components';
import { Icon } from '../icons';
import { CONTRIBUTE, DONATE, DONATE_URL, HIGHLIGHTS, PRIVACY, REPO_URL, TERMS, TERMS_DATE, WHY, type LegalSection } from '../legal';
import { useStore } from '../store';
import { Text } from '../text';
import { colors, themed } from '../theme';
import { Btn, Card, Muted, Page, Row } from '../ui';
import { Logo } from './Onboarding';

const openRepo = () => void Linking.openURL(REPO_URL).catch(() => undefined);

/**
 * Apple does not allow iOS apps to link to outside payment for donations to the developer,
 * so the donation box is shown on Android and the web only.
 */
export const DONATIONS_SHOWN = Platform.OS !== 'ios';

/** Voluntary donations box (GitHub Sponsors). Optional; unlocks nothing. */
export function DonateBox({ compact }: { compact?: boolean }) {
  if (!DONATIONS_SHOWN) return null;
  return (
    <View style={a.donate} testID="donate-box">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[a.pointIcon, { marginRight: 0, backgroundColor: colors.card }]}><Icon name="hand-heart" size={22} color={colors.primary} /></View>
        <Text style={[a.secT, { flex: 1 }]} accessibilityRole="header">{DONATE.title}</Text>
      </View>
      <Text style={a.p}>{DONATE.body}</Text>
      {compact ? null : <Text style={[a.p, { color: colors.muted }]}>{DONATE.note}</Text>}
      <Btn icon="heart" title={DONATE.button} onPress={() => void Linking.openURL(DONATE_URL).catch(() => undefined)} />
    </View>
  );
}

/** One highlight with its icon (free & open source, privacy, not medical advice, contribute). */
function Point({ icon, title, body }: (typeof HIGHLIGHTS)[number]) {
  return (
    <View style={a.point}>
      <View style={a.pointIcon}><Icon name={icon} size={22} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={a.pointT}>{title}</Text>
        <Text style={a.pointB}>{body}</Text>
      </View>
    </View>
  );
}

/** A full policy document, collapsed to its title until opened. */
function Doc({ title, sections, open: initial = false, testID }: { title: string; sections: LegalSection[]; open?: boolean; testID?: string }) {
  const [open, setOpen] = useState(initial);
  return (
    <View style={a.doc} testID={testID}>
      <PressScale scaleTo={0.98} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={() => setOpen((o) => !o)}>
        <View style={a.docHead}>
          <Icon name="file-text" size={20} color={colors.heading} />
          <Text style={a.docT}>{title}</Text>
          <Icon name={open ? 'minus' : 'plus'} size={20} color={colors.muted} />
        </View>
      </PressScale>
      {open ? (
        <View style={{ paddingTop: 4 }}>
          {sections.map((s) => (
            <View key={s.title} style={{ marginTop: 12 }}>
              <Text style={a.secT} accessibilityRole="header">{s.title}</Text>
              {s.body.map((p, i) => <Text key={i} selectable style={a.p}>{p}</Text>)}
            </View>
          ))}
          <Muted style={{ marginTop: 12 }}>Last updated {TERMS_DATE}.</Muted>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Shown before anything else on first use, and again whenever the terms change (TERMS_VERSION).
 * Nothing is stored or sent until the person agrees.
 */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const accept = useStore((s) => s.acceptTerms);
  return (
    <View style={{ flex: 1 }} testID="welcome-notice">
      <MoodBackground mood="none" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <FadeIn style={{ alignItems: 'center', marginBottom: 18 }}>
          <Logo />
          <Text style={a.h} accessibilityRole="header">Welcome to Avelune</Text>
          <Text style={a.lead}>Before you start, here is what Avelune is and how it treats your data.</Text>
        </FadeIn>
        <FadeIn delay={80}>
          <Card>
            {HIGHLIGHTS.map((h) => <Point key={h.title} {...h} />)}
          </Card>
          <Card>
            <Text style={a.secT}>Why it exists</Text>
            <Text style={a.p}>{WHY}</Text>
            <Text style={[a.p, { marginTop: 8 }]}>If you have the ability to contribute to Avelune and support it for the community, please go ahead. Every bug report, idea and improvement helps.</Text>
            <Btn kind="ghost" icon="github" title="View the project on GitHub" onPress={openRepo} />
          </Card>
          <DonateBox />
          <Card>
            <Doc title="Terms of use" sections={TERMS} testID="terms" />
            <Doc title="Privacy policy" sections={PRIVACY} testID="privacy" />
          </Card>
          <Btn title="I understand and agree" onPress={accept} />
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>By continuing you agree to the terms of use and privacy policy. You can read them again any time in Settings → About Avelune.</Muted>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

/** Settings → About Avelune: the same notice, policies and ways to help. */
export function AboutPage() {
  return (
    <Page>
      <Card>
        {HIGHLIGHTS.slice(0, 3).map((h) => <Point key={h.title} {...h} />)}
      </Card>
      <Card>
        <Text style={a.secT}>Why it exists</Text>
        <Text style={a.p}>{WHY}</Text>
      </Card>
      <Card>
        <Text style={a.secT}>Support the project</Text>
        <Text style={a.p}>If you have the ability to contribute and support Avelune for the community, please go ahead:</Text>
        {CONTRIBUTE.map((c) => (
          <View key={c} style={{ flexDirection: 'row', marginTop: 6 }}>
            <Text style={[a.p, { marginTop: 0, width: 16 }]}>•</Text>
            <Text style={[a.p, { marginTop: 0, flex: 1 }]}>{c}</Text>
          </View>
        ))}
        <Row icon="github" title="Avelune on GitHub" subtitle="Source code, issues and how to contribute" onPress={openRepo} />
      </Card>
      <DonateBox />
      <Card>
        <Doc title="Terms of use" sections={TERMS} />
        <Doc title="Privacy policy" sections={PRIVACY} />
      </Card>
      <Muted style={{ textAlign: 'center' }}>Free and open source under the MIT License. Not affiliated with any other tracking app.</Muted>
    </Page>
  );
}

const a = themed(() => StyleSheet.create({
  h: { fontSize: 24, fontWeight: '700', color: colors.heading, textAlign: 'center', marginTop: 16 },
  lead: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 23, maxWidth: 360 },
  point: { flexDirection: 'row', paddingVertical: 10 },
  pointIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  pointT: { fontSize: 16, fontWeight: '700', color: colors.heading },
  pointB: { fontSize: 15, color: colors.text, marginTop: 3, lineHeight: 21 },
  secT: { fontSize: 16, fontWeight: '700', color: colors.heading },
  p: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 6 },
  doc: { paddingVertical: 4 },
  donate: { borderRadius: 24, padding: 18, marginBottom: 16, backgroundColor: colors.tile, borderWidth: 1, borderColor: colors.border },
  docHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  docT: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.heading },
}));
