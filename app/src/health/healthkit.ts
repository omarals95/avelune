import { t } from '../i18n';
import type { Provider } from './types';

/** Apple Health only exists on iOS; other platforms get this stub. */
export const healthKit: Provider = {
  id: 'appleHealth',
  available: async () => ({ ok: false, reason: t('Apple Health is only available on iPhone.') }),
  connect: async () => false,
  fetch: async () => [],
};
