import { describe, it, expect } from 'vitest';
import { isHabitDue } from './habits';
import type { Habit } from './types';

const habit = (schedule: Habit['schedule']): Habit => ({ id: 'h', title: 'Read', difficulty: 'easy', schedule });

describe('isHabitDue', () => {
  it('daily habits are due every day', () => {
    expect(isHabitDue(habit({ kind: 'daily' }), '2026-10-02')).toBe(true);
    expect(isHabitDue(habit({ kind: 'daily' }), '2026-10-03')).toBe(true);
  });
  it('weekday habits are due only on their days (2026-10-02 is Friday = 5)', () => {
    const h = habit({ kind: 'weekdays', days: [1, 3] });
    expect(isHabitDue(h, '2026-10-02')).toBe(false);
    expect(isHabitDue(h, '2026-10-05')).toBe(true); // Monday
    expect(isHabitDue(h, '2026-10-07')).toBe(true); // Wednesday
  });
  it('a weekdays habit with no days is never due', () => {
    expect(isHabitDue(habit({ kind: 'weekdays', days: [] }), '2026-10-05')).toBe(false);
  });
});
