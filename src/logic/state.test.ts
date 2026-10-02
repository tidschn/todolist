import { describe, it, expect } from 'vitest';
import { emptyState, reducer, type Action } from './state';
import { balance, lifetimePoints, progressStats } from './selectors';
import { levelForPoints } from './points';
import type { AppState, Schedule } from './types';

const T = '2026-10-02'; // Friday
const run = (...actions: Action[]): AppState => actions.reduce(reducer, emptyState());

const addTask = (id = 't1', difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Action => ({
  type: 'addTask', id, title: 'Task ' + id, difficulty,
});
const addHabit = (schedule: Schedule = { kind: 'daily' }, id = 'h1'): Action => ({
  type: 'addHabit', id, title: 'Habit ' + id, difficulty: 'easy', schedule,
});

describe('adding items', () => {
  it('trims titles and stores the item', () => {
    const s = run({ type: 'addTask', id: 't1', title: '  Pay rent ', difficulty: 'hard' });
    expect(s.tasks).toEqual([{ id: 't1', title: 'Pay rent', difficulty: 'hard' }]);
  });
  it('rejects blank and whitespace-only titles (same state object)', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'addTask', id: 't', title: '   ', difficulty: 'easy' })).toBe(s0);
    expect(reducer(s0, { type: 'addHabit', id: 'h', title: '', difficulty: 'easy', schedule: { kind: 'daily' } })).toBe(s0);
  });
  it('caps very long titles at 200 characters', () => {
    const s = run({ type: 'addTask', id: 't', title: 'x'.repeat(500), difficulty: 'easy' });
    expect(s.tasks[0].title).toHaveLength(200);
  });
  it('rejects a weekdays habit with no valid days; dedupes and sorts valid ones', () => {
    const s0 = emptyState();
    expect(reducer(s0, addHabit({ kind: 'weekdays', days: [] }))).toBe(s0);
    expect(reducer(s0, addHabit({ kind: 'weekdays', days: [9, -1] }))).toBe(s0);
    const s = run(addHabit({ kind: 'weekdays', days: [3, 1, 3] }));
    expect(s.habits[0].schedule).toEqual({ kind: 'weekdays', days: [1, 3] });
  });
});

describe('completing tasks', () => {
  it('awards points by difficulty and removes them when un-checked', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(20);
    expect(balance(s)).toBe(20);
    expect(s.completions).toEqual([{ itemId: 't1', itemType: 'task', date: T, points: 20 }]);
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(0);
    expect(s.completions).toEqual([]);
  });
  it('ignores toggling an unknown task', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'toggleTask', id: 'nope', today: T })).toBe(s0);
  });
  it('keeps points when an edit changes difficulty later', () => {
    let s = run(addTask('t1', 'easy'), { type: 'toggleTask', id: 't1', today: T });
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'Renamed', difficulty: 'hard' });
    expect(s.tasks[0]).toMatchObject({ title: 'Renamed', difficulty: 'hard' });
    expect(lifetimePoints(s)).toBe(5);
  });
  it('drops a due date that is not a real calendar date instead of storing it', () => {
    for (const bad of ['20266-10-02', '2026-02-30', 'abc', '0050-10-02']) {
      const s = run({ type: 'addTask', id: 't', title: 'T', difficulty: 'easy', dueDate: bad });
      expect(s.tasks[0].dueDate).toBeUndefined();
    }
    const edited = reducer(run(addTask('t1')), { type: 'updateTask', id: 't1', title: 'T', difficulty: 'easy', dueDate: '2026-13-01' });
    expect(edited.tasks[0].dueDate).toBeUndefined();
  });
  it('updateTask can set and clear the due date', () => {
    let s = run(addTask('t1'));
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'T', difficulty: 'easy', dueDate: '2026-10-09' });
    expect(s.tasks[0].dueDate).toBe('2026-10-09');
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'T', difficulty: 'easy' });
    expect(s.tasks[0].dueDate).toBeUndefined();
  });
});

