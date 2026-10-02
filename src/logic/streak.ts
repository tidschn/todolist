import { addDays, weekStart, type DateKey } from './dates';

export interface StreakResult {
  current: number;
  longest: number;
  frozenDays: DateKey[];
  /** Monday of every week whose freeze has been spent. */
  freezeWeeksUsed: DateKey[];
}

export function computeStreak(completionDates: Iterable<DateKey>, today: DateKey): StreakResult {
  const done = new Set(completionDates);
  const sorted = [...done].filter((d) => d <= today).sort();
  if (sorted.length === 0) return { current: 0, longest: 0, frozenDays: [], freezeWeeksUsed: [] };

  let current = 0;
  let longest = 0;
  const frozenDays: DateKey[] = [];
  const usedWeeks = new Set<DateKey>();
  let runFrozen: DateKey[] = []; // frozen days not yet confirmed by a later completion

  for (let day = sorted[0]; day <= today; day = addDays(day, 1)) {
    if (done.has(day)) {
      current += 1;
      longest = Math.max(longest, current);
      frozenDays.push(...runFrozen);
      runFrozen = [];
    } else if (day === today) {
      // today is still open: neither extends nor breaks the streak
    } else if (done.has(addDays(day, -1)) && !usedWeeks.has(weekStart(day))) {
      usedWeeks.add(weekStart(day));
      runFrozen.push(day);
    } else {
      current = 0;
      runFrozen = [];
    }
  }
  frozenDays.push(...runFrozen);
  return { current, longest, frozenDays, freezeWeeksUsed: [...usedWeeks] };
}
