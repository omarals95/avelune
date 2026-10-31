import { createContext, useContext } from 'react';

export type SettingsPage = 'main' | 'cycle' | 'reminders' | 'pregnancy' | 'content' | 'sync' | 'data' | 'units';
export type ChartKind = 'cycles' | 'bbt' | 'weight' | 'activity' | 'water' | 'sleep';

export interface Nav {
  openLog: (date: string) => void;
  openCalendar: (edit?: boolean) => void;
  openSettings: (page?: SettingsPage) => void;
  openArticle: (id: string) => void;
  openWeek: (week: number) => void;
  openChart: (k: ChartKind) => void;
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
