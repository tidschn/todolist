import { describe, it, expect } from 'vitest';
import { POINTS, levelForPoints, levelProgress, pointsForLevel } from './points';

describe('POINTS', () => {
  it('is 5 / 10 / 20', () => {
    expect(POINTS).toEqual({ easy: 5, medium: 10, hard: 20 });
  });
});

describe('levels', () => {
  it('level thresholds are 50·(N−1)²', () => {
    expect([1, 2, 3, 4, 5, 10].map(pointsForLevel)).toEqual([0, 50, 200, 450, 800, 4050]);
  });
  it('maps points to levels at the boundaries', () => {
    expect(levelForPoints(0)).toBe(1);
    expect(levelForPoints(49)).toBe(1);
    expect(levelForPoints(50)).toBe(2);
    expect(levelForPoints(199)).toBe(2);
    expect(levelForPoints(200)).toBe(3);
    expect(levelForPoints(4050)).toBe(10);
  });
  it('never goes below level 1 for zero or negative points', () => {
    expect(levelForPoints(-30)).toBe(1);
  });
  it('reports progress inside the current level', () => {
    const p = levelProgress(70); // level 2 spans 50..200
    expect(p.level).toBe(2);
    expect(p.pointsIntoLevel).toBe(20);
    expect(p.pointsForNext).toBe(150);
    expect(p.fraction).toBeCloseTo(20 / 150);
  });
  it('starts a new user at 0 of 50', () => {
    expect(levelProgress(0)).toEqual({ level: 1, pointsIntoLevel: 0, pointsForNext: 50, fraction: 0 });
  });
});