describe('completing habits', () => {
  it('a due habit can be completed and un-checked for today', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    expect(lifetimePoints(s)).toBe(5);
    s = reducer(s, { type: 'toggleHabit', id: 'h1', today: T });
    expect(s.completions).toEqual([]);
  });
  it('a habit cannot be completed on a day it is not due (Friday vs Mon/Wed)', () => {
    const s = run(addHabit({ kind: 'weekdays', days: [1, 3] }));
    expect(reducer(s, { type: 'toggleHabit', id: 'h1', today: T })).toBe(s);
  });
  it('a completed habit can still be un-checked after its schedule no longer includes today', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    s = reducer(s, { type: 'updateHabit', id: 'h1', title: 'H', difficulty: 'easy', schedule: { kind: 'weekdays', days: [1] } });
    s = reducer(s, { type: 'toggleHabit', id: 'h1', today: T });
    expect(s.completions).toEqual([]);
  });
  it('completions on different days are separate and add up', () => {
    const s = run(
      addHabit(),
      { type: 'toggleHabit', id: 'h1', today: '2026-10-01' },
      { type: 'toggleHabit', id: 'h1', today: T },
    );
    expect(s.completions).toHaveLength(2);
    expect(lifetimePoints(s)).toBe(10);
  });
});

describe('deleting items', () => {
  it('keeps past completions and points', () => {
    let s = run(addTask('t1'), { type: 'toggleTask', id: 't1', today: T });
    s = reducer(s, { type: 'deleteTask', id: 't1' });
    expect(s.tasks).toEqual([]);
    expect(s.completions).toHaveLength(1);
    expect(lifetimePoints(s)).toBe(10);
  });
  it('deleting a habit also keeps completions', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    s = reducer(s, { type: 'deleteHabit', id: 'h1' });
    expect(s.habits).toEqual([]);
    expect(s.completions).toHaveLength(1);
  });
});

describe('rewards', () => {
  const reward = (cost: number): Action => ({ type: 'addReward', id: 'r1', name: 'Coffee', cost });

  it('rejects blank names and costs that are not positive integers', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'addReward', id: 'r', name: ' ', cost: 5 })).toBe(s0);
    for (const cost of [0, -5, 2.5, NaN, Infinity]) expect(reducer(s0, reward(cost))).toBe(s0);
  });
  it('redeeming spends balance but never lifetime points or level', () => {
    const s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    expect(balance(s)).toBe(5);
    expect(lifetimePoints(s)).toBe(20);
    expect(levelForPoints(lifetimePoints(s))).toBe(1);
    expect(s.redemptions).toEqual([{ rewardId: 'r1', name: 'Coffee', date: T, cost: 15 }]);
  });
  it('cannot redeem when the balance is too low (same state object)', () => {
    const s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(25));
    expect(reducer(s, { type: 'redeemReward', id: 'r1', today: T })).toBe(s);
  });
  it('un-checking after redeeming clamps the balance at 0, never negative', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(0);
    expect(balance(s)).toBe(0);
    expect(progressStats(s, T).level.level).toBe(1);
  });
  it('deleting a reward keeps its redemption history', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    s = reducer(s, { type: 'deleteReward', id: 'r1' });
    expect(s.rewards).toEqual([]);
    expect(s.redemptions).toHaveLength(1);
  });
});

describe('badges', () => {
  it('awards First Step on the first completion and never takes it back', () => {
    let s = run(addTask('t1'), { type: 'toggleTask', id: 't1', today: T });
    expect(s.badges).toContain('first-step');
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(s.badges).toContain('first-step');
  });
});

describe('replaceState', () => {
  it('swaps in the imported state and re-evaluates badges', () => {
    const imported: AppState = {
      ...emptyState(),
      completions: [{ itemId: 'x', itemType: 'task', date: T, points: 5 }],
    };
    const s = reducer(emptyState(), { type: 'replaceState', state: imported, today: T });
    expect(s.completions).toHaveLength(1);
    expect(s.badges).toContain('first-step');
  });
});
