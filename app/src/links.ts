import { Linking } from 'react-native';
import { create } from 'zustand';

/**
 * Incoming avelune:// links. A partner QR code holds "avelune://partner?code=…"; scanning it with the phone's
 * camera opens Avelune, and onboarding picks the code up from here.
 * "avelune://privacy" (sent when someone taps Avelune's privacy policy in Android's Health Connect) opens
 * Settings → About with the privacy policy expanded.
 */
interface Links { invite: string | null; privacy: boolean; take: () => string | null; takePrivacy: () => boolean }
export const useLinks = create<Links>((set, get) => ({
  invite: null,
  privacy: false,
  take: () => { const v = get().invite; set({ invite: null }); return v; },
  takePrivacy: () => { const v = get().privacy; if (v) set({ privacy: false }); return v; },
}));

const handle = (url: string | null) => {
  if (url && /^avelune:\/\/partner\b/i.test(url) && /[?&]code=/.test(url)) useLinks.setState({ invite: url });
  if (url && /^avelune:\/\/privacy\b/i.test(url)) useLinks.setState({ privacy: true });
};

let started = false;
export function startLinkListener() {
  if (started) return;
  started = true;
  void Linking.getInitialURL().then(handle).catch(() => undefined);
  Linking.addEventListener('url', (e) => handle(e.url));
}
