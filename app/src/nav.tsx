import { createContext, useContext } from 'react';
import type { HealthTab } from './widgets';

export type SettingsPage = 'main' | 'appearance' | 'profile' | 'backup' | 'security' | 'meds' | 'report' | 'health' | 'import' | 'cycle' | 'reminders' | 'pregnancy' | 'content' | 'sync' | 'data' | 'units' | 'about';
export type ChartKind = 'cycles' | 'bbt' | 'weight' | 'activity' | 'water' | 'sleep';

export interface Nav {
  openLog: (date: string) => void;
  openCalendar: (edit?: boolean) => void;
  openSettings: (page?: SettingsPage) => void;
  openArticle: (id: string) => void;
  openWeek: (week: number) => void;
  openChart: (k: ChartKind) => void;
  /** Switch to the Health tab, optionally on a section. */
  openHealth: (tab?: HealthTab) => void;
  healthTab?: HealthTab;
  healthKey: number;
  openConnections: () => void;
  /** Show the "Predictions updated" confirmation on the Today circle. */
  celebrate: () => void;
  celebrateKey: number;
}

export const NavContext = createContext<Nav | null>(null);
export function useNav(): Nav {
  const n = useContext(NavContext);
  if (!n) throw new Error('NavContext missing');
  return n;
}

/** Screen to reopen after the theme switch remounts the app. */
export const resume: { settings?: SettingsPage } = {};
