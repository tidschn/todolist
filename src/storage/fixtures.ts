import type { AppState } from '../logic/types';

/** A fully populated, valid state used by the storage tests. */
export const full: AppState = {
  version: 1,
  tasks: [{ id: 't1', title: 'A', difficulty: 'easy', dueDate: '2026-10-05' }],
  habits: [{ id: 'h1', title: 'B', difficulty: 'hard', schedule: { kind: 'weekdays', days: [1, 3] } }],
  completions: [{ itemId: 't1', itemType: 'task', date: '2026-10-02', points: 5 }],
  rewards: [{ id: 'r1', name: 'Coffee', cost: 15 }],
  redemptions: [{ rewardId: 'r1', name: 'Coffee', date: '2026-10-02', cost: 15 }],
  badges: ['first-step'],
};
