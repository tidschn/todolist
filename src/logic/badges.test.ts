import { describe, it, expect } from 'vitest';
import { BADGES, newlyEarnedBadges } from './badges';

const stats = (o: Partial<{ longestStreak: number; totalCompletions: number; level: number }> = {}) => ({
  longestStreak: 0,
  totalCompletions: 0,
  level: 1,
  ...o,
});

describe('badges', () => {
  it('a brand-new user has earned nothing', () => {
    expect(newlyEarnedBadges(stats(), [])).toEqual([]);
  });
  it('awards First Step on the first completion', () => {
    expect(newlyEarnedBadges(stats({ totalCompletions: 1 }), [])).toEqual(['first-step']);
  });
  it('streak badges unlock exactly at 3, 7, 30 and 100 days', () => {
    expect(newlyEarnedBadges(stats({ longestStreak: 2 }), [])).toEqual([]);
    expect(newlyEarnedBadges(stats({ longestStreak: 3 }), [])).toEqual(['streak-3']);
    expect(newlyEarnedBadges(stats({ longestStreak: 29 }), ['streak-3', 'streak-7'])).toEqual([]);
    expect(newlyEarnedBadges(stats({ longestStreak: 30 }), ['streak-3', 'streak-7'])).toEqual(['streak-30']);
    expect(newlyEarnedBadges(stats({ longestStreak: 100 }), ['streak-3', 'streak-7', 'streak-30'])).toEqual(['streak-100']);
  });
  it('count and level badges unlock at 10 / 100 completions and levels 5 / 10', () => {
    expect(newlyEarnedBadges(stats({ totalCompletions: 10 }), ['first-step'])).toEqual(['ten-done']);
    expect(newlyEarnedBadges(stats({ totalCompletions: 100 }), ['first-step', 'ten-done'])).toEqual(['hundred-done']);
    expect(newlyEarnedBadges(stats({ level: 5 }), [])).toEqual(['level-5']);
    expect(newlyEarnedBadges(stats({ level: 10 }), ['level-5'])).toEqual(['level-10']);
  });
  it('never re-awards a badge already owned', () => {
    expect(newlyEarnedBadges(stats({ totalCompletions: 1 }), ['first-step'])).toEqual([]);
  });
  it('every badge has a unique id, name and goal', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    BADGES.forEach((b) => {
      expect(b.name).not.toBe('');
      expect(b.goal).not.toBe('');
    });
  });
});
