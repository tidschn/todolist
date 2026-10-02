export interface BadgeStats {
  longestStreak: number;
  totalCompletions: number;
  level: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  goal: string;
  earned: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-step', name: 'First Step', goal: 'Complete your first item', earned: (s) => s.totalCompletions >= 1 },
  { id: 'ten-done', name: 'Getting Going', goal: 'Complete 10 items', earned: (s) => s.totalCompletions >= 10 },
  { id: 'hundred-done', name: 'Centurion', goal: 'Complete 100 items', earned: (s) => s.totalCompletions >= 100 },
  { id: 'streak-3', name: 'Warming Up', goal: 'Reach a 3-day streak', earned: (s) => s.longestStreak >= 3 },
  { id: 'streak-7', name: 'On a Roll', goal: 'Reach a 7-day streak', earned: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', name: 'Unstoppable', goal: 'Reach a 30-day streak', earned: (s) => s.longestStreak >= 30 },
  { id: 'streak-100', name: 'Legend', goal: 'Reach a 100-day streak', earned: (s) => s.longestStreak >= 100 },
  { id: 'level-5', name: 'Level 5', goal: 'Reach level 5', earned: (s) => s.level >= 5 },
  { id: 'level-10', name: 'Level 10', goal: 'Reach level 10', earned: (s) => s.level >= 10 },
];

export function newlyEarnedBadges(stats: BadgeStats, already: string[]): string[] {
  return BADGES.filter((b) => !already.includes(b.id) && b.earned(stats)).map((b) => b.id);
}
