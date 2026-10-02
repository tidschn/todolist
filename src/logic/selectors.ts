import { weekStart, type DateKey } from './dates';
import { levelProgress, type LevelProgress } from './points';
import { computeStreak, type StreakResult } from './streak';
import type { BadgeStats } from './badges';
import type { AppState } from './types';

export const lifetimePoints = (s: AppState): number => s.completions.reduce((n, c) => n + c.points, 0);
export const spentPoints = (s: AppState): number => s.redemptions.reduce((n, r) => n + r.cost, 0);
/** Never negative, even if points were un-checked after spending. */
export const balance = (s: AppState): number => Math.max(0, lifetimePoints(s) - spentPoints(s));

export interface ProgressStats {
  lifetime: number;
  balance: number;
  level: LevelProgress;
  streak: StreakResult;
  totalCompletions: number;
  atRisk: boolean;
  freezeUsedThisWeek: boolean;
}

export function progressStats(s: AppState, today: DateKey): ProgressStats {
  const lifetime = lifetimePoints(s);
  const dates = s.completions.map((c) => c.date);
  const streak = computeStreak(dates, today);
  return {
    lifetime,
    balance: balance(s),
    level: levelProgress(lifetime),
    streak,
    totalCompletions: s.completions.length,
    atRisk: streak.current > 0 && !dates.includes(today),
    freezeUsedThisWeek: streak.freezeWeeksUsed.includes(weekStart(today)),
  };
}

export function badgeStats(s: AppState, today: DateKey): BadgeStats {
  const p = progressStats(s, today);
  return { longestStreak: p.streak.longest, totalCompletions: p.totalCompletions, level: p.level.level };
}
