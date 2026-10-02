import { isDateKey } from '../logic/dates';
import type { AppState, Completion, Difficulty, Habit, Redemption, Reward, Schedule, Task } from '../logic/types';

export const CURRENT_VERSION = 1;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDifficulty = (v: unknown): v is Difficulty => v === 'easy' || v === 'medium' || v === 'hard';
const isPoints = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isCost = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;

/** Future schema changes: add `MIGRATIONS[n] = (old) => ({ ...old, version: n + 1, ... })`. */
const MIGRATIONS: Record<number, (old: Obj) => Obj> = {};

export function migrate(raw: unknown): Obj | null {
  if (!isObj(raw) || typeof raw.version !== 'number') return null;
  let cur: Obj = raw;
  while (cur.version !== CURRENT_VERSION) {
    const from = cur.version;
    const step = typeof from === 'number' ? MIGRATIONS[from] : undefined;
    if (!step) return null; // unknown or newer version
    cur = step(cur);
    if (cur.version === from) return null; // a migration must bump the version
  }
  return cur;
}

function parseSchedule(v: unknown): Schedule | null {
  if (!isObj(v)) return null;
  if (v.kind === 'daily') return { kind: 'daily' };
  if (v.kind === 'weekdays' && Array.isArray(v.days) && v.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return { kind: 'weekdays', days: v.days as number[] };
  }
  return null;
}

function parseTask(v: unknown): Task | null {
  if (!isObj(v) || !isId(v.id) || typeof v.title !== 'string' || !isDifficulty(v.difficulty)) return null;
  const due = v.dueDate; // optional: an unusable value is dropped rather than rejecting the whole document
  const task: Task = { id: v.id, title: v.title, difficulty: v.difficulty };
  if (isDateKey(due)) task.dueDate = due;
  return task;
}

function parseHabit(v: unknown): Habit | null {
  if (!isObj(v) || !isId(v.id) || typeof v.title !== 'string' || !isDifficulty(v.difficulty)) return null;
  const schedule = parseSchedule(v.schedule);
  return schedule ? { id: v.id, title: v.title, difficulty: v.difficulty, schedule } : null;
}

function parseCompletion(v: unknown): Completion | null {
  if (!isObj(v) || !isId(v.itemId) || (v.itemType !== 'task' && v.itemType !== 'habit')) return null;
  if (!isDateKey(v.date) || !isPoints(v.points)) return null;
  return { itemId: v.itemId, itemType: v.itemType, date: v.date, points: v.points };
}

function parseReward(v: unknown): Reward | null {
  if (!isObj(v) || !isId(v.id) || typeof v.name !== 'string' || !isCost(v.cost)) return null;
  return { id: v.id, name: v.name, cost: v.cost };
}

function parseRedemption(v: unknown): Redemption | null {
  if (!isObj(v) || !isId(v.rewardId) || typeof v.name !== 'string' || !isDateKey(v.date) || !isCost(v.cost)) return null;
  return { rewardId: v.rewardId, name: v.name, date: v.date, cost: v.cost };
}

function parseList<T>(v: unknown, parse: (x: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

/** Strict: any invalid entry rejects the whole document. */
export function parseState(raw: unknown): AppState | null {
  const m = migrate(raw);
  if (!m) return null;
  const tasks = parseList(m.tasks, parseTask);
  const habits = parseList(m.habits, parseHabit);
  const completions = parseList(m.completions, parseCompletion);
  const rewards = parseList(m.rewards, parseReward);
  const redemptions = parseList(m.redemptions, parseRedemption);
  const badges = parseList(m.badges, (x) => (isId(x) ? x : null));
  if (!tasks || !habits || !completions || !rewards || !redemptions || !badges) return null;
  return { version: CURRENT_VERSION, tasks, habits, completions, rewards, redemptions, badges };
}

export class ImportError extends Error {}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(text: string): AppState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }
  const state = parseState(raw);
  if (!state) throw new ImportError('This file is not a valid Gamified Todo export.');
  return state;
}
