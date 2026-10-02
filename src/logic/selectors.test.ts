import { describe, it, expect } from 'vitest';
import { badgeStats, balance, lifetimePoints, progressStats } from './selectors';
import { emptyState } from './state';
import type { AppState, Completion } from './types';

const T = '2026-10-02';
const c = (date: string, points = 10): Completion => ({ itemId: `i-${date}`, itemType: 'task', date, points });
const withCompletions = (...cs: Completion[]): AppState => ({ ...emptyState(), completions: cs });

describe('selectors', () => {
  it('a brand-new user: zero everything, level 1, no risk', () => {
    const p = progressStats(emptyState(), T);
    expect(p.lifetime).toBe(0);
    expect(p.balance).toBe(0);
    expect(p.level.level).toBe(1);
    expect(p.streak.current).toBe(0);
    expect(p.atRisk).toBe(false);
    expect(p.freezeUsedThisWeek).toBe(false);
  });

  it('sums lifetime points and subtracts redemptions for the balance', () => {
    const s: AppState = {
      ...withCompletions(c('2026-10-01', 20), c(T, 10)),
      redemptions: [{ rewardId: 'r', name: 'Coffee', date: T, cost: 12 }],
    };
    expect(lifetimePoints(s)).toBe(30);
    expect(balance(s)).toBe(18);
  });

  it('balance is clamped at zero', () => {
    const s: AppState = { ...emptyState(), redemptions: [{ rewardId: 'r', name: 'x', date: T, cost: 50 }] };
    expect(balance(s)).toBe(0);
  });

  it('streak is at risk when it is running but nothing is done today', () => {
    expect(progressStats(withCompletions(c('2026-10-01')), T).atRisk).toBe(true);
    expect(progressStats(withCompletions(c('2026-10-01'), c(T)), T).atRisk).toBe(false);
  });

  it("reports whether this week's freeze is spent", () => {
    const s = withCompletions(c('2026-09-28'), c('2026-09-29'), c('2026-10-01'), c(T));
    expect(progressStats(s, T).freezeUsedThisWeek).toBe(true);
    expect(progressStats(withCompletions(c('2026-10-01'), c(T)), T).freezeUsedThisWeek).toBe(false);
  });

  it('badgeStats exposes longest streak, completion count and level', () => {
    const s = withCompletions(c('2026-09-30', 70), c('2026-10-01', 70), c(T, 70));
    expect(badgeStats(s, T)).toEqual({ longestStreak: 3, totalCompletions: 3, level: 3 });
  });
});
