import type { Provider } from './types';

/** Health Connect is Android-only; other platforms get this stub. */
export const healthConnect: Provider = {
  id: 'healthConnect',
  available: async () => ({ ok: false, reason: 'Health Connect is only available on Android.' }),
  connect: async () => false,
  fetch: async () => [],
};
export const openHealthConnect = () => undefined;
