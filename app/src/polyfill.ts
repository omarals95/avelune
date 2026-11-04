// Hermes (React Native) has no crypto.getRandomValues; @noble/* needs it. Must be imported first.
import * as ExpoCrypto from 'expo-crypto';

const g = globalThis as unknown as { crypto?: { getRandomValues?: unknown } };
if (!g.crypto?.getRandomValues) {
  g.crypto = Object.assign(g.crypto ?? {}, { getRandomValues: ExpoCrypto.getRandomValues });
}
