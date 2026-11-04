import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { b64decode, b64encode, utf8Decode, utf8Encode } from './e2ee';
import { addDays, diffDays } from './dates';
import { classifyDay, predict, type DayKind, type Phase } from './predict';
import { pregnancyStatus } from './pregnancy';
import { DEFAULT_SHARE_ITEMS, type DateStr, type DayLog, type Settings, type ShareItems } from './types';

/**
 * Partner sharing: the owner encrypts a small read-only snapshot with a random key and uploads it.
 * The invite (server URL + share id + key) is handed to the partner out of band; the server only
 * ever stores ciphertext and cannot read the snapshot or link it to dates.
 */
export interface PartnerSnapshot {
  v: 1;
  name?: string;
  generatedAt: number;
  today: DateStr;
  cycleDay: number | null;
  phase: Phase | null;
  daysUntilPeriod: number | null;
  nextPeriodStart: DateStr | null;
  ovulationDate: DateStr | null;
  fertileWindow: [DateStr, DateStr] | null;
  /** 70 days starting 14 days ago, one char per day: p=period, q=predicted, f=fertile, o=ovulation, .=none */
  days: { from: DateStr; kinds: string };
  pregnancy?: { week: number; day: number; dueDate: DateStr } | null;
  /** Only present when the owner opted in. */
  todayMoods?: string[];
  todaySymptoms?: string[];
  /** Which items the owner shares (absent in snapshots from older versions = everything except mood/symptoms). */
  items?: ShareItems;
}

export interface ShareKey { id: string; key: string }
export interface Invite { url: string; id: string; key: string }

const KIND_CHAR: Record<DayKind, string> = { period: 'p', 'predicted-period': 'q', fertile: 'f', ovulation: 'o', none: '.' };
export const CHAR_KIND: Record<string, DayKind> = { p: 'period', q: 'predicted-period', f: 'fertile', o: 'ovulation', '.': 'none' };

export function buildSnapshot(logs: DayLog[], settings: Settings, today: DateStr, opts: { name?: string; includeLog?: boolean; items?: Partial<ShareItems> } = {}): PartnerSnapshot {
  // Older callers used `includeLog` for mood + symptoms together.
  const items: ShareItems = { ...DEFAULT_SHARE_ITEMS, ...(opts.includeLog ? { moods: true, symptoms: true } : {}), ...opts.items };
  const p = predict(logs, settings, today);
  const map = new Map(logs.map((l) => [l.date, l]));
  const from = addDays(today, -14);
  const fertileOn = items.fertile && settings.showFertileWindow !== false;
  let kinds = '';
  for (let i = 0; i < 70; i++) {
    let k = classifyDay(addDays(from, i), map, p, settings);
    if (!items.period && (k === 'period' || k === 'predicted-period')) k = 'none';
    if (!fertileOn && (k === 'fertile' || k === 'ovulation')) k = 'none';
    kinds += KIND_CHAR[k];
  }
  const t = map.get(today);
  const preg = settings.pregnancyLmp && items.pregnancy ? pregnancyStatus(settings.pregnancyLmp, today) : null;
  return {
    v: 1, name: opts.name?.slice(0, 40) || undefined, generatedAt: Date.now(), today,
    cycleDay: items.phase || items.period ? p.cycleDay : null,
    phase: items.phase ? p.phase : null,
    daysUntilPeriod: items.period ? p.daysUntilPeriod : null,
    nextPeriodStart: items.period ? p.nextPeriodStart : null,
    ovulationDate: fertileOn ? p.ovulationDate : null,
    fertileWindow: fertileOn ? p.fertileWindow : null,
    days: { from, kinds },
    pregnancy: preg && { week: preg.week, day: preg.day, dueDate: preg.dueDate },
    ...(items.moods ? { todayMoods: t?.moods ?? [] } : {}),
    ...(items.symptoms ? { todaySymptoms: t?.symptoms ?? [] } : {}),
    items,
  };
}

/** Kind of `date` according to the snapshot (none outside its 70-day window). */
export function snapshotKind(s: PartnerSnapshot, date: DateStr): DayKind {
  const i = diffDays(s.days.from, date);
  return i >= 0 && i < s.days.kinds.length ? CHAR_KIND[s.days.kinds[i]] ?? 'none' : 'none';
}

export function newShareKey(): ShareKey {
  return { id: b64encode(randomBytes(16)), key: b64encode(randomBytes(32)) };
}

export function sealSnapshot(k: ShareKey, s: PartnerSnapshot): string {
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(b64decode(k.key), nonce, utf8Encode(`share:${k.id}`)).encrypt(utf8Encode(JSON.stringify(s)));
  return `v1.${b64encode(nonce)}.${b64encode(ct)}`;
}

export function openSnapshot(k: ShareKey, blob: string): PartnerSnapshot {
  const [v, n, c, extra] = blob.split('.');
  if (v !== 'v1' || !n || !c || extra !== undefined) throw new Error('bad_blob');
  const s = JSON.parse(utf8Decode(xchacha20poly1305(b64decode(k.key), b64decode(n), utf8Encode(`share:${k.id}`)).decrypt(b64decode(c))));
  if (s?.v !== 1) throw new Error('bad_snapshot');
  return s as PartnerSnapshot;
}

const PREFIX = 'avelune-partner:';
/** Codes created before the rebrand used this prefix; they keep working. */
const LEGACY_PREFIXES = ['cyclo-partner:'];
export const encodeInvite = (i: Invite) => PREFIX + b64encode(utf8Encode(JSON.stringify({ u: i.url, i: i.id, k: i.key })));

/** Link form of an invite, for QR codes: phone cameras open Avelune directly. */
export const inviteLink = (i: Invite) => `avelune://partner?code=${encodeURIComponent(encodeInvite(i))}`;

export function decodeInvite(code: string): Invite {
  let raw = code.trim().replace(/\s+/g, '');
  // Accept the QR link form (avelune://partner?code=…) as well as the bare code.
  const q = /[?&]code=([^&#]+)/.exec(raw);
  if (q) raw = decodeURIComponent(q[1]);
  const prefix = [PREFIX, ...LEGACY_PREFIXES].find((p) => raw.startsWith(p));
  if (!prefix) throw new Error('bad_invite');
  const o = JSON.parse(utf8Decode(b64decode(raw.slice(prefix.length))));
  if (typeof o.u !== 'string' || !/^https?:\/\//.test(o.u) || !/^[A-Za-z0-9_-]{22}$/.test(o.i) || !/^[A-Za-z0-9_-]{43}$/.test(o.k)) throw new Error('bad_invite');
  return { url: o.u, id: o.i, key: o.k };
}
