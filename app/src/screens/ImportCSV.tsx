import React, { useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { importDripCsv, importRows, importText, importXmlStream, importZip, isDripCsv, parseCSV, pickSheet, readXlsx, type DateOrder, type ImportResult } from '@avelune/core';
import { CATEGORIES, tagId } from '../catalog';
import { fmtDay } from '../components';
import { useHealth } from '../health/store';
import { Icon } from '../icons';
import { useStore } from '../store';
import { Text } from '../text';
import { colors } from '../theme';
import { Btn, Card, Muted, Row, Segmented } from '../ui';

/** Match a label from someone else's file ("Tender breasts", "tender-breasts", "Yoga") to an Avelune option id. */
const INDEX = (() => {
  const m = { symptoms: new Map<string, string>(), moods: new Map<string, string>(), tags: new Map<string, string>() };
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of CATEGORIES) {
    if (c.field === 'flow') continue;
    const bucket = c.field === 'symptoms' ? m.symptoms : c.field === 'moods' ? m.moods : m.tags;
    for (const o of c.options) {
      const id = tagId(c.id, o.id);
      for (const k of [o.label, o.id, id]) bucket.set(key(k), id);
      if (c.field === 'tags') { m.symptoms.set(key(o.label), id); m.moods.set(key(o.label), id); }
    }
  }
  return { m, key };
})();
/** Words other apps and spreadsheets commonly use for the same thing. */
const SYNONYMS: Record<string, string> = {
  backpain: 'backache', lowerbackpain: 'backache', breasttenderness: 'tenderbreasts', sorebreasts: 'tenderbreasts', cramp: 'cramps', menstrualcramps: 'cramps',
  tired: 'fatigue', tiredness: 'fatigue', exhausted: 'fatigue', bloated: 'bloating', headaches: 'headache', migraine: 'headache', spots: 'acne', pimples: 'acne',
  sleepless: 'insomnia', cantsleep: 'insomnia', sick: 'nausea', nauseous: 'nausea', stomachache: 'abdominalpain', stomachpain: 'abdominalpain', foodcravings: 'cravings',
  irritable: 'irritated', angry: 'irritated', anxiety: 'anxious', stressed: 'stress', depressed: 'sad', moodswing: 'swings', moodswings: 'swings', energised: 'energetic', energized: 'energetic',
  walk: 'walking', run: 'running', jogging: 'running', swim: 'swimming', bike: 'cycling', workout: 'gym', weights: 'gym', dancing: 'dance',
};
const resolve = (label: string, kind: 'symptoms' | 'moods' | 'tags') => {
  const raw = INDEX.key(label);
  const k = SYNONYMS[raw] ?? SYNONYMS[raw.replace(/s$/, '')] ?? (INDEX.m.symptoms.has(raw.replace(/s$/, '')) ? raw.replace(/s$/, '') : raw);
  return INDEX.m[kind].get(k) ?? INDEX.m.symptoms.get(k) ?? INDEX.m.moods.get(k) ?? INDEX.m.tags.get(k) ?? null;
};

/** Fast standard-base64 → bytes (expo-file-system returns base64 for binary reads). */
const B64 = new Uint8Array(256).fill(255);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((c, i) => { B64[c.charCodeAt(0)] = i; });
B64['-'.charCodeAt(0)] = 62; B64['_'.charCodeAt(0)] = 63;
function fromBase64(s: string): Uint8Array {
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B64[s.charCodeAt(i)];
    if (v === 255) continue; // padding, whitespace
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; }
  }
  return out.subarray(0, o);
}

/** Random-access reader over a picked file, for streaming very large exports (Apple Health). */
async function chunkReader(asset: DocumentPicker.DocumentPickerAsset): Promise<{ size: number; read: (o: number, l: number) => Promise<Uint8Array> }> {
  if (Platform.OS === 'web') {
    const f: Blob = (asset as unknown as { file?: File }).file ?? (await (await fetch(asset.uri)).blob());
    return { size: f.size, read: async (o, l) => new Uint8Array(await f.slice(o, o + l).arrayBuffer()) };
  }
  const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
  const size = info.exists ? info.size : asset.size ?? 0;
  return { size, read: async (o, l) => fromBase64(await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64, position: o, length: l })) };
}

