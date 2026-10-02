import { describe, it, expect } from 'vitest';
import { buildHeatmap, heatLevel } from './heatmap';
import { weekday } from './dates';
import type { Completion } from './types';

const T = '2026-10-02'; // Friday
const c = (date: string, points: number): Completion => ({ itemId: `i-${date}-${points}`, itemType: 'task', date, points });
const allCells = (h: ReturnType<typeof buildHeatmap>) => h.weeks.flat();

describe('heatLevel', () => {
  it('buckets at 0 / 1–10 / 11–30 / 31–60 / 61+', () => {
    expect([0, 1, 10, 11, 30, 31, 60, 61, 500].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('buildHeatmap', () => {
  it('lays out whole Monday-first weeks from a year ago through the end of this week', () => {
    const h = buildHeatmap([], [], T);
    expect(h.weeks).toHaveLength(53);
    h.weeks.forEach((w) => expect(w).toHaveLength(7));
    expect(weekday(h.weeks[0][0].date)).toBe(1);
    expect(h.weeks[0][0].date).toBe('2025-09-29');
    expect(h.weeks[52][6].date).toBe('2026-10-04');
  });

  it('a brand-new user gets an all-empty heatmap', () => {
    const h = buildHeatmap([], [], T);
    expect(h.totalCompletions).toBe(0);
    expect(allCells(h).every((cell) => cell.level === 0 && !cell.frozen)).toBe(true);
  });

  it('sums points and counts per day and picks the shade', () => {
    const h = buildHeatmap([c(T, 10), c(T, 20), c('2026-10-01', 5)], [], T);
    const today = allCells(h).find((x) => x.date === T)!;
    expect(today).toMatchObject({ points: 30, count: 2, level: 2, future: false });
    const yesterday = allCells(h).find((x) => x.date === '2026-10-01')!;
    expect(yesterday).toMatchObject({ points: 5, count: 1, level: 1 });
    expect(h.totalCompletions).toBe(3);
  });

  it('marks days after today as future and ignores completions dated there', () => {
    const h = buildHeatmap([c('2026-10-03', 20)], [], T);
    const tomorrow = allCells(h).find((x) => x.date === '2026-10-03')!;
    expect(tomorrow).toMatchObject({ future: true, points: 0, level: 0 });
    expect(h.totalCompletions).toBe(0);
  });

  it('flags frozen days', () => {
    const h = buildHeatmap([], ['2026-09-30'], T);
    expect(allCells(h).find((x) => x.date === '2026-09-30')!.frozen).toBe(true);
    expect(allCells(h).filter((x) => x.frozen)).toHaveLength(1);
  });

  it('drops completions older than the window', () => {
    const h = buildHeatmap([c('2025-01-01', 20)], [], T);
    expect(h.totalCompletions).toBe(0);
  });
});
