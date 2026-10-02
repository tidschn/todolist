import { isDateKey, type DateKey } from './dates';
import { newlyEarnedBadges } from './badges';
import { isHabitDue } from './habits';
import { POINTS } from './points';
import { badgeStats, balance } from './selectors';
import type { AppState, Difficulty, Habit, Schedule, Task } from './types';

export type Action =
  | { type: 'addTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'addHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'updateTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'updateHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'deleteTask'; id: string }
  | { type: 'deleteHabit'; id: string }
  | { type: 'toggleTask'; id: string; today: DateKey }
  | { type: 'toggleHabit'; id: string; today: DateKey }
  | { type: 'addReward'; id: string; name: string; cost: number }
  | { type: 'deleteReward'; id: string }
  | { type: 'redeemReward'; id: string; today: DateKey }
  | { type: 'replaceState'; state: AppState; today: DateKey };

const MAX_TEXT = 200;
const clean = (t: string) => t.trim().slice(0, MAX_TEXT);

export function emptyState(): AppState {
  return { version: 1, tasks: [], habits: [], completions: [], rewards: [], redemptions: [], badges: [] };
}

function normalizeSchedule(s: Schedule): Schedule | null {
  if (s.kind === 'daily') return s;
  const days = [...new Set(s.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
  return days.length > 0 ? { kind: 'weekdays', days } : null;
}

function buildTask(id: string, title: string, difficulty: Difficulty, dueDate?: DateKey): Task {
  const task: Task = { id, title, difficulty };
  if (dueDate && isDateKey(dueDate)) task.dueDate = dueDate; // anything else would make the saved file unreadable
  return task;
}

function apply(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'addTask': {
      const title = clean(a.title);
      if (!title) return state;
      return { ...state, tasks: [...state.tasks, buildTask(a.id, title, a.difficulty, a.dueDate)] };
    }
    case 'addHabit': {
      const title = clean(a.title);
      const schedule = normalizeSchedule(a.schedule);
      if (!title || !schedule) return state;
      const habit: Habit = { id: a.id, title, difficulty: a.difficulty, schedule };
      return { ...state, habits: [...state.habits, habit] };
    }
    case 'updateTask': {
      const title = clean(a.title);
      if (!title || !state.tasks.some((t) => t.id === a.id)) return state;
      return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? buildTask(a.id, title, a.difficulty, a.dueDate) : t)) };
    }
    case 'updateHabit': {
      const title = clean(a.title);
      const schedule = normalizeSchedule(a.schedule);
      if (!title || !schedule || !state.habits.some((h) => h.id === a.id)) return state;
      return { ...state, habits: state.habits.map((h) => (h.id === a.id ? { id: a.id, title, difficulty: a.difficulty, schedule } : h)) };
    }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id) };
    case 'deleteHabit':
      return { ...state, habits: state.habits.filter((h) => h.id !== a.id) };
    case 'toggleTask': {
      const task = state.tasks.find((t) => t.id === a.id);
      if (!task) return state;
      const isDone = state.completions.some((c) => c.itemType === 'task' && c.itemId === a.id);
      if (isDone) {
        return { ...state, completions: state.completions.filter((c) => !(c.itemType === 'task' && c.itemId === a.id)) };
      }
      const completion = { itemId: a.id, itemType: 'task' as const, date: a.today, points: POINTS[task.difficulty] };
      return { ...state, completions: [...state.completions, completion] };
    }
    case 'toggleHabit': {
      const habit = state.habits.find((h) => h.id === a.id);
      if (!habit) return state;
      const isToday = (c: AppState['completions'][number]) => c.itemType === 'habit' && c.itemId === a.id && c.date === a.today;
      if (state.completions.some(isToday)) {
        return { ...state, completions: state.completions.filter((c) => !isToday(c)) };
      }
      if (!isHabitDue(habit, a.today)) return state;
      const completion = { itemId: a.id, itemType: 'habit' as const, date: a.today, points: POINTS[habit.difficulty] };
      return { ...state, completions: [...state.completions, completion] };
    }
    case 'addReward': {
      const name = clean(a.name);
      if (!name || !Number.isInteger(a.cost) || a.cost < 1) return state;
      return { ...state, rewards: [...state.rewards, { id: a.id, name, cost: a.cost }] };
    }
    case 'deleteReward':
      return { ...state, rewards: state.rewards.filter((r) => r.id !== a.id) };
    case 'redeemReward': {
      const reward = state.rewards.find((r) => r.id === a.id);
      if (!reward || balance(state) < reward.cost) return state;
      const redemption = { rewardId: reward.id, name: reward.name, date: a.today, cost: reward.cost };
      return { ...state, redemptions: [...state.redemptions, redemption] };
    }
    case 'replaceState':
      return a.state;
  }
}

function awardBadges(state: AppState, today: DateKey): AppState {
  const earned = newlyEarnedBadges(badgeStats(state, today), state.badges);
  return earned.length > 0 ? { ...state, badges: [...state.badges, ...earned] } : state;
}

export function reducer(state: AppState, action: Action): AppState {
  const next = apply(state, action);
  if (next === state) return state;
  return 'today' in action ? awardBadges(next, action.today) : next;
}