const MOOD_IDS = new Set(CATEGORIES.find((c) => c.id === 'mood')!.options.map((o) => o.id));
const classify = (id: string): 'symptoms' | 'moods' => (MOOD_IDS.has(id) ? 'moods' : 'symptoms');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TEMPLATE = require('../../assets/avelune-import-template.xlsx');
const TEMPLATE_NAME = 'Avelune example.xlsx';

const isXlsx = (a: DocumentPicker.DocumentPickerAsset) => /\.xlsx$/i.test(a.name) || a.mimeType === XLSX_MIME;

/** Read a picked CSV or Excel file into rows (header first). */
async function readPicked(asset: DocumentPicker.DocumentPickerAsset): Promise<{ rows: string[][]; sheet?: string }> {
  const web = Platform.OS === 'web' ? (asset as unknown as { file?: File }).file : undefined;
  if (isXlsx(asset)) {
    const bytes = Platform.OS === 'web'
      ? new Uint8Array(await (web ?? (await fetch(asset.uri))).arrayBuffer())
      : fromBase64(await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }));
    const sheet = pickSheet(readXlsx(bytes));
    if (!sheet) throw new Error('no sheets found');
    return { rows: sheet.rows, sheet: sheet.name };
  }
  const text = Platform.OS === 'web'
    ? await (web ? web.text() : (await fetch(asset.uri)).text())
    : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return { rows: parseCSV(text) };
}

/** Save the bundled template where the user can open it in Excel, Google Sheets or Numbers. */
async function saveTemplate(): Promise<string> {
  const asset = Asset.fromModule(TEMPLATE);
  await asset.downloadAsync();
  const src = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(src)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = TEMPLATE_NAME; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'Template downloaded.';
  }
  const data = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
  if (Platform.OS === 'android') {
    // Let the user pick a folder (e.g. Downloads) and write the file there.
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return '';
    const uri = await FileSystem.StorageAccessFramework.createFileAsync(perm.directoryUri, TEMPLATE_NAME.replace(/\.xlsx$/, ''), XLSX_MIME);
    await FileSystem.writeAsStringAsync(uri, data, { encoding: FileSystem.EncodingType.Base64 });
    return 'Template saved. Open it in Excel or Google Sheets, fill it in, then import it here.';
  }
  const dest = `${FileSystem.cacheDirectory}${encodeURIComponent(TEMPLATE_NAME)}`;
  await FileSystem.writeAsStringAsync(dest, data, { encoding: FileSystem.EncodingType.Base64 });
  await Share.share({ url: dest, title: TEMPLATE_NAME });
  return '';
}

