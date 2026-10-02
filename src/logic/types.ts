import type { DateKey } from './dates';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Schedule = { kind: 'daily' } | { kind: 'weekdays'; days: number[] }; // days: 0 = Sunday … 6 = Saturday

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  dueDate?: DateKey;
}

export interface Habit {
  id: string;
  title: string;
  difficulty: Difficulty;
  schedule: Schedule;
}

/** Source of truth for points, streaks and the heatmap. Survives edits/deletes of the item. */
export interface Completion {
  itemId: string;
  itemType: 'task' | 'habit';
  date: DateKey;
  points: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface Redemption {
  rewardId: string;
  name: string;
  date: DateKey;
  cost: number;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  habits: Habit[];
  completions: Completion[];
  rewards: Reward[];
  redemptions: Redemption[];
  badges: string[];
}
