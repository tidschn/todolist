import { addDays, weekStart, type DateKey } from './dates';
import type { Completion } from './types';

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  date: DateKey;
  points: number;
  count: number;
  level: HeatLevel;
  frozen: boolean;
  future: boolean;
}

export interface HeatmapData {
  /** Each week has 7 cells, Monday first. */
  weeks: HeatCell[][];
  totalCompletions: number;
}

export function heatLevel(points: number): HeatLevel {
  if (points <= 0) return 0;
  if (points <= 10) return 1;
  if (points <= 30) return 2;
  if (points <= 60) return 3;
  return 4;
}

export function buildHeatmap(completions: Completion[], frozenDays: DateKey[], today: DateKey): HeatmapData {
  const start = weekStart(addDays(today, -364));
  const end = addDays(weekStart(today), 6);

  const byDay = new Map<DateKey, { points: number; count: number }>();
  for (const c of completions) {
    const entry = byDay.get(c.date) ?? { points: 0, count: 0 };
    entry.points += c.points;
    entry.count += 1;
    byDay.set(c.date, entry);
  }
  const frozen = new Set(frozenDays);

  const weeks: HeatCell[][] = [];
  let totalCompletions = 0;
  for (let ws = start; ws <= end; ws = addDays(ws, 7)) {
    const week: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i);
      const future = date > today;
      const entry = future ? undefined : byDay.get(date);
      const points = entry?.points ?? 0;
      const count = entry?.count ?? 0;
      totalCompletions += count;
      week.push({ date, points, count, level: heatLevel(points), frozen: !future && frozen.has(date), future });
    }
    weeks.push(week);
  }
  return { weeks, totalCompletions };
}
