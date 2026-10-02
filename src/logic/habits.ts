import { weekday, type DateKey } from './dates';
import type { Habit } from './types';

export function isHabitDue(habit: Habit, date: DateKey): boolean {
  if (habit.schedule.kind === 'daily') return true;
  return habit.schedule.days.includes(weekday(date));
}
