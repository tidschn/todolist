import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { toDateKey, type DateKey } from '../logic/dates';
import { progressStats, type ProgressStats } from '../logic/selectors';
import { reducer, type Action } from '../logic/state';
import type { AppState } from '../logic/types';
import { createLocalStorage, type StateStorage } from '../storage/storage';
import { useToday } from './useToday';

interface AppContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  today: DateKey;
  stats: ProgressStats;
  saveFailed: boolean;
  recovered: boolean;
  dismissRecovered: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

interface ProviderProps {
  children: ReactNode;
  storage?: StateStorage;
  now?: () => Date;
}

export function AppProvider({ children, storage, now }: ProviderProps) {
  const store = useMemo(() => storage ?? createLocalStorage(), [storage]);
  const [initial] = useState(() => store.load());
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [saveFailed, setSaveFailed] = useState(false);
  const [recovered, setRecovered] = useState(initial.notice === 'recovered');
  const today = useToday(now);

  useEffect(() => {
    setSaveFailed(!store.save(state));
  }, [state, store]);

  // Another tab (e.g. the installed app plus a browser tab) saved newer data: adopt it instead of overwriting it later.
  useEffect(
    () => store.subscribe?.((incoming) => dispatch({ type: 'replaceState', state: incoming, today: toDateKey(new Date()) })),
    [store],
  );

  const stats = useMemo(() => progressStats(state, today), [state.completions, state.redemptions, today]);

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, today, stats, saveFailed, recovered, dismissRecovered: () => setRecovered(false) }),
    [state, today, stats, saveFailed, recovered],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
