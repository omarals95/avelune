import type { IconName } from './icons';

export type CategoryId = 'flow' | 'sex' | 'mood' | 'symptoms' | 'discharge' | 'tests' | 'pill' | 'other' | 'activity';

export interface Option { id: string; label: string; icon: IconName }
export interface Category {
  id: CategoryId;
  title: string;
  /** Which DayLog array stores this category's ids. */
  field: 'symptoms' | 'moods' | 'tags' | 'flow';
  tint: string;
  ink: string;
  single?: boolean;
  sensitive?: boolean;
  options: Option[];
}

/** Ids stored in `tags` are namespaced "<category>:<id>" so categories never collide. */
export const tagId = (c: CategoryId, id: string) => (c === 'symptoms' || c === 'mood' ? id : `${c}:${id}`);

export const CATEGORIES: Category[] = [
  {
    id: 'flow', title: 'Period flow', field: 'flow', tint: '#F3E3E7', ink: '#A84461', single: true,
    options: [
      { id: '2', label: 'Light', icon: 'water-outline' },
      { id: '3', label: 'Medium', icon: 'water' },
      { id: '4', label: 'Heavy', icon: 'water-plus' },
      { id: '1', label: 'Spotting', icon: 'water-opacity' },
    ],
  },
  {
    id: 'sex', title: 'Sex and sex drive', field: 'tags', tint: '#F6E4EA', ink: '#8E3B5A', sensitive: true,
    options: [
      { id: 'none', label: "Didn't have sex", icon: 'heart-off-outline' },
      { id: 'protected', label: 'Protected sex', icon: 'lock-outline' },
      { id: 'unprotected', label: 'Unprotected sex', icon: 'lock-open-variant-outline' },
      { id: 'solo', label: 'Masturbation', icon: 'heart-pulse' },
      { id: 'high', label: 'High sex drive', icon: 'heart-plus-outline' },
      { id: 'low', label: 'Low sex drive', icon: 'heart-minus-outline' },
    ],
  },
  {
    id: 'mood', title: 'Mood', field: 'moods', tint: '#F8EBD9', ink: '#7E5418',
    options: [
      { id: 'calm', label: 'Calm', icon: 'emoticon-outline' },
      { id: 'happy', label: 'Happy', icon: 'emoticon-happy-outline' },
      { id: 'energetic', label: 'Energetic', icon: 'emoticon-excited-outline' },
      { id: 'playful', label: 'Playful', icon: 'emoticon-tongue-outline' },
      { id: 'swings', label: 'Mood swings', icon: 'swap-vertical' },
      { id: 'irritated', label: 'Irritated', icon: 'emoticon-angry-outline' },
      { id: 'sad', label: 'Sad', icon: 'emoticon-sad-outline' },
      { id: 'anxious', label: 'Anxious', icon: 'emoticon-confused-outline' },
      { id: 'low-energy', label: 'Low energy', icon: 'battery-low' },
      { id: 'apathetic', label: 'Apathetic', icon: 'emoticon-neutral-outline' },
      { id: 'confused', label: 'Confused', icon: 'head-question-outline' },
      { id: 'self-critical', label: 'Self-critical', icon: 'emoticon-frown-outline' },
    ],
  },
  {
    id: 'symptoms', title: 'Symptoms', field: 'symptoms', tint: '#F1E4F3', ink: '#7A4A86',
    options: [
      { id: 'fine', label: 'Everything is fine', icon: 'thumb-up-outline' },
      { id: 'cramps', label: 'Cramps', icon: 'lightning-bolt-outline' },
      { id: 'tender-breasts', label: 'Tender breasts', icon: 'heart-half-full' },
      { id: 'headache', label: 'Headache', icon: 'head-flash-outline' },
      { id: 'acne', label: 'Acne', icon: 'face-woman-outline' },
      { id: 'backache', label: 'Backache', icon: 'human-handsdown' },
      { id: 'fatigue', label: 'Fatigue', icon: 'battery-10' },
      { id: 'cravings', label: 'Cravings', icon: 'food-variant' },
      { id: 'insomnia', label: 'Insomnia', icon: 'weather-night' },
      { id: 'abdominal-pain', label: 'Abdominal pain', icon: 'stomach' },
      { id: 'bloating', label: 'Bloating', icon: 'balloon' },
      { id: 'nausea', label: 'Nausea', icon: 'emoticon-sick-outline' },
      { id: 'sleepiness', label: 'Sleepiness', icon: 'sleep' },
      { id: 'dizziness', label: 'Dizziness', icon: 'rotate-3d-variant' },
      { id: 'frequent-urination', label: 'Frequent urination', icon: 'toilet' },
      { id: 'leg-cramps', label: 'Leg cramps', icon: 'shoe-print' },
      { id: 'swelling', label: 'Swelling', icon: 'arrow-expand-all' },
      { id: 'congestion', label: 'Nasal congestion', icon: 'weather-windy' },
      { id: 'diarrhea', label: 'Diarrhea', icon: 'alert-circle-outline' },
      { id: 'constipation', label: 'Constipation', icon: 'block-helper' },
    ],
  },
  {
    id: 'discharge', title: 'Vaginal discharge', field: 'tags', tint: '#E3EAF3', ink: '#3D5F8A',
    options: [
      { id: 'none', label: 'No discharge', icon: 'cancel' },
      { id: 'creamy', label: 'Creamy', icon: 'water-circle' },
      { id: 'watery', label: 'Watery', icon: 'water-outline' },
      { id: 'sticky', label: 'Sticky', icon: 'water-check-outline' },
      { id: 'egg-white', label: 'Egg white', icon: 'egg-outline' },
      { id: 'spotting', label: 'Spotting', icon: 'water-opacity' },
      { id: 'unusual', label: 'Unusual', icon: 'alert-outline' },
    ],
  },
  {
    id: 'tests', title: 'Tests', field: 'tags', tint: '#DCEDEB', ink: '#2F6A66',
    options: [
      { id: 'ovu-pos', label: 'Ovulation test: positive', icon: 'test-tube' },
      { id: 'ovu-neg', label: 'Ovulation test: negative', icon: 'test-tube-empty' },
      { id: 'preg-pos', label: 'Pregnancy test: positive', icon: 'plus-circle-outline' },
      { id: 'preg-neg', label: 'Pregnancy test: negative', icon: 'minus-circle-outline' },
    ],
  },
  {
    id: 'pill', title: 'Pill', field: 'tags', tint: '#E7E4F5', ink: '#5A4E99', single: true,
    options: [
      { id: 'taken', label: 'Took pill', icon: 'pill' },
      { id: 'missed', label: 'Missed pill', icon: 'close-circle-outline' },
    ],
  },
  {
    id: 'other', title: 'Other', field: 'tags', tint: '#F7E6DA', ink: '#8C4E2B',
    options: [
      { id: 'travel', label: 'Travel', icon: 'map-marker-outline' },
      { id: 'stress', label: 'Stress', icon: 'flash-outline' },
      { id: 'illness', label: 'Disease or injury', icon: 'bandage' },
      { id: 'alcohol', label: 'Alcohol', icon: 'glass-wine' },
      { id: 'medication', label: 'Medication', icon: 'medical-bag' },
    ],
  },
  {
    id: 'activity', title: 'Physical activity', field: 'tags', tint: '#DDE9DF', ink: '#426B53',
    options: [
      { id: 'none', label: "Didn't exercise", icon: 'sofa-outline' },
      { id: 'yoga', label: 'Yoga', icon: 'yoga' },
      { id: 'gym', label: 'Gym', icon: 'dumbbell' },
      { id: 'dance', label: 'Aerobics & dancing', icon: 'music-note-outline' },
      { id: 'swimming', label: 'Swimming', icon: 'swim' },
      { id: 'team', label: 'Team sports', icon: 'basketball' },
      { id: 'running', label: 'Running', icon: 'run' },
      { id: 'cycling', label: 'Cycling', icon: 'bike' },
      { id: 'walking', label: 'Walking', icon: 'walk' },
    ],
  },
];

const BY_ID = new Map<string, { cat: Category; opt: Option }>();
for (const cat of CATEGORIES) for (const opt of cat.options) if (cat.id !== 'flow') BY_ID.set(tagId(cat.id, opt.id), { cat, opt });

export const lookup = (storedId: string) => BY_ID.get(storedId);
export const labelOf = (storedId: string) => BY_ID.get(storedId)?.opt.label ?? storedId;
export const FLOW_LABEL = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];
