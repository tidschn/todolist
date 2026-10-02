import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

// 2026-09-28 is a Monday; 2026-10-02 is a Friday; 2026-10-04 a Sunday; 2026-10-05 a Monday.

describe('computeStreak', () => {
  it('a brand-new user has no streak', () => {
    expect(computeStreak([], '2026-10-02')).toEqual({ current: 0, longest: 0, frozenDays: [], freezeWeeksUsed: [] });
  });

  it('counts consecutive days ending today', () => {
    const r = computeStreak(['2026-09-30', '2026-10-01', '2026-10-02'], '2026-10-02');
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it('keeps the streak alive while today is still open', () => {
    expect(computeStreak(['2026-09-30', '2026-10-01'], '2026-10-02').current).toBe(2);
  });

  it('a single missed day is saved by the weekly freeze', () => {
    const r = computeStreak(['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02'], '2026-10-02');
    expect(r.current).toBe(4);
    expect(r.longest).toBe(4);
    expect(r.frozenDays).toEqual(['2026-09-30']);
    expect(r.freezeWeeksUsed).toEqual(['2026-09-28']);
  });

  it('a second miss in the same week resets the streak', () => {
    const r = computeStreak(['2026-09-28', '2026-09-29', '2026-10-01'], '2026-10-04');
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
    expect(r.frozenDays).toEqual(['2026-09-30']);
  });

  it('the freeze renews on a new Monday-start week', () => {
    const r = computeStreak(['2026-10-03', '2026-10-05', '2026-10-07'], '2026-10-07');
    expect(r.current).toBe(3);
    expect(r.frozenDays).toEqual(['2026-10-04', '2026-10-06']);
    expect(r.freezeWeeksUsed).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('two missed days in a row reset even if a freeze is available', () => {
    const r = computeStreak(['2026-09-28', '2026-10-01'], '2026-10-01');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.frozenDays).toEqual([]);
  });

  it('a long gap resets to zero but remembers the longest streak', () => {
    const r = computeStreak(['2026-09-01'], '2026-10-02');
    expect(r.current).toBe(0);
    expect(r.longest).toBe(1);
    expect(r.frozenDays).toEqual([]);
  });

  it('a freeze pending on a still-open today is shown and keeps the streak', () => {
    const r = computeStreak(['2026-09-29', '2026-09-30'], '2026-10-02');
    expect(r.current).toBe(2);
    expect(r.frozenDays).toEqual(['2026-10-01']);
  });

  it('ignores completions dated after today and counts duplicate dates once', () => {
    expect(computeStreak(['2026-10-02', '2026-10-05'], '2026-10-02').current).toBe(1);
    expect(computeStreak(['2026-10-02', '2026-10-02', '2026-10-01'], '2026-10-02').current).toBe(2);
  });

  it('works across year and leap-day boundaries', () => {
    expect(computeStreak(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-01').current).toBe(3);
    expect(computeStreak(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01').current).toBe(3);
  });

  it('works across the US DST change (2026-03-08)', () => {
    expect(computeStreak(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09').current).toBe(3);
  });
});
