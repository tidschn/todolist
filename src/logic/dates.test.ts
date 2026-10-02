import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, isDateKey, toDateKey, weekStart, weekday } from './dates';

describe('toDateKey', () => {
  it('uses local calendar fields, not UTC', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('is not affected by DST transitions (US: 2026-03-08, 2026-11-01)', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
  });
});

describe('daysBetween', () => {
  it('counts calendar days across DST', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-02', '2026-10-02')).toBe(0);
    expect(daysBetween('2026-10-05', '2026-10-02')).toBe(-3);
  });
});

describe('weekday / weekStart', () => {
  it('2026-10-02 is a Friday (5) and its week starts Monday 2026-09-28', () => {
    expect(weekday('2026-10-02')).toBe(5);
    expect(weekStart('2026-10-02')).toBe('2026-09-28');
  });
  it('a Monday is its own week start; a Sunday belongs to the week before', () => {
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
  });
});

describe('isDateKey', () => {
  it('accepts real dates only', () => {
    expect(isDateKey('2026-10-02')).toBe(true);
    expect(isDateKey('2024-02-29')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('2026-1-2')).toBe(false);
    expect(isDateKey(20261002)).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });
});
