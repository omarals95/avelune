import { rtl } from './i18n';
import React from 'react';
import { View } from 'react-native';
import type { IconProps as PhosphorProps, IconWeight } from 'phosphor-react-native';
// Deep imports keep the bundle to the icons actually used (Metro does not tree-shake the barrel file).
import { ArrowCounterClockwise } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { AndroidLogo } from 'phosphor-react-native/src/icons/AndroidLogo';
import { Translate } from 'phosphor-react-native/src/icons/Translate';
import { AppleLogo } from 'phosphor-react-native/src/icons/AppleLogo';
import { ArrowLeft } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRight } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowsClockwise } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { ArrowsDownUp } from 'phosphor-react-native/src/icons/ArrowsDownUp';
import { ArrowsOut } from 'phosphor-react-native/src/icons/ArrowsOut';
import { ArrowSquareOut } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { Baby } from 'phosphor-react-native/src/icons/Baby';
import { Balloon } from 'phosphor-react-native/src/icons/Balloon';
import { Bandaids } from 'phosphor-react-native/src/icons/Bandaids';
import { Barbell } from 'phosphor-react-native/src/icons/Barbell';
import { Basketball } from 'phosphor-react-native/src/icons/Basketball';
import { BatteryLow } from 'phosphor-react-native/src/icons/BatteryLow';
import { Bell } from 'phosphor-react-native/src/icons/Bell';
import { Bicycle } from 'phosphor-react-native/src/icons/Bicycle';
import { BookOpen } from 'phosphor-react-native/src/icons/BookOpen';
import { BracketsCurly } from 'phosphor-react-native/src/icons/BracketsCurly';
import { Brain } from 'phosphor-react-native/src/icons/Brain';
import { CalendarBlank } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CalendarDots } from 'phosphor-react-native/src/icons/CalendarDots';
import { CalendarHeart } from 'phosphor-react-native/src/icons/CalendarHeart';
import { CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { ChartBar } from 'phosphor-react-native/src/icons/ChartBar';
import { ChartDonut } from 'phosphor-react-native/src/icons/ChartDonut';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { CheckCircle } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClipboardText } from 'phosphor-react-native/src/icons/ClipboardText';
import { Waveform } from 'phosphor-react-native/src/icons/Waveform';
import { CircleHalf } from 'phosphor-react-native/src/icons/CircleHalf';
import { CloudCheck } from 'phosphor-react-native/src/icons/CloudCheck';
import { Copy } from 'phosphor-react-native/src/icons/Copy';
import { Couch } from 'phosphor-react-native/src/icons/Couch';
import { DownloadSimple } from 'phosphor-react-native/src/icons/DownloadSimple';
import { Drop } from 'phosphor-react-native/src/icons/Drop';
import { DropHalf } from 'phosphor-react-native/src/icons/DropHalf';
import { DropHalfBottom } from 'phosphor-react-native/src/icons/DropHalfBottom';
import { DropSimple } from 'phosphor-react-native/src/icons/DropSimple';
import { Egg } from 'phosphor-react-native/src/icons/Egg';
import { Export } from 'phosphor-react-native/src/icons/Export';
import { Eye } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlash } from 'phosphor-react-native/src/icons/EyeSlash';
import { FileArrowUp } from 'phosphor-react-native/src/icons/FileArrowUp';
import { FileCsv } from 'phosphor-react-native/src/icons/FileCsv';
import { FileXls } from 'phosphor-react-native/src/icons/FileXls';
import { Fire } from 'phosphor-react-native/src/icons/Fire';
import { FirstAidKit } from 'phosphor-react-native/src/icons/FirstAidKit';
import { Flower } from 'phosphor-react-native/src/icons/Flower';
import { FlowerLotus } from 'phosphor-react-native/src/icons/FlowerLotus';
import { Footprints } from 'phosphor-react-native/src/icons/Footprints';
import { ForkKnife } from 'phosphor-react-native/src/icons/ForkKnife';
import { Gear } from 'phosphor-react-native/src/icons/Gear';
import { Heart } from 'phosphor-react-native/src/icons/Heart';
import { Heartbeat } from 'phosphor-react-native/src/icons/Heartbeat';
import { HeartBreak } from 'phosphor-react-native/src/icons/HeartBreak';
import { HeartHalf } from 'phosphor-react-native/src/icons/HeartHalf';
import { House } from 'phosphor-react-native/src/icons/House';
import { Info } from 'phosphor-react-native/src/icons/Info';
import { Leaf } from 'phosphor-react-native/src/icons/Leaf';
import { Lightbulb } from 'phosphor-react-native/src/icons/Lightbulb';
import { Lightning } from 'phosphor-react-native/src/icons/Lightning';
import { Link } from 'phosphor-react-native/src/icons/Link';
import { LinkBreak } from 'phosphor-react-native/src/icons/LinkBreak';
import { Lock } from 'phosphor-react-native/src/icons/Lock';
import { LockOpen } from 'phosphor-react-native/src/icons/LockOpen';
import { MagnifyingGlass } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPin } from 'phosphor-react-native/src/icons/MapPin';
import { Minus } from 'phosphor-react-native/src/icons/Minus';
import { MinusCircle } from 'phosphor-react-native/src/icons/MinusCircle';
import { Moon } from 'phosphor-react-native/src/icons/Moon';
import { MusicNote } from 'phosphor-react-native/src/icons/MusicNote';
import { Palette } from 'phosphor-react-native/src/icons/Palette';
import { Person } from 'phosphor-react-native/src/icons/Person';
import { PersonSimpleRun } from 'phosphor-react-native/src/icons/PersonSimpleRun';
import { PersonSimpleTaiChi } from 'phosphor-react-native/src/icons/PersonSimpleTaiChi';
import { PersonSimpleWalk } from 'phosphor-react-native/src/icons/PersonSimpleWalk';
import { Pill } from 'phosphor-react-native/src/icons/Pill';
import { Plant } from 'phosphor-react-native/src/icons/Plant';
import { Plus } from 'phosphor-react-native/src/icons/Plus';
import { PlusCircle } from 'phosphor-react-native/src/icons/PlusCircle';
import { Prohibit } from 'phosphor-react-native/src/icons/Prohibit';
import { Question } from 'phosphor-react-native/src/icons/Question';
import { Ruler } from 'phosphor-react-native/src/icons/Ruler';
import { Scales } from 'phosphor-react-native/src/icons/Scales';
import { ShareNetwork } from 'phosphor-react-native/src/icons/ShareNetwork';
import { ShieldCheck } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SignOut } from 'phosphor-react-native/src/icons/SignOut';
import { Smiley } from 'phosphor-react-native/src/icons/Smiley';
import { SmileyAngry } from 'phosphor-react-native/src/icons/SmileyAngry';
import { SmileyBlank } from 'phosphor-react-native/src/icons/SmileyBlank';
import { SmileyMeh } from 'phosphor-react-native/src/icons/SmileyMeh';
import { SmileyNervous } from 'phosphor-react-native/src/icons/SmileyNervous';
import { SmileySad } from 'phosphor-react-native/src/icons/SmileySad';
import { SmileySticker } from 'phosphor-react-native/src/icons/SmileySticker';
import { SmileyWink } from 'phosphor-react-native/src/icons/SmileyWink';
import { SmileyXEyes } from 'phosphor-react-native/src/icons/SmileyXEyes';
import { Sneaker } from 'phosphor-react-native/src/icons/Sneaker';
import { Snowflake } from 'phosphor-react-native/src/icons/Snowflake';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { Spiral } from 'phosphor-react-native/src/icons/Spiral';
import { SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import { Stethoscope } from 'phosphor-react-native/src/icons/Stethoscope';
import { Sun } from 'phosphor-react-native/src/icons/Sun';
import { SwimmingPool } from 'phosphor-react-native/src/icons/SwimmingPool';
import { TestTube } from 'phosphor-react-native/src/icons/TestTube';
import { Thermometer } from 'phosphor-react-native/src/icons/Thermometer';
import { ThumbsUp } from 'phosphor-react-native/src/icons/ThumbsUp';
import { Toilet } from 'phosphor-react-native/src/icons/Toilet';
import { Trash } from 'phosphor-react-native/src/icons/Trash';
import { UploadSimple } from 'phosphor-react-native/src/icons/UploadSimple';
import { UserMinus } from 'phosphor-react-native/src/icons/UserMinus';
import { Users } from 'phosphor-react-native/src/icons/Users';
import { Warning } from 'phosphor-react-native/src/icons/Warning';
import { WarningCircle } from 'phosphor-react-native/src/icons/WarningCircle';
import { Watch } from 'phosphor-react-native/src/icons/Watch';
import { CircleNotch } from 'phosphor-react-native/src/icons/CircleNotch';
import { QrCode } from 'phosphor-react-native/src/icons/QrCode';
import { Scan } from 'phosphor-react-native/src/icons/Scan';
import { FilePdf } from 'phosphor-react-native/src/icons/FilePdf';
import { Fingerprint } from 'phosphor-react-native/src/icons/Fingerprint';
import { Backspace } from 'phosphor-react-native/src/icons/Backspace';
import { Printer } from 'phosphor-react-native/src/icons/Printer';
import { Calendar } from 'phosphor-react-native/src/icons/Calendar';
import { Waves } from 'phosphor-react-native/src/icons/Waves';
import { Wind } from 'phosphor-react-native/src/icons/Wind';
import { Wine } from 'phosphor-react-native/src/icons/Wine';
import { X } from 'phosphor-react-native/src/icons/X';
import { XCircle } from 'phosphor-react-native/src/icons/XCircle';
import { GithubLogo } from 'phosphor-react-native/src/icons/GithubLogo';
import { HandHeart } from 'phosphor-react-native/src/icons/HandHeart';
import { FileText } from 'phosphor-react-native/src/icons/FileText';

type C = React.ComponentType<PhosphorProps>;
type Entry = C | [C, IconWeight];

/**
 * All app icons come from Phosphor (phosphoricons.com). Keys are the app's semantic names
 * (kept from the earlier icon set so data such as stored categories never changes).
 */
const MAP = {
  // navigation & chrome
  home: House, 'home-fill': [House, 'fill'],
  book: BookOpen, 'book-fill': [BookOpen, 'fill'],
  users: Users, 'users-fill': [Users, 'fill'],
  'chart-bar': ChartBar, 'chart-bar-fill': [ChartBar, 'fill'],
  'calendar-month-outline': CalendarBlank, 'calendar-blank-outline': CalendarBlank,
  'calendar-clock': CalendarDots, 'calendar-heart': CalendarHeart,
  translate: Translate,
  'chevron-left': CaretLeft, 'chevron-right': CaretRight,
  'arrow-left': ArrowLeft, 'arrow-right': ArrowRight,
  close: X, 'close-circle-outline': XCircle,
  check: Check, 'check-bold': [Check, 'bold'], 'check-circle': [CheckCircle, 'fill'],
  plus: Plus, minus: Minus, 'plus-circle-outline': PlusCircle, 'minus-circle-outline': MinusCircle,
  magnify: MagnifyingGlass, info: Info, 'cog-outline': Gear, 'open-in-new': ArrowSquareOut,
  'link-variant': Link, 'link-variant-off': LinkBreak, 'share-variant': ShareNetwork, copy: Copy,
  'eye-outline': Eye, 'eye-off-outline': EyeSlash, logout: SignOut, refresh: ArrowsClockwise, undo: ArrowCounterClockwise,
  'view-grid-outline': SquaresFour, palette: Palette, 'theme-light': Sun, 'theme-dark': Moon, 'theme-system': CircleHalf,
  // status
  alert: Warning, 'alert-outline': Warning, 'alert-circle-outline': WarningCircle, cancel: Prohibit, 'block-helper': Prohibit,
  'lock-outline': Lock, 'lock-open-variant-outline': LockOpen, 'shield-lock-outline': ShieldCheck, 'cloud-lock-outline': CloudCheck,
  // settings & data
  'bell-outline': Bell, ruler: Ruler, 'account-remove-outline': UserMinus, 'delete-outline': Trash,
  'database-export-outline': Export, 'database-import-outline': DownloadSimple, 'file-upload-outline': FileArrowUp,
  'file-delimited-outline': FileCsv, 'code-json': BracketsCurly, stethoscope: Stethoscope, upload: UploadSimple,
  android: AndroidLogo, apple: AppleLogo, 'watch-variant': Watch,
  // cycle
  water: [Drop, 'fill'], 'water-outline': Drop, 'water-plus': [DropHalfBottom, 'fill'], 'water-opacity': DropSimple,
  'water-check-outline': DropHalf, 'water-circle': DropHalfBottom, 'water-percent': Drop, 'cup-water': Drop,
  'flower-outline': Flower, 'spa-outline': FlowerLotus, sprout: Plant, leaf: Leaf, sparkle: [Sparkle, 'fill'],
  'chart-donut': ChartDonut, 'lightbulb-on-outline': Lightbulb, 'baby-face-outline': Baby, 'human-pregnant': Baby,
  // health
  'heart-pulse': Heartbeat, 'heart-outline': Heart, heart: [Heart, 'fill'], 'heart-half-full': HeartHalf,
  'heart-off-outline': HeartBreak, 'heart-minus-outline': Snowflake, 'heart-plus-outline': Fire,
  'scale-bathroom': Scales, thermometer: Thermometer, sleep: Moon, 'weather-night': Moon,
  'shoe-print': Footprints, 'shoe-sneaker': Sneaker, run: PersonSimpleRun, walk: PersonSimpleWalk, human: Person, 'human-handsdown': Person,
  // moods
  'emoticon-outline': Smiley, 'emoticon-happy-outline': Smiley, 'emoticon-excited-outline': SmileyWink, 'emoticon-tongue-outline': SmileySticker,
  'emoticon-angry-outline': SmileyAngry, 'emoticon-sad-outline': SmileySad, 'emoticon-confused-outline': SmileyNervous,
  'emoticon-neutral-outline': SmileyMeh, 'emoticon-frown-outline': SmileyBlank, 'emoticon-sick-outline': SmileyXEyes,
  'battery-low': BatteryLow, 'battery-10': BatteryLow, 'head-question-outline': Question, 'swap-vertical': ArrowsDownUp,
  // symptoms & tags
  'thumb-up-outline': ThumbsUp, 'lightning-bolt-outline': Lightning, 'flash-outline': Lightning, 'head-flash-outline': Brain,
  'face-woman-outline': Sparkle, 'food-variant': ForkKnife, stomach: Waves, balloon: Balloon, 'rotate-3d-variant': Spiral,
  toilet: Toilet, 'arrow-expand-all': ArrowsOut, 'weather-windy': Wind, 'egg-outline': Egg, 'test-tube': TestTube,
  'test-tube-empty': [TestTube, 'light'], pill: Pill, 'map-marker-outline': MapPin, bandage: Bandaids, 'glass-wine': Wine,
  'medical-bag': FirstAidKit, 'sofa-outline': Couch, yoga: PersonSimpleTaiChi, dumbbell: Barbell, 'music-note-outline': MusicNote,
  swim: SwimmingPool, basketball: Basketball, bike: Bicycle, 'heart-off': HeartBreak, baby: Baby, symptoms: ClipboardText, ring: CircleNotch, qr: QrCode, scan: Scan, 'file-pdf': FilePdf, fingerprint: Fingerprint, backspace: Backspace, printer: Printer, calendar: Calendar, 'file-xls': FileXls, download: DownloadSimple, waveform: Waveform,
  github: GithubLogo, 'hand-heart': HandHeart, 'file-text': FileText,
} satisfies Record<string, Entry>;

export type IconName = keyof typeof MAP;

export interface IconPropsApp {
  name: IconName;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: PhosphorProps['style'];
}

/**
 * Icons are decorative: the control around them carries the accessible name,
 * so screen readers never announce them.
 */
/** Arrows that point "forward" or "back" mirror in right-to-left layouts. */
const DIRECTIONAL = new Set(['chevron-left', 'chevron-right', 'arrow-left', 'arrow-right']);

export function Icon({ name, size = 24, color, weight, style }: IconPropsApp) {
  const e = (MAP as Record<string, Entry>)[name] ?? Question;
  const [Cmp, w] = Array.isArray(e) ? e : [e, undefined];
  const mirror = rtl && DIRECTIONAL.has(name);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, mirror && { transform: [{ scaleX: -1 }] }]} pointerEvents="none">
      <Cmp size={size} color={color} weight={weight ?? w ?? 'regular'} style={style} />
    </View>
  );
}

/** Icon size tokens. */
export const ICON = { sm: 18, md: 24, lg: 30, xl: 36 };
