import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { exportMaster, keysFromMaster, type Keys } from '@avelune/core';

const NAME = 'avelune.e2ee.master.v1';
let cached: Keys | null = null;

/**
 * The derived master key is kept in the iOS Keychain / Android Keystore via SecureStore.
 * The web has no equivalent, so it falls back to localStorage (readable by any script on this origin).
 */
export async function loadKeys(): Promise<Keys | null> {
  if (cached) return cached;
  try {
    const v = Platform.OS === 'web' ? await AsyncStorage.getItem(NAME) : await SecureStore.getItemAsync(NAME);
    cached = v ? keysFromMaster(v) : null;
  } catch { cached = null; }
  return cached;
}

export async function saveKeys(k: Keys): Promise<void> {
  cached = k;
  const v = exportMaster(k);
  if (Platform.OS === 'web') await AsyncStorage.setItem(NAME, v);
  else await SecureStore.setItemAsync(NAME, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}

export async function clearKeys(): Promise<void> {
  cached = null;
  try {
    if (Platform.OS === 'web') await AsyncStorage.removeItem(NAME);
    else await SecureStore.deleteItemAsync(NAME);
  } catch { /* nothing stored */ }
}

export const hasKeys = () => cached !== null;