export function ImportCSV() {
  const st = useStore();
  const importManual = useHealth((s) => s.importManual);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [sheet, setSheet] = useState<string | undefined>();
  const [tplMsg, setTplMsg] = useState('');
  const [name, setName] = useState('');
  const [order, setOrder] = useState<DateOrder>('auto');
  const [overwrite, setOverwrite] = useState(false);
  const [tempUnit, setTempUnit] = useState<'auto' | 'C' | 'F'>('auto');
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const pick = async () => {
    setErr(''); setDone(null);
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', XLSX_MIME, '*/*'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const lower = a.name.toLowerCase();
    const opts = { resolve, classify, weightUnit: st.weightUnit, periodLength: 5 };
    setRows(null); setResult(null); setSheet(undefined); setName(a.name);
    if (/\.avelune$/.test(lower)) return setErr('This is an Avelune backup. Restore it from Settings › Backups.');
    if (/\.(xls|numbers|ods)$/.test(lower)) return setErr('Save the spreadsheet as .xlsx or .csv first, then choose it again.');
    try {
      // Spreadsheets first: an .xlsx is a zip of XML files, and Android reports its type as
      // "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", which must not be mistaken for an export archive.
      if (isXlsx(a)) {
        if ((a.size ?? 0) > 20 * 1024 * 1024) return setErr('That file is larger than 20 MB.');
        const r = await readPicked(a); setRows(r.rows); setSheet(r.sheet); return;
      }
      // Large exports (Apple Health) are streamed in chunks with a progress bar.
      if (/\.(zip|xml)$/.test(lower) || /zip|^(application|text)\/xml$/.test(a.mimeType ?? '')) {
        setProgress(0);
        const r = await chunkReader(a);
        const isZip = /\.zip$/.test(lower) || /zip/.test(a.mimeType ?? '');
        setResult(await (isZip ? importZip : importXmlStream)(r.size, r.read, opts, (p) => setProgress(p)));
        return;
      }
      if ((a.size ?? 0) > 20 * 1024 * 1024) return setErr('That file is larger than 20 MB.');
      const web = Platform.OS === 'web' ? (a as unknown as { file?: File }).file : undefined;
      const text = Platform.OS === 'web' ? await (web ? web.text() : (await fetch(a.uri)).text()) : await FileSystem.readAsStringAsync(a.uri);
      if (/\.(json|cluedata|txt)$/.test(lower) || /^\s*[[{]/.test(text)) setResult(importText(a.name, text, opts));
      else if (isDripCsv(text)) setResult(importDripCsv(text, opts));
      else setRows(parseCSV(text));
    } catch (e) { setErr(`Could not read the file (${(e as Error).message}).`); } finally { setProgress(null); }
  };

  const download = async () => {
    setTplMsg('');
    try { setTplMsg(await saveTemplate()); } catch (e) { setTplMsg(`Could not save the template (${(e as Error).message}).`); }
  };

  const preview: ImportResult | null = result ?? (rows ? importRows(rows, { resolve, classify, dateOrder: order, tempUnit, weightUnit: st.weightUnit, periodLength: 5 }) : null);

  const run = () => {
    if (!preview) return;
    const n = st.importLogs(preview.logs, overwrite);
    if (preview.health.length) importManual(preview.health, preview.healthSource ?? 'manual');
    setDone(`Imported ${n} day${n === 1 ? '' : 's'}${preview.health.length ? ` and ${preview.health.length} days of health data` : ''}.`);
    setRows(null); setResult(null);
  };

  const mapped = preview ? Object.entries(preview.columns).map(([f, i]) => `${preview.header[i as number]} → ${f}`) : [];
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.fertileSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Icon name="file-xls" size={22} color={colors.fertile} />
          </View>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.heading }}>Start with the template</Text>
        </View>
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
          Download the example spreadsheet, fill in one row per day in Excel, Google Sheets or Numbers, then import it below. It includes a filled-in example sheet and a list of the words Avelune understands.
        </Text>
        <Btn kind="ghost" icon="download" title="Download example.xlsx" onPress={() => void download()} style={{ marginTop: 12 }} />
        {tplMsg ? <Muted style={{ marginTop: 4, color: colors.text }} >{tplMsg}</Muted> : null}
      </Card>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.heading, marginBottom: 6 }}>Import a file</Text>
        <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
          Bring your history from another app or a spreadsheet. Everything is read on this device, and you see a preview before anything is saved.
        </Text>
        <View style={{ marginTop: 10, gap: 6 }}>
          {[
            ['Apple Health', 'export.zip from Health › profile › Export All Health Data'],
            ['Flo, Clue', 'the data export file they email you (.json or .zip)'],
            ['Natural Cycles', 'the .zip of CSV files from your data request'],
            ['drip.', 'the CSV from Settings › Data › Export'],
            ['Garmin', 'the .zip from garmin.com › Account › Data Management › Export your data'],
            ['Spreadsheets', 'Excel (.xlsx) or CSV with a date column (use the template above)'],
          ].map(([a, b]) => (
            <Text key={a} style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}><Text style={{ fontWeight: '700' }}>{a}: </Text>{b}</Text>
          ))}
        </View>
        <Btn icon="file-upload-outline" title={rows || result ? 'Choose a different file' : 'Choose a file'} disabled={progress != null} onPress={() => void pick()} style={{ marginTop: 14 }} />
        {progress != null ? (
          <View style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
            <Text style={{ fontSize: 14, color: colors.text, marginBottom: 6 }}>Reading {name}… {Math.round(progress * 100)}%</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.tile, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }} /></View>
          </View>
        ) : null}
        {err ? <Muted style={{ color: colors.danger }}>{err}</Muted> : null}
        {done ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }} accessibilityLiveRegion="polite">
            <Icon name="check-circle" size={22} color={colors.fertile} />
            <Text style={{ marginLeft: 8, fontSize: 15, color: colors.text }}>{done}</Text>
          </View>
        ) : null}
      </Card>

      {preview && (
        <Reanimated.View entering={FadeInDown.springify().damping(18)}>
          <Card>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.heading }}>{name}{sheet ? ` · sheet “${sheet}”` : ''}</Text>
            {preview.source ? <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>Recognised as: {preview.source}</Text> : null}
            <Text style={{ fontSize: 15, color: colors.text, marginTop: 6, lineHeight: 22 }}>
              {preview.rows} rows · {preview.logs.length} days found{preview.periodDays ? ` · ${preview.periodDays} period days` : ''}
              {preview.range ? `\n${fmtDay(preview.range[0])} ${preview.range[0].slice(0, 4)} – ${fmtDay(preview.range[1])} ${preview.range[1].slice(0, 4)}` : ''}
            </Text>
            {mapped.length ? <Muted style={{ marginTop: 8, color: colors.text }}>Columns: {mapped.join(', ')}</Muted> : null}
            {preview.skipped.length ? <Muted style={{ marginTop: 8, color: colors.danger }}>{preview.skipped.length} row(s) skipped, e.g. row {preview.skipped[0].row}: {preview.skipped[0].reason}</Muted> : null}
            {preview.unknownLabels.length ? <Muted style={{ marginTop: 8, color: colors.text }}>Not recognised (left out): {preview.unknownLabels.slice(0, 8).join(', ')}{preview.unknownLabels.length > 8 ? '…' : ''}</Muted> : null}
          </Card>
          <Card>
            {!result ? <>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Dates like 03/04/2026 mean</Text>
            <Segmented options={[['auto', 'Auto'], ['dmy', '3 April'], ['mdy', 'March 4']]} value={order} onChange={setOrder} />
            {order === 'auto' && preview.dateOrder !== 'ambiguous' ? <Muted style={{ marginTop: 6, color: colors.text }}>Detected: {preview.dateOrder === 'mdy' ? 'month first (US style)' : 'day first'}.</Muted> : null}
            {preview.dateOrder === 'ambiguous' && order === 'auto' ? <Muted style={{ marginTop: 8, color: colors.danger }}>This file's dates could be read either way. Pick the right order.</Muted> : null}
            {preview.columns.bbt != null && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Temperature unit</Text>
                <Segmented options={[['auto', 'Auto'], ['C', '°C'], ['F', '°F']]} value={tempUnit} onChange={setTempUnit} />
              </View>
            )}
            </> : null}
            <Row title="Replace my existing entries" subtitle={overwrite ? 'Imported values win on the same day' : 'Keep what I logged; fill gaps and add symptoms'} value={overwrite} onValueChange={setOverwrite} />
          </Card>
          <Btn icon="database-import-outline" title={`Import ${preview.logs.length} days`} disabled={!preview.logs.length && !preview.health.length} onPress={run} />
          <Btn kind="ghost" title="Cancel" onPress={() => { setRows(null); setResult(null); }} />
        </Reanimated.View>
      )}
    </ScrollView>
  );
}
