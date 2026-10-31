import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Keychain/Keystore on mobile; localStorage on web (readable by scripts on this origin). */
export const secure = {
  get: async (k: string) => { try { return Platform.OS === 'web' ? await AsyncStorage.getItem(k) : await SecureStore.getItemAsync(k); } catch { return null; } },
  set: async (k: string, v: string) => (Platform.OS === 'web' ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY })),
  del: async (k: string) => { try { await (Platform.OS === 'web' ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)); } catch { /* none */ } },
};
