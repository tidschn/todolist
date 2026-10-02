import { useEffect, useState } from 'react';
import { toDateKey, type DateKey } from '../logic/dates';

/** The current local date, refreshed every 30s and when the tab becomes visible (handles midnight). */
export function useToday(now: () => Date = () => new Date()): DateKey {
  const [today, setToday] = useState(() => toDateKey(now()));
  useEffect(() => {
    const tick = () => {
      const key = toDateKey(now());
      setToday((prev) => (prev === key ? prev : key));
    };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return today;
}
