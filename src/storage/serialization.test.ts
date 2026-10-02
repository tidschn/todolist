import { describe, it, expect } from 'vitest';
import { ImportError, exportState, importState, migrate, parseState } from './serialization';
import { emptyState } from '../logic/state';
import { full } from './fixtures';

describe('parseState', () => {
  it('accepts a valid state, including an empty one', () => {
    expect(parseState(full)).toEqual(full);
    expect(parseState(emptyState())).toEqual(emptyState());
  });
  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hi'],
    ['an empty object', {}],
    ['a missing list', { ...full, tasks: undefined }],
    ['a list that is not an array', { ...full, habits: 'x' }],
    ['a bad difficulty', { ...full, tasks: [{ id: 't', title: 'x', difficulty: 'insane' }] }],
    ['an impossible date', { ...full, completions: [{ itemId: 't', itemType: 'task', date: '2026-02-30', points: 5 }] }],
    ['a negative point value', { ...full, completions: [{ itemId: 't', itemType: 'task', date: '2026-10-02', points: -5 }] }],
    ['a zero reward cost', { ...full, rewards: [{ id: 'r', name: 'x', cost: 0 }] }],
    ['a weekday out of range', { ...full, habits: [{ id: 'h', title: 'x', difficulty: 'easy', schedule: { kind: 'weekdays', days: [9] } }] }],
    ['a future schema version', { ...full, version: 2 }],
    ['a missing version', { ...full, version: undefined }],
  ])('rejects %s', (_label, raw) => {
    expect(parseState(raw)).toBeNull();
  });
});

describe('migrate', () => {
  it('passes the current version through and rejects unknown ones', () => {
    expect(migrate({ version: 1 })).toEqual({ version: 1 });
    expect(migrate({ version: 0 })).toBeNull();
    expect(migrate({ version: 2 })).toBeNull();
    expect(migrate({})).toBeNull();
  });
});

describe('export / import', () => {
  it('round-trips a state', () => {
    expect(importState(exportState(full))).toEqual(full);
  });
  it('throws ImportError for non-JSON and for JSON of the wrong shape', () => {
    expect(() => importState('not json {')).toThrow(ImportError);
    expect(() => importState('null')).toThrow(ImportError);
    expect(() => importState('[]')).toThrow(ImportError);
    expect(() => importState('{}')).toThrow(ImportError);
    expect(() => importState('')).toThrow(ImportError);
  });
});
