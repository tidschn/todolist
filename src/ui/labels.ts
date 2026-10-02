import type { Difficulty, Schedule } from '../logic/types';

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function describeSchedule(s: Schedule): string {
  return s.kind === 'daily' ? 'Every day' : s.days.map((d) => DAY_LABELS[d]).join(', ');
}
