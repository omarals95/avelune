import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { today } from '@cyclo/core';

export const todayISO = () => today();

/**
 * Today's local calendar date that stays current: it updates at local midnight and whenever the app
 * comes back to the foreground (e.g. after the phone slept over midnight or the time zone changed).
 */
export function useToday(): string {
  const [d, setD] = useState(today);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => { setD(today()); arm(); }, Math.min(next.getTime() - now.getTime(), 6 * 3600 * 1000));
    };
    arm();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setD(today()); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, []);
  return d;
}
