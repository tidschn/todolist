# Gamified Todo App — Design (v1)

## Purpose
A personal, single-user browser app that beats procrastination, builds habits, and makes work/study more fun via streaks, points, levels, badges and self-defined rewards (Duolingo-style feel).

**Success:** the user opens it daily, completes items with one tap, and sees immediate feedback (points, level, streak, heatmap).

## Decisions
| Topic | Decision |
|---|---|
| Platform | Browser web app, installable PWA, works offline |
| Stack | React + Vite + TypeScript, Vitest + React Testing Library |
| Storage | Browser-only (localStorage) behind a swappable storage interface; no accounts or backend |
| Items | One-off tasks + recurring habits (daily or chosen weekdays) |
| Points | Easy 5 / Medium 10 / Hard 20 |
| Streak | Day counts if at least one task/habit completed; one freeze per week |
| Progression | Levels from lifetime points + badges |
| Rewards | User-defined rewards bought with spendable balance |
| Repo | github.com/tidschn/todolist (currently empty), code in repo root |
| Hosting | GitHub Pages via GitHub Action (deploy on push to main) |

## Architecture
1. **Game logic** — pure TypeScript, no UI/storage deps: points, levels, streaks/freezes, badge rules, habit schedules, heatmap bucketing. All date logic takes `today` as a parameter.
2. **Storage** — interface `load()` / `save()`; localStorage implementation. Versioned schema with migrations.
3. **UI** — React components read state and dispatch actions; no game rules in UI.

## Data model
- **Task:** id, title, difficulty, optional dueDate, done.
- **Habit:** id, title, difficulty, schedule (daily | weekdays[]).
- **Completion:** itemId, itemType, date, points (recorded at completion time). Source of truth for heatmap and streak; survives item edits/deletes.
- **Reward:** id, name, cost; **Redemption:** rewardId, date, cost.
- **Progress:** lifetimePoints (drives level, never decreases except un-checking a completion), balance (spendable), currentStreak, longestStreak, freezeUsedThisWeek, badges.

## Rules
- Level N requires about 50·N² lifetime points (tunable).
- Streak: a missed day consumes the weekly freeze if available, else resets to 0. Frozen days are recorded and shown on the heatmap.
- Un-checking a completion removes its points from both lifetimePoints and balance (no point farming); balance may not go below zero from redemption.
- Deleting a habit/task keeps its past completions and points.
- Streak-milestone badges at 3, 7, 30, 100 days; count badges (e.g. 100 tasks done).

## Screens
Mobile bottom tab bar / desktop side nav.
1. **Today** — header (level + progress bar, streak + freeze status, balance), today's habits and open tasks with one-tap complete, "+N" animation, quick-add (title, type, difficulty). Gentle at-risk streak reminder in header (no push notifications).
2. **Habits & Tasks** — add/edit/delete, habit schedules, completed tasks.
3. **Rewards** — create rewards, redeem when balance suffices, redemption history.
4. **Progress** — GitHub-style heatmap, level, badges (locked ones show goal), stats, export/import.

Level-up and new-badge celebration banners.

## Heatmap
Last 12 months; columns = weeks, rows = weekdays; horizontally scrollable on phones starting at the latest week. Shaded by points per day: 0 / 1–10 / 11–30 / 31–60 / 60+. Frozen days have a distinct marker. Tooltip: date, points, items completed. Summary line: completions in last year, current and longest streak.

## Error handling
- Corrupt/invalid saved data: keep a backup copy under a separate key, start empty, show a notice.
- Storage blocked/full: visible warning that changes will not be saved.
- Export/import: JSON download and restore on Progress screen (the backup and device-move path in v1); import validates before replacing data.

## Testing
- Vitest unit tests for game logic: points, levels, streaks/freezes/week boundaries/resets, un-check, redemption limits, heatmap bucketing.
- React Testing Library for core flows: add → complete → points/level update; redeem reward.
- No end-to-end tests in v1.

## Out of scope for v1
Accounts, cloud sync, push notifications, sharing/groups, avatars/themes, all-habits-done bonus (may be added later).
