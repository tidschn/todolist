import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';
import { parseState } from './serialization';

export const STORAGE_KEY = 'gamified-todo:state';
export const BACKUP_KEY = 'gamified-todo:backup';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  state: AppState;
  notice?: 'recovered';
}

export interface StateStorage {
  load(): LoadResult;
  /** Returns false when the write failed (storage full or blocked). */
  save(state: AppState): boolean;
}

function unavailableStore(): KeyValueStore {
  const fail = () => {
    throw new Error('Storage unavailable');
  };
  return { getItem: fail, setItem: fail };
}

function defaultStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return unavailableStore(); // accessing localStorage can throw when site data is blocked
  }
}

function tryParse(text: string): AppState | null {
  try {
    return parseState(JSON.parse(text));
  } catch {
    return null;
  }
}

export function createLocalStorage(kv: KeyValueStore = defaultStore()): StateStorage {
  return {
    load() {
      let text: string | null;
      try {
        text = kv.getItem(STORAGE_KEY);
      } catch {
        return { state: emptyState() };
      }
      if (text === null) return { state: emptyState() };
      const state = tryParse(text);
      if (state) return { state };
      try {
        kv.setItem(BACKUP_KEY, text); // keep the unreadable data so it can be recovered by hand
      } catch {
        /* nothing more we can do */
      }
      return { state: emptyState(), notice: 'recovered' };
    },
    save(state) {
      try {
        kv.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    },
  };
}
