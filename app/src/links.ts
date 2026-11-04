import { Linking } from 'react-native';
import { create } from 'zustand';

/**
 * Incoming avelune:// links. A partner QR code holds "avelune://partner?code=…"; scanning it with the phone's
 * camera opens Avelune, and onboarding picks the code up from here.
 */
interface Links { invite: string | null; take: () => string | null }
export const useLinks = create<Links>((set, get) => ({
  invite: null,
  take: () => { const v = get().invite; set({ invite: null }); return v; },
}));

const handle = (url: string | null) => {
  if (url && /^avelune:\/\/partner\b/i.test(url) && /[?&]code=/.test(url)) useLinks.setState({ invite: url });
};

let started = false;
export function startLinkListener() {
  if (started) return;
  started = true;
  void Linking.getInitialURL().then(handle).catch(() => undefined);
  Linking.addEventListener('url', (e) => handle(e.url));
}
