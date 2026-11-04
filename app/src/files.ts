import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bytes → standard base64 (what expo-file-system expects for binary writes). */
export function toBase64(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63] + (i + 1 < b.length ? ALPHA[(n >> 6) & 63] : '=') + (i + 2 < b.length ? ALPHA[n & 63] : '=');
  }
  return out;
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const UTI: Record<string, string> = { [XLSX_MIME]: 'org.openxmlformats.spreadsheetml.sheet', 'application/json': 'public.json' };

/**
 * Save a real file the person can open in other apps:
 *  - web: downloads it;
 *  - Android: asks for a folder (e.g. Downloads) and writes the file there;
 *  - iPhone: opens the share sheet with the file (Save to Files, AirDrop, Mail…).
 * Returns a short message to show, or '' if the person cancelled.
 */
export async function saveFile(name: string, mime: string, data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? null : data;
  if (Platform.OS === 'web') {
    const blob = new Blob([bytes ?? (data as string)], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return `Downloaded ${name}.`;
  }
  const write = (uri: string) => (bytes
    ? FileSystem.writeAsStringAsync(uri, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 })
    : FileSystem.writeAsStringAsync(uri, data as string, { encoding: FileSystem.EncodingType.UTF8 }));
  if (Platform.OS === 'android') {
    const saf = FileSystem.StorageAccessFramework;
    const perm = await saf.requestDirectoryPermissionsAsync();
    if (!perm.granted) return '';
    const uri = await saf.createFileAsync(perm.directoryUri, name.replace(/\.[^.]+$/, ''), mime);
    await write(uri);
    return `Saved ${name}. You can find it in the folder you chose.`;
  }
  const dest = `${FileSystem.cacheDirectory}${name.replace(/[\\/:*?"<>|]/g, '-')}`;
  await write(dest);
  if (!(await Sharing.isAvailableAsync())) return 'Sharing is not available on this device.';
  await Sharing.shareAsync(dest, { mimeType: mime, UTI: UTI[mime], dialogTitle: name });
  return '';
}
