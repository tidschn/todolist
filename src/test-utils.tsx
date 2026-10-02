import { render } from '@testing-library/react';
import { AppProvider } from './app/AppContext';
import App from './App';
import { emptyState } from './logic/state';
import type { AppState } from './logic/types';
import type { StateStorage } from './storage/storage';

export const NOW = () => new Date(2026, 9, 2, 12, 0, 0); // Friday 2026-10-02

export function memoryStorage(initial: AppState = emptyState()): StateStorage & { current(): AppState } {
  let current = initial;
  return {
    load: () => ({ state: current }),
    save: (s) => {
      current = s;
      return true;
    },
    current: () => current,
  };
}

export function renderApp(initial: AppState = emptyState()) {
  const storage = memoryStorage(initial);
  const utils = render(
    <AppProvider storage={storage} now={NOW}>
      <App />
    </AppProvider>,
  );
  return { ...utils, storage };
}
