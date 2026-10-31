import type { Phase } from '@cyclo/core';

export const colors = {
  bg: '#F3F3F6',
  card: '#FFFFFF',
  text: '#1D1B24',
  muted: '#7B7687',
  faint: '#B9B5C2',
  border: '#E8E5ED',
  primary: '#EF4F6E',
  primaryDark: '#D63D5C',
  primarySoft: '#FDE4E9',
  period: '#EF4F6E',
  fertile: '#159E99',
  fertileSoft: '#D6F0EE',
  predictedSoft: '#FBC9D4',
  ovulation: '#159E99',
  today: '#4B5268',
  danger: '#C62828',
  white: '#FFFFFF',
  pregnancy: '#E9875A',
};

export const radius = { card: 22, chip: 999, tile: 18 };

export type Mood = Phase | 'late' | 'none' | 'pregnancy';

/** Background gradient per phase; animated cross-fades between them. */
export const phaseGradient: Record<Mood, [string, string, string]> = {
  menstrual: ['#FFD9E1', '#FFE9EE', '#FFF6F8'],
  follicular: ['#DDE4F6', '#E9EDF9', '#F5F7FD'],
  ovulation: ['#C9EEEA', '#DFF5F3', '#F2FBFA'],
  luteal: ['#E7DDF6', '#F0E9FA', '#F8F5FD'],
  late: ['#D7DAE6', '#E5E7EF', '#F2F3F8'],
  none: ['#E6E3EE', '#EEECF3', '#F7F6FA'],
  pregnancy: ['#F8C7AE', '#FBDCCB', '#FDEFE6'],
};

export const blobColor: Record<Mood, string> = {
  menstrual: '#FFC2CF', follicular: '#C8D3F1', ovulation: '#ABE3DD', luteal: '#D7C6F1', late: '#C3C7D8', none: '#D8D4E4', pregnancy: '#F5B08D',
};

export const shadow = {
  shadowColor: '#3A2E4D', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 3,
};
