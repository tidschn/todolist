import { beforeEach, describe, it, expect } from 'vitest';
import { BACKUP_KEY, STORAGE_KEY, createLocalStorage, type KeyValueStore } from './storage';
import { emptyState } from '../logic/state';
import { full } from './fixtures';

beforeEach(() => localStorage.clear());

function otherTabWrote(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

describe('subscribe (changes made in another tab)', () => {
  it('delivers a valid state written by another tab', () => {
    const seen: unknown[] = [];
    const off = createLocalStorage(localStorage).subscribe!((s) => seen.push(s));
    otherTabWrote(STORAGE_KEY, JSON.stringify(full));
    expect(seen).toEqual([full]);
    off();
  });

  it('ignores other keys, deletions and unreadable values so local data is never clobbered', () => {
    const seen: unknown[] = [];
    const off = createLocalStorage(localStorage).subscribe!((s) => seen.push(s));
    otherTabWrote('something-else', JSON.stringify(full));
    otherTabWrote(STORAGE_KEY, null);
    otherTabWrote(STORAGE_KEY, '{oops');
    otherTabWrote(STORAGE_KEY, JSON.stringify({ ...full, version: 2 }));
    expect(seen).toEqual([]);
    off();
  });

  it('stops delivering after unsubscribe', () => {
    const seen: unknown[] = [];
    const off = createLocalStorage(localStorage).subscribe!((s) => seen.push(s));
    off();
    otherTabWrote(STORAGE_KEY, JSON.stringify(full));
    expect(seen).toEqual([]);
  });
});

describe('createLocalStorage', () => {
  it('returns an empty state with no notice when nothing is saved', () => {
    expect(createLocalStorage(localStorage).load()).toEqual({ state: emptyState() });
  });

  it('saves and loads a state', () => {
    const store = createLocalStorage(localStorage);
    expect(store.save(full)).toBe(true);
    expect(store.load()).toEqual({ state: full });
  });

  it('recovers from corrupt JSON: starts empty, keeps a backup, leaves the original key alone', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    const result = createLocalStorage(localStorage).load();
    expect(result).toEqual({ state: emptyState(), notice: 'recovered' });
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{oops');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{oops');
  });

  it('recovers from valid JSON of the wrong shape and from a future version', () => {
    for (const bad of ['{"version":1}', JSON.stringify({ ...full, version: 2 })]) {
      localStorage.clear();
      localStorage.setItem(STORAGE_KEY, bad);
      const result = createLocalStorage(localStorage).load();
      expect(result.notice).toBe('recovered');
      expect(localStorage.getItem(BACKUP_KEY)).toBe(bad);
    }
  });

  it('reports a failed save instead of throwing (storage full or blocked)', () => {
    const kv: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(createLocalStorage(kv).save(full)).toBe(false);
  });

  it('survives storage that throws on read', () => {
    const kv: KeyValueStore = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
    expect(createLocalStorage(kv).load()).toEqual({ state: emptyState() });
  });

  it('still loads when the backup write itself fails', () => {
    const kv: KeyValueStore = { getItem: () => '{bad', setItem: () => { throw new Error('full'); } };
    expect(createLocalStorage(kv).load().notice).toBe('recovered');
  });
});
