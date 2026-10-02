import type { Difficulty } from './types';

export const POINTS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 20 };

const LEVEL_FACTOR = 50;

/** Lifetime points needed to reach `level` (level 1 starts at 0). */
export function pointsForLevel(level: number): number {
  return LEVEL_FACTOR * (level - 1) ** 2;
}

export function levelForPoints(points: number): number {
  return 1 + Math.floor(Math.sqrt(Math.max(0, points) / LEVEL_FACTOR));
}

export interface LevelProgress {
  level: number;
  pointsIntoLevel: number;
  pointsForNext: number;
  fraction: number;
}

export function levelProgress(points: number): LevelProgress {
  const p = Math.max(0, points);
  const level = levelForPoints(p);
  const start = pointsForLevel(level);
  const span = pointsForLevel(level + 1) - start;
  return { level, pointsIntoLevel: p - start, pointsForNext: span, fraction: (p - start) / span };
}
