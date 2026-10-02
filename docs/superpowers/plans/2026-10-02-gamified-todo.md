# Gamified Todo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal, browser-only gamified todo app (tasks + habits, streaks with a weekly freeze, points, levels, badges, custom rewards, a 12-month heatmap, JSON export/import) as an installable PWA hosted on GitHub Pages.

**Architecture:** Pure TypeScript game logic (no UI/storage deps) → a small storage interface with a localStorage implementation → React UI that only reads state and dispatches actions to a single reducer. Lifetime points, balance, level, streak, freezes and heatmap are all *derived* from the `completions` and `redemptions` logs, so they can never drift out of sync.

**Tech Stack:** React 18, Vite 5, TypeScript 5 (strict), Vitest 2 + jsdom, React Testing Library, vite-plugin-pwa, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-02-gamified-todo-design.md`

**Notes on interpreting the spec** (decided here so no task has to guess):
- Spec "Progress" fields (`lifetimePoints`, `balance`, `currentStreak`, `longestStreak`, `freezeUsedThisWeek`) are **derived selectors**, not stored. Only `badges` (so unlocked badges are never lost) is stored.
- Task `done` is derived from "a completion exists for this task".
- "Level N requires about 50·N² points" is implemented as `pointsForLevel(N) = 50·(N−1)²`, so level 1 starts at 0 points (L2=50, L3=200, L4=450, L5=800, L10=4050).
- A streak freeze covers **one** missed day only (the day before must have been completed); two missed days in a row reset the streak. One freeze per Monday-start week.
- `Redemption` also stores the reward `name` so history survives deleting a reward.

## Global Constraints

- Platform: browser web app; PWA installable and works offline. No backend, no accounts, no network calls.
- Stack exactly: React + Vite + TypeScript (strict) ; tests with Vitest + React Testing Library. Node ≥ 20.
- Storage: browser localStorage only, behind the `StateStorage` interface (`load()` / `save()`); schema carries `version: 1`.
- Points: Easy 5 / Medium 10 / Hard 20.
- Streak: a day counts if at least one task or habit was completed; one freeze per week.
- Heatmap: last 12 months; columns = weeks, rows = weekdays; shades by points per day: 0 / 1–10 / 11–30 / 31–60 / 60+; frozen days have a distinct marker.
- Streak-milestone badges at 3, 7, 30, 100 days.
- All date logic takes `today` (a `YYYY-MM-DD` local-time string) as a parameter; never call `new Date()` inside `src/logic`.
- Un-checking a completion removes its points; redemption can never take the balance below zero.
- Deleting a task/habit keeps its past completions and points.
- Repo: `github.com/tidschn/todolist` (empty), code in repo root. Hosting: GitHub Pages via GitHub Action.
- **Never push to GitHub without asking the user first** (Task 10 has an explicit stop).
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: accounts, sync, push notifications, sharing/groups, avatars/themes, all-habits-done bonus.

## Review Focus

Most likely to bite a real user; each has a test in the named task.

1. **Un-check after redeeming** — lifetime drops below spent points; balance must show `0`, never negative, level never below 1. (Task 5)
2. **Date boundaries** — month, year, leap-day and DST (US 2026-03-08) transitions must not skip or repeat a day; week starts Monday. (Tasks 1, 3)
3. **Bad data in or out** — corrupt saved JSON, wrong shape, future `version`, and a malformed import file must never crash the app or replace existing data; corrupt saved data is backed up. (Tasks 6, 9)
4. **Brand-new user / blank input** — no completions: streak 0, empty heatmap, level 1, no badges, no crash; blank or whitespace-only titles and non-positive reward costs are rejected. (Tasks 3, 4, 5, 7, 8)
5. **Schedules and edits** — a weekdays habit with no days is rejected; a habit can't be completed on a non-due day but a completed one can still be un-checked after its schedule changes; edited/deleted items keep their completions. (Task 5)

---

## File Structure

```
.github/workflows/deploy.yml     Pages deploy (Task 10)
index.html, package.json, tsconfig.json, vite.config.ts, .gitignore, README.md
public/icon.svg + generated PWA PNGs (Task 10)
src/main.tsx                      entry
src/App.tsx                       shell: banners, header, active screen, nav, celebrations
src/styles.css                    all styling (mobile-first; side nav ≥ 768px)
src/test-setup.ts, src/test-utils.tsx
src/logic/dates.ts                DateKey helpers (UTC-safe arithmetic, Monday weeks)
src/logic/types.ts                domain types
src/logic/points.ts               POINTS, level math
src/logic/habits.ts               isHabitDue
src/logic/streak.ts               computeStreak (+ freezes)
src/logic/badges.ts               BADGES, newlyEarnedBadges
src/logic/heatmap.ts              heatLevel, buildHeatmap
src/logic/selectors.ts            lifetimePoints, balance, progressStats, badgeStats
src/logic/state.ts                emptyState, Action, reducer
src/storage/serialization.ts      parseState, migrate, exportState, importState
src/storage/storage.ts            StateStorage, createLocalStorage
src/app/AppContext.tsx            provider + useApp()
src/app/useToday.ts               current DateKey, refreshes at midnight
src/app/id.ts                     newId()
src/ui/labels.ts                  labels
src/ui/ItemForm.tsx               add/edit form for tasks & habits
src/ui/Header.tsx, Nav.tsx, Banners.tsx, Celebrations.tsx
src/ui/Today.tsx, Manage.tsx, Rewards.tsx
src/ui/Progress.tsx, Heatmap.tsx, BadgeGrid.tsx, DataTransfer.tsx
```

---

### Task 1: Project scaffold and date helpers

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`
- Create: `src/logic/dates.ts`
- Test: `src/logic/dates.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (`src/logic/dates.ts`):
  - `type DateKey = string` (`'YYYY-MM-DD'`, local time)
  - `toDateKey(d: Date): DateKey`
  - `addDays(key: DateKey, n: number): DateKey`
  - `daysBetween(a: DateKey, b: DateKey): number` (b − a)
  - `weekday(key: DateKey): number` (0 = Sunday … 6 = Saturday)
  - `weekStart(key: DateKey): DateKey` (the Monday of that week)
  - `isDateKey(v: unknown): v is DateKey`

- [ ] **Step 1: Verify tooling and init git**

Run (in `d:\AI\Projects\2dolistapp`):
```bash
node -v && npm -v
git init -b main
git remote add origin https://github.com/tidschn/todolist.git
```
Expected: Node v20 or newer. `git remote -v` shows `origin` (adding a remote does not contact GitHub).

- [ ] **Step 2: Write config files**

`package.json`:
```json
{
  "name": "gamified-todo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`.gitignore`:
```
node_modules
dist
dev-dist
*.local
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gamified Todo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/App.tsx` (temporary shell, replaced in Task 7):
```tsx
export default function App() {
  return <h1>Gamified Todo</h1>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Install and confirm the toolchain runs**

Run: `npm install && npx tsc --noEmit && npx vitest run --passWithNoTests`
Expected: install succeeds, no type errors, vitest reports "No test files found" and exits 0.

- [ ] **Step 4: Write the failing date tests**

`src/logic/dates.test.ts`:
```ts
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
```

- [ ] **Step 5: Run to verify failure**

Run: `npx vitest run src/logic/dates.test.ts`
Expected: FAIL — cannot resolve `./dates`.

- [ ] **Step 6: Implement `src/logic/dates.ts`**

```ts
export type DateKey = string; // 'YYYY-MM-DD' in the user's local time

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// All arithmetic goes through UTC midnight so DST shifts never add or drop a day.
function toUtcMs(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DateKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DateKey, n: number): DateKey {
  return fromUtcMs(toUtcMs(key) + n * DAY_MS);
}

/** Number of days from a to b (b − a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  return new Date(toUtcMs(key)).getUTCDay();
}

/** The Monday of the week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function isDateKey(v: unknown): v is DateKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && fromUtcMs(toUtcMs(v)) === v;
}
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run src/logic/dates.test.ts`
Expected: PASS (all tests).

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src docs
git commit -m "chore: scaffold Vite React TS app with date helpers"
```

---

### Task 2: Domain types, points/levels, habit schedule

**Files:**
- Create: `src/logic/types.ts`, `src/logic/points.ts`, `src/logic/habits.ts`
- Test: `src/logic/points.test.ts`, `src/logic/habits.test.ts`

**Interfaces:**
- Consumes: `DateKey`, `weekday` from `./dates`
- Produces:
  - `src/logic/types.ts`: `Difficulty = 'easy'|'medium'|'hard'`; `Schedule = {kind:'daily'} | {kind:'weekdays'; days:number[]}`; `Task {id; title; difficulty; dueDate?: DateKey}`; `Habit {id; title; difficulty; schedule}`; `Completion {itemId; itemType:'task'|'habit'; date: DateKey; points:number}`; `Reward {id; name; cost}`; `Redemption {rewardId; name; date: DateKey; cost}`; `AppState {version:1; tasks; habits; completions; rewards; redemptions; badges: string[]}`
  - `src/logic/points.ts`: `POINTS: Record<Difficulty, number>`; `pointsForLevel(level: number): number`; `levelForPoints(points: number): number`; `interface LevelProgress {level; pointsIntoLevel; pointsForNext; fraction}`; `levelProgress(points: number): LevelProgress`
  - `src/logic/habits.ts`: `isHabitDue(habit: Habit, date: DateKey): boolean`

- [ ] **Step 1: Write `src/logic/types.ts`**

```ts
import type { DateKey } from './dates';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Schedule = { kind: 'daily' } | { kind: 'weekdays'; days: number[] }; // days: 0 = Sunday … 6 = Saturday

export interface Task {
  id: string;
  title: string;
  difficulty: Difficulty;
  dueDate?: DateKey;
}

export interface Habit {
  id: string;
  title: string;
  difficulty: Difficulty;
  schedule: Schedule;
}

/** Source of truth for points, streaks and the heatmap. Survives edits/deletes of the item. */
export interface Completion {
  itemId: string;
  itemType: 'task' | 'habit';
  date: DateKey;
  points: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface Redemption {
  rewardId: string;
  name: string;
  date: DateKey;
  cost: number;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  habits: Habit[];
  completions: Completion[];
  rewards: Reward[];
  redemptions: Redemption[];
  badges: string[];
}
```

- [ ] **Step 2: Write the failing tests**

`src/logic/points.test.ts`:
```ts
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
```

`src/logic/habits.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isHabitDue } from './habits';
import type { Habit } from './types';

const habit = (schedule: Habit['schedule']): Habit => ({ id: 'h', title: 'Read', difficulty: 'easy', schedule });

describe('isHabitDue', () => {
  it('daily habits are due every day', () => {
    expect(isHabitDue(habit({ kind: 'daily' }), '2026-10-02')).toBe(true);
    expect(isHabitDue(habit({ kind: 'daily' }), '2026-10-03')).toBe(true);
  });
  it('weekday habits are due only on their days (2026-10-02 is Friday = 5)', () => {
    const h = habit({ kind: 'weekdays', days: [1, 3] });
    expect(isHabitDue(h, '2026-10-02')).toBe(false);
    expect(isHabitDue(h, '2026-10-05')).toBe(true); // Monday
    expect(isHabitDue(h, '2026-10-07')).toBe(true); // Wednesday
  });
  it('a weekdays habit with no days is never due', () => {
    expect(isHabitDue(habit({ kind: 'weekdays', days: [] }), '2026-10-05')).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/logic/points.test.ts src/logic/habits.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement**

`src/logic/points.ts`:
```ts
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
```

`src/logic/habits.ts`:
```ts
import { weekday, type DateKey } from './dates';
import type { Habit } from './types';

export function isHabitDue(habit: Habit, date: DateKey): boolean {
  if (habit.schedule.kind === 'daily') return true;
  return habit.schedule.days.includes(weekday(date));
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/logic/points.test.ts src/logic/habits.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/logic
git commit -m "feat: domain types, points, levels and habit schedules"
```

---

### Task 3: Streak with weekly freeze

**Files:**
- Create: `src/logic/streak.ts`
- Test: `src/logic/streak.test.ts`

**Interfaces:**
- Consumes: `addDays`, `weekStart`, `DateKey` from `./dates`
- Produces: `interface StreakResult { current: number; longest: number; frozenDays: DateKey[]; freezeWeeksUsed: DateKey[] }` and `computeStreak(completionDates: Iterable<DateKey>, today: DateKey): StreakResult`. `freezeWeeksUsed` holds the Monday (`weekStart`) of every week whose freeze has been spent.

Rules the implementation must follow:
- Walk every day from the first completion date to `today`. A completed day adds 1.
- `today` with no completion yet neither extends nor breaks the streak (still open).
- A missed day (not today) is *frozen* only if the day before was completed AND that week's freeze is unused. A frozen day keeps the streak but adds nothing.
- Any other missed day resets the streak to 0 and discards pending frozen days of the broken run.
- Frozen days only appear in `frozenDays` once confirmed by a later completion, or if still pending when the walk ends at `today`.
- Completions dated after `today` are ignored; duplicate dates count once.

- [ ] **Step 1: Write the failing tests**

`src/logic/streak.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/logic/streak.test.ts`
Expected: FAIL — cannot resolve `./streak`.

- [ ] **Step 3: Implement `src/logic/streak.ts`**

```ts
import { addDays, weekStart, type DateKey } from './dates';

export interface StreakResult {
  current: number;
  longest: number;
  frozenDays: DateKey[];
  /** Monday of every week whose freeze has been spent. */
  freezeWeeksUsed: DateKey[];
}

export function computeStreak(completionDates: Iterable<DateKey>, today: DateKey): StreakResult {
  const done = new Set(completionDates);
  const sorted = [...done].filter((d) => d <= today).sort();
  if (sorted.length === 0) return { current: 0, longest: 0, frozenDays: [], freezeWeeksUsed: [] };

  let current = 0;
  let longest = 0;
  const frozenDays: DateKey[] = [];
  const usedWeeks = new Set<DateKey>();
  let runFrozen: DateKey[] = []; // frozen days not yet confirmed by a later completion

  for (let day = sorted[0]; day <= today; day = addDays(day, 1)) {
    if (done.has(day)) {
      current += 1;
      longest = Math.max(longest, current);
      frozenDays.push(...runFrozen);
      runFrozen = [];
    } else if (day === today) {
      // today is still open: neither extends nor breaks the streak
    } else if (done.has(addDays(day, -1)) && !usedWeeks.has(weekStart(day))) {
      usedWeeks.add(weekStart(day));
      runFrozen.push(day);
    } else {
      current = 0;
      runFrozen = [];
    }
  }
  frozenDays.push(...runFrozen);
  return { current, longest, frozenDays, freezeWeeksUsed: [...usedWeeks] };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/logic/streak.test.ts && npx tsc --noEmit`
Expected: PASS (12 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/logic/streak.ts src/logic/streak.test.ts
git commit -m "feat: streak calculation with weekly freeze"
```

---

### Task 4: Badges and heatmap

**Files:**
- Create: `src/logic/badges.ts`, `src/logic/heatmap.ts`
- Test: `src/logic/badges.test.ts`, `src/logic/heatmap.test.ts`

**Interfaces:**
- Consumes: `Completion` from `./types`; `addDays`, `weekStart`, `DateKey` from `./dates`
- Produces:
  - `src/logic/badges.ts`: `interface BadgeStats {longestStreak; totalCompletions; level}`; `interface BadgeDef {id; name; goal; earned(s: BadgeStats): boolean}`; `BADGES: BadgeDef[]`; `newlyEarnedBadges(stats: BadgeStats, already: string[]): string[]`
  - `src/logic/heatmap.ts`: `type HeatLevel = 0|1|2|3|4`; `interface HeatCell {date; points; count; level: HeatLevel; frozen; future}`; `interface HeatmapData {weeks: HeatCell[][]; totalCompletions: number}` (each week has 7 cells, Monday first); `heatLevel(points: number): HeatLevel`; `buildHeatmap(completions: Completion[], frozenDays: DateKey[], today: DateKey): HeatmapData`

- [ ] **Step 1: Write the failing tests**

`src/logic/badges.test.ts`:
```ts
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
```

`src/logic/heatmap.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/logic/badges.test.ts src/logic/heatmap.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/logic/badges.ts`:
```ts
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
```

`src/logic/heatmap.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/logic/badges.test.ts src/logic/heatmap.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/logic/badges.ts src/logic/badges.test.ts src/logic/heatmap.ts src/logic/heatmap.test.ts
git commit -m "feat: badge rules and heatmap bucketing"
```

---

### Task 5: Selectors and reducer

**Files:**
- Create: `src/logic/selectors.ts`, `src/logic/state.ts`
- Test: `src/logic/selectors.test.ts`, `src/logic/state.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces:
  - `src/logic/selectors.ts`: `lifetimePoints(s: AppState): number`; `spentPoints(s): number`; `balance(s): number` (clamped ≥ 0); `interface ProgressStats {lifetime; balance; level: LevelProgress; streak: StreakResult; totalCompletions; atRisk: boolean; freezeUsedThisWeek: boolean}`; `progressStats(s: AppState, today: DateKey): ProgressStats`; `badgeStats(s: AppState, today: DateKey): BadgeStats`
  - `src/logic/state.ts`: `emptyState(): AppState`; `type Action` (below); `reducer(state: AppState, action: Action): AppState`

```ts
export type Action =
  | { type: 'addTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'addHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'updateTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'updateHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'deleteTask'; id: string }
  | { type: 'deleteHabit'; id: string }
  | { type: 'toggleTask'; id: string; today: DateKey }
  | { type: 'toggleHabit'; id: string; today: DateKey }
  | { type: 'addReward'; id: string; name: string; cost: number }
  | { type: 'deleteReward'; id: string }
  | { type: 'redeemReward'; id: string; today: DateKey }
  | { type: 'replaceState'; state: AppState; today: DateKey };
```

Behavior: invalid input (blank title/name, non-integer or < 1 cost, empty weekdays, unknown id, insufficient balance, completing a habit that isn't due) returns the **same state object**. Titles/names are trimmed and cut to 200 chars. Completing records `points` at that moment; un-checking removes the completion. Toggling a habit only touches today's completion; completing requires the habit to be due today, un-checking does not. After any action carrying `today`, newly earned badges are appended to `state.badges` (never removed).

- [ ] **Step 1: Write the failing tests**

`src/logic/selectors.test.ts`:
```ts
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

  it('reports whether this week\'s freeze is spent', () => {
    const s = withCompletions(c('2026-09-28'), c('2026-09-29'), c('2026-10-01'), c(T));
    expect(progressStats(s, T).freezeUsedThisWeek).toBe(true);
    expect(progressStats(withCompletions(c('2026-10-01'), c(T)), T).freezeUsedThisWeek).toBe(false);
  });

  it('badgeStats exposes longest streak, completion count and level', () => {
    const s = withCompletions(c('2026-09-30', 60), c('2026-10-01', 60), c(T, 60));
    expect(badgeStats(s, T)).toEqual({ longestStreak: 3, totalCompletions: 3, level: 3 });
  });
});
```

`src/logic/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { emptyState, reducer, type Action } from './state';
import { balance, lifetimePoints, progressStats } from './selectors';
import { levelForPoints } from './points';
import type { AppState, Schedule } from './types';

const T = '2026-10-02'; // Friday
const run = (...actions: Action[]): AppState => actions.reduce(reducer, emptyState());

const addTask = (id = 't1', difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Action => ({
  type: 'addTask', id, title: 'Task ' + id, difficulty,
});
const addHabit = (schedule: Schedule = { kind: 'daily' }, id = 'h1'): Action => ({
  type: 'addHabit', id, title: 'Habit ' + id, difficulty: 'easy', schedule,
});

describe('adding items', () => {
  it('trims titles and stores the item', () => {
    const s = run({ type: 'addTask', id: 't1', title: '  Pay rent ', difficulty: 'hard' });
    expect(s.tasks).toEqual([{ id: 't1', title: 'Pay rent', difficulty: 'hard' }]);
  });
  it('rejects blank and whitespace-only titles (same state object)', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'addTask', id: 't', title: '   ', difficulty: 'easy' })).toBe(s0);
    expect(reducer(s0, { type: 'addHabit', id: 'h', title: '', difficulty: 'easy', schedule: { kind: 'daily' } })).toBe(s0);
  });
  it('caps very long titles at 200 characters', () => {
    const s = run({ type: 'addTask', id: 't', title: 'x'.repeat(500), difficulty: 'easy' });
    expect(s.tasks[0].title).toHaveLength(200);
  });
  it('rejects a weekdays habit with no valid days; dedupes and sorts valid ones', () => {
    const s0 = emptyState();
    expect(reducer(s0, addHabit({ kind: 'weekdays', days: [] }))).toBe(s0);
    expect(reducer(s0, addHabit({ kind: 'weekdays', days: [9, -1] }))).toBe(s0);
    const s = run(addHabit({ kind: 'weekdays', days: [3, 1, 3] }));
    expect(s.habits[0].schedule).toEqual({ kind: 'weekdays', days: [1, 3] });
  });
});

describe('completing tasks', () => {
  it('awards points by difficulty and removes them when un-checked', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(20);
    expect(balance(s)).toBe(20);
    expect(s.completions).toEqual([{ itemId: 't1', itemType: 'task', date: T, points: 20 }]);
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(0);
    expect(s.completions).toEqual([]);
  });
  it('ignores toggling an unknown task', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'toggleTask', id: 'nope', today: T })).toBe(s0);
  });
  it('keeps points when an edit changes difficulty later', () => {
    let s = run(addTask('t1', 'easy'), { type: 'toggleTask', id: 't1', today: T });
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'Renamed', difficulty: 'hard' });
    expect(s.tasks[0]).toMatchObject({ title: 'Renamed', difficulty: 'hard' });
    expect(lifetimePoints(s)).toBe(5);
  });
  it('updateTask can set and clear the due date', () => {
    let s = run(addTask('t1'));
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'T', difficulty: 'easy', dueDate: '2026-10-09' });
    expect(s.tasks[0].dueDate).toBe('2026-10-09');
    s = reducer(s, { type: 'updateTask', id: 't1', title: 'T', difficulty: 'easy' });
    expect(s.tasks[0].dueDate).toBeUndefined();
  });
});

describe('completing habits', () => {
  it('a due habit can be completed and un-checked for today', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    expect(lifetimePoints(s)).toBe(5);
    s = reducer(s, { type: 'toggleHabit', id: 'h1', today: T });
    expect(s.completions).toEqual([]);
  });
  it('a habit cannot be completed on a day it is not due (Friday vs Mon/Wed)', () => {
    const s = run(addHabit({ kind: 'weekdays', days: [1, 3] }));
    expect(reducer(s, { type: 'toggleHabit', id: 'h1', today: T })).toBe(s);
  });
  it('a completed habit can still be un-checked after its schedule no longer includes today', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    s = reducer(s, { type: 'updateHabit', id: 'h1', title: 'H', difficulty: 'easy', schedule: { kind: 'weekdays', days: [1] } });
    s = reducer(s, { type: 'toggleHabit', id: 'h1', today: T });
    expect(s.completions).toEqual([]);
  });
  it('completions on different days are separate and add up', () => {
    const s = run(
      addHabit(),
      { type: 'toggleHabit', id: 'h1', today: '2026-10-01' },
      { type: 'toggleHabit', id: 'h1', today: T },
    );
    expect(s.completions).toHaveLength(2);
    expect(lifetimePoints(s)).toBe(10);
  });
});

describe('deleting items', () => {
  it('keeps past completions and points', () => {
    let s = run(addTask('t1'), { type: 'toggleTask', id: 't1', today: T });
    s = reducer(s, { type: 'deleteTask', id: 't1' });
    expect(s.tasks).toEqual([]);
    expect(s.completions).toHaveLength(1);
    expect(lifetimePoints(s)).toBe(10);
  });
  it('deleting a habit also keeps completions', () => {
    let s = run(addHabit(), { type: 'toggleHabit', id: 'h1', today: T });
    s = reducer(s, { type: 'deleteHabit', id: 'h1' });
    expect(s.habits).toEqual([]);
    expect(s.completions).toHaveLength(1);
  });
});

describe('rewards', () => {
  const reward = (cost: number): Action => ({ type: 'addReward', id: 'r1', name: 'Coffee', cost });

  it('rejects blank names and costs that are not positive integers', () => {
    const s0 = emptyState();
    expect(reducer(s0, { type: 'addReward', id: 'r', name: ' ', cost: 5 })).toBe(s0);
    for (const cost of [0, -5, 2.5, NaN, Infinity]) expect(reducer(s0, reward(cost))).toBe(s0);
  });
  it('redeeming spends balance but never lifetime points or level', () => {
    const s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    expect(balance(s)).toBe(5);
    expect(lifetimePoints(s)).toBe(20);
    expect(levelForPoints(lifetimePoints(s))).toBe(1);
    expect(s.redemptions).toEqual([{ rewardId: 'r1', name: 'Coffee', date: T, cost: 15 }]);
  });
  it('cannot redeem when the balance is too low (same state object)', () => {
    const s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(25));
    expect(reducer(s, { type: 'redeemReward', id: 'r1', today: T })).toBe(s);
  });
  it('un-checking after redeeming clamps the balance at 0, never negative', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(lifetimePoints(s)).toBe(0);
    expect(balance(s)).toBe(0);
    expect(progressStats(s, T).level.level).toBe(1);
  });
  it('deleting a reward keeps its redemption history', () => {
    let s = run(addTask('t1', 'hard'), { type: 'toggleTask', id: 't1', today: T }, reward(15), { type: 'redeemReward', id: 'r1', today: T });
    s = reducer(s, { type: 'deleteReward', id: 'r1' });
    expect(s.rewards).toEqual([]);
    expect(s.redemptions).toHaveLength(1);
  });
});

describe('badges', () => {
  it('awards First Step on the first completion and never takes it back', () => {
    let s = run(addTask('t1'), { type: 'toggleTask', id: 't1', today: T });
    expect(s.badges).toContain('first-step');
    s = reducer(s, { type: 'toggleTask', id: 't1', today: T });
    expect(s.badges).toContain('first-step');
  });
});

describe('replaceState', () => {
  it('swaps in the imported state and re-evaluates badges', () => {
    const imported: AppState = {
      ...emptyState(),
      completions: [{ itemId: 'x', itemType: 'task', date: T, points: 5 }],
    };
    const s = reducer(emptyState(), { type: 'replaceState', state: imported, today: T });
    expect(s.completions).toHaveLength(1);
    expect(s.badges).toContain('first-step');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/logic/selectors.test.ts src/logic/state.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/logic/selectors.ts`**

```ts
import { weekStart, type DateKey } from './dates';
import { levelProgress, type LevelProgress } from './points';
import { computeStreak, type StreakResult } from './streak';
import type { BadgeStats } from './badges';
import type { AppState } from './types';

export const lifetimePoints = (s: AppState): number => s.completions.reduce((n, c) => n + c.points, 0);
export const spentPoints = (s: AppState): number => s.redemptions.reduce((n, r) => n + r.cost, 0);
/** Never negative, even if points were un-checked after spending. */
export const balance = (s: AppState): number => Math.max(0, lifetimePoints(s) - spentPoints(s));

export interface ProgressStats {
  lifetime: number;
  balance: number;
  level: LevelProgress;
  streak: StreakResult;
  totalCompletions: number;
  atRisk: boolean;
  freezeUsedThisWeek: boolean;
}

export function progressStats(s: AppState, today: DateKey): ProgressStats {
  const lifetime = lifetimePoints(s);
  const dates = s.completions.map((c) => c.date);
  const streak = computeStreak(dates, today);
  return {
    lifetime,
    balance: balance(s),
    level: levelProgress(lifetime),
    streak,
    totalCompletions: s.completions.length,
    atRisk: streak.current > 0 && !dates.includes(today),
    freezeUsedThisWeek: streak.freezeWeeksUsed.includes(weekStart(today)),
  };
}

export function badgeStats(s: AppState, today: DateKey): BadgeStats {
  const p = progressStats(s, today);
  return { longestStreak: p.streak.longest, totalCompletions: p.totalCompletions, level: p.level.level };
}
```

- [ ] **Step 4: Implement `src/logic/state.ts`**

```ts
import type { DateKey } from './dates';
import { newlyEarnedBadges } from './badges';
import { isHabitDue } from './habits';
import { POINTS } from './points';
import { badgeStats, balance } from './selectors';
import type { AppState, Difficulty, Habit, Schedule, Task } from './types';

export type Action =
  | { type: 'addTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'addHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'updateTask'; id: string; title: string; difficulty: Difficulty; dueDate?: DateKey }
  | { type: 'updateHabit'; id: string; title: string; difficulty: Difficulty; schedule: Schedule }
  | { type: 'deleteTask'; id: string }
  | { type: 'deleteHabit'; id: string }
  | { type: 'toggleTask'; id: string; today: DateKey }
  | { type: 'toggleHabit'; id: string; today: DateKey }
  | { type: 'addReward'; id: string; name: string; cost: number }
  | { type: 'deleteReward'; id: string }
  | { type: 'redeemReward'; id: string; today: DateKey }
  | { type: 'replaceState'; state: AppState; today: DateKey };

const MAX_TEXT = 200;
const clean = (t: string) => t.trim().slice(0, MAX_TEXT);

export function emptyState(): AppState {
  return { version: 1, tasks: [], habits: [], completions: [], rewards: [], redemptions: [], badges: [] };
}

function normalizeSchedule(s: Schedule): Schedule | null {
  if (s.kind === 'daily') return s;
  const days = [...new Set(s.days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
  return days.length > 0 ? { kind: 'weekdays', days } : null;
}

function buildTask(id: string, title: string, difficulty: Difficulty, dueDate?: DateKey): Task {
  const task: Task = { id, title, difficulty };
  if (dueDate) task.dueDate = dueDate;
  return task;
}

function apply(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'addTask': {
      const title = clean(a.title);
      if (!title) return state;
      return { ...state, tasks: [...state.tasks, buildTask(a.id, title, a.difficulty, a.dueDate)] };
    }
    case 'addHabit': {
      const title = clean(a.title);
      const schedule = normalizeSchedule(a.schedule);
      if (!title || !schedule) return state;
      const habit: Habit = { id: a.id, title, difficulty: a.difficulty, schedule };
      return { ...state, habits: [...state.habits, habit] };
    }
    case 'updateTask': {
      const title = clean(a.title);
      if (!title || !state.tasks.some((t) => t.id === a.id)) return state;
      return { ...state, tasks: state.tasks.map((t) => (t.id === a.id ? buildTask(a.id, title, a.difficulty, a.dueDate) : t)) };
    }
    case 'updateHabit': {
      const title = clean(a.title);
      const schedule = normalizeSchedule(a.schedule);
      if (!title || !schedule || !state.habits.some((h) => h.id === a.id)) return state;
      return { ...state, habits: state.habits.map((h) => (h.id === a.id ? { id: a.id, title, difficulty: a.difficulty, schedule } : h)) };
    }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id) };
    case 'deleteHabit':
      return { ...state, habits: state.habits.filter((h) => h.id !== a.id) };
    case 'toggleTask': {
      const task = state.tasks.find((t) => t.id === a.id);
      if (!task) return state;
      const isDone = state.completions.some((c) => c.itemType === 'task' && c.itemId === a.id);
      if (isDone) {
        return { ...state, completions: state.completions.filter((c) => !(c.itemType === 'task' && c.itemId === a.id)) };
      }
      const completion = { itemId: a.id, itemType: 'task' as const, date: a.today, points: POINTS[task.difficulty] };
      return { ...state, completions: [...state.completions, completion] };
    }
    case 'toggleHabit': {
      const habit = state.habits.find((h) => h.id === a.id);
      if (!habit) return state;
      const isToday = (c: AppState['completions'][number]) => c.itemType === 'habit' && c.itemId === a.id && c.date === a.today;
      if (state.completions.some(isToday)) {
        return { ...state, completions: state.completions.filter((c) => !isToday(c)) };
      }
      if (!isHabitDue(habit, a.today)) return state;
      const completion = { itemId: a.id, itemType: 'habit' as const, date: a.today, points: POINTS[habit.difficulty] };
      return { ...state, completions: [...state.completions, completion] };
    }
    case 'addReward': {
      const name = clean(a.name);
      if (!name || !Number.isInteger(a.cost) || a.cost < 1) return state;
      return { ...state, rewards: [...state.rewards, { id: a.id, name, cost: a.cost }] };
    }
    case 'deleteReward':
      return { ...state, rewards: state.rewards.filter((r) => r.id !== a.id) };
    case 'redeemReward': {
      const reward = state.rewards.find((r) => r.id === a.id);
      if (!reward || balance(state) < reward.cost) return state;
      const redemption = { rewardId: reward.id, name: reward.name, date: a.today, cost: reward.cost };
      return { ...state, redemptions: [...state.redemptions, redemption] };
    }
    case 'replaceState':
      return a.state;
  }
}

function awardBadges(state: AppState, today: DateKey): AppState {
  const earned = newlyEarnedBadges(badgeStats(state, today), state.badges);
  return earned.length > 0 ? { ...state, badges: [...state.badges, ...earned] } : state;
}

export function reducer(state: AppState, action: Action): AppState {
  const next = apply(state, action);
  if (next === state) return state;
  return 'today' in action ? awardBadges(next, action.today) : next;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/logic && npx tsc --noEmit`
Expected: PASS (all logic tests), no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/logic
git commit -m "feat: derived selectors and app reducer"
```

---

### Task 6: Storage, serialization, export/import

**Files:**
- Create: `src/storage/serialization.ts`, `src/storage/storage.ts`
- Test: `src/storage/serialization.test.ts`, `src/storage/storage.test.ts`

**Interfaces:**
- Consumes: `AppState` etc. from `../logic/types`, `isDateKey` from `../logic/dates`, `emptyState` from `../logic/state`
- Produces:
  - `src/storage/serialization.ts`: `CURRENT_VERSION = 1`; `migrate(raw: unknown): Record<string, unknown> | null`; `parseState(raw: unknown): AppState | null`; `class ImportError extends Error`; `exportState(state: AppState): string`; `importState(text: string): AppState` (throws `ImportError`)
  - `src/storage/storage.ts`: `STORAGE_KEY = 'gamified-todo:state'`; `BACKUP_KEY = 'gamified-todo:backup'`; `interface KeyValueStore {getItem(k: string): string | null; setItem(k: string, v: string): void}`; `interface LoadResult {state: AppState; notice?: 'recovered'}`; `interface StateStorage {load(): LoadResult; save(state: AppState): boolean}`; `createLocalStorage(kv?: KeyValueStore): StateStorage`

- [ ] **Step 1: Write the failing tests**

`src/storage/serialization.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ImportError, exportState, importState, migrate, parseState } from './serialization';
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';

export const full: AppState = {
  version: 1,
  tasks: [{ id: 't1', title: 'A', difficulty: 'easy', dueDate: '2026-10-05' }],
  habits: [{ id: 'h1', title: 'B', difficulty: 'hard', schedule: { kind: 'weekdays', days: [1, 3] } }],
  completions: [{ itemId: 't1', itemType: 'task', date: '2026-10-02', points: 5 }],
  rewards: [{ id: 'r1', name: 'Coffee', cost: 15 }],
  redemptions: [{ rewardId: 'r1', name: 'Coffee', date: '2026-10-02', cost: 15 }],
  badges: ['first-step'],
};

describe('parseState', () => {
  it('accepts a valid state, including an empty one', () => {
    expect(parseState(full)).toEqual(full);
    expect(parseState(emptyState())).toEqual(emptyState());
  });
  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'hi'],
    ['an empty object', {}],
    ['a missing list', { ...full, tasks: undefined }],
    ['a list that is not an array', { ...full, habits: 'x' }],
    ['a bad difficulty', { ...full, tasks: [{ id: 't', title: 'x', difficulty: 'insane' }] }],
    ['an impossible date', { ...full, completions: [{ itemId: 't', itemType: 'task', date: '2026-02-30', points: 5 }] }],
    ['a negative point value', { ...full, completions: [{ itemId: 't', itemType: 'task', date: '2026-10-02', points: -5 }] }],
    ['a zero reward cost', { ...full, rewards: [{ id: 'r', name: 'x', cost: 0 }] }],
    ['a weekday out of range', { ...full, habits: [{ id: 'h', title: 'x', difficulty: 'easy', schedule: { kind: 'weekdays', days: [9] } }] }],
    ['a future schema version', { ...full, version: 2 }],
    ['a missing version', { ...full, version: undefined }],
  ])('rejects %s', (_label, raw) => {
    expect(parseState(raw)).toBeNull();
  });
});

describe('migrate', () => {
  it('passes the current version through and rejects unknown ones', () => {
    expect(migrate({ version: 1 })).toEqual({ version: 1 });
    expect(migrate({ version: 0 })).toBeNull();
    expect(migrate({ version: 2 })).toBeNull();
    expect(migrate({})).toBeNull();
  });
});

describe('export / import', () => {
  it('round-trips a state', () => {
    expect(importState(exportState(full))).toEqual(full);
  });
  it('throws ImportError for non-JSON and for JSON of the wrong shape', () => {
    expect(() => importState('not json {')).toThrow(ImportError);
    expect(() => importState('null')).toThrow(ImportError);
    expect(() => importState('[]')).toThrow(ImportError);
    expect(() => importState('{}')).toThrow(ImportError);
    expect(() => importState('')).toThrow(ImportError);
  });
});
```

`src/storage/storage.test.ts`:
```ts
import { beforeEach, describe, it, expect } from 'vitest';
import { BACKUP_KEY, STORAGE_KEY, createLocalStorage, type KeyValueStore } from './storage';
import { emptyState } from '../logic/state';
import { full } from './serialization.test';

beforeEach(() => localStorage.clear());

describe('createLocalStorage', () => {
  it('returns an empty state with no notice when nothing is saved', () => {
    expect(createLocalStorage(localStorage).load()).toEqual({ state: emptyState() });
  });

  it('saves and loads a state', () => {
    const store = createLocalStorage(localStorage);
    expect(store.save(full)).toBe(true);
    expect(store.load()).toEqual({ state: full });
  });

  it('recovers from corrupt JSON: starts empty, keeps a backup, leaves the original key alone', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    const result = createLocalStorage(localStorage).load();
    expect(result).toEqual({ state: emptyState(), notice: 'recovered' });
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{oops');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{oops');
  });

  it('recovers from valid JSON of the wrong shape and from a future version', () => {
    for (const bad of ['{"version":1}', JSON.stringify({ ...full, version: 2 })]) {
      localStorage.clear();
      localStorage.setItem(STORAGE_KEY, bad);
      const result = createLocalStorage(localStorage).load();
      expect(result.notice).toBe('recovered');
      expect(localStorage.getItem(BACKUP_KEY)).toBe(bad);
    }
  });

  it('reports a failed save instead of throwing (storage full or blocked)', () => {
    const kv: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(createLocalStorage(kv).save(full)).toBe(false);
  });

  it('survives storage that throws on read', () => {
    const kv: KeyValueStore = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
    expect(createLocalStorage(kv).load()).toEqual({ state: emptyState() });
  });

  it('still loads when the backup write itself fails', () => {
    const kv: KeyValueStore = { getItem: () => '{bad', setItem: () => { throw new Error('full'); } };
    expect(createLocalStorage(kv).load().notice).toBe('recovered');
  });
});
```

(`storage.test.ts` imports the `full` fixture exported from `serialization.test.ts`; importing a test file also re-runs its `describe` blocks inside the storage test — acceptable, and keeps one fixture. If that bothers you, move `full` into `src/storage/fixtures.ts` and import it from both tests.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/storage`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/storage/serialization.ts`**

```ts
import { isDateKey } from '../logic/dates';
import type { AppState, Completion, Difficulty, Habit, Redemption, Reward, Schedule, Task } from '../logic/types';

export const CURRENT_VERSION = 1;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isDifficulty = (v: unknown): v is Difficulty => v === 'easy' || v === 'medium' || v === 'hard';
const isPoints = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isCost = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;

/** Future schema changes: add `MIGRATIONS[n] = (old) => ({ ...old, version: n + 1, ... })`. */
const MIGRATIONS: Record<number, (old: Obj) => Obj> = {};

export function migrate(raw: unknown): Obj | null {
  if (!isObj(raw) || typeof raw.version !== 'number') return null;
  let cur: Obj = raw;
  while (cur.version !== CURRENT_VERSION) {
    const from = cur.version;
    const step = typeof from === 'number' ? MIGRATIONS[from] : undefined;
    if (!step) return null; // unknown or newer version
    cur = step(cur);
    if (cur.version === from) return null; // a migration must bump the version
  }
  return cur;
}

function parseSchedule(v: unknown): Schedule | null {
  if (!isObj(v)) return null;
  if (v.kind === 'daily') return { kind: 'daily' };
  if (v.kind === 'weekdays' && Array.isArray(v.days) && v.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return { kind: 'weekdays', days: v.days as number[] };
  }
  return null;
}

function parseTask(v: unknown): Task | null {
  if (!isObj(v) || !isId(v.id) || typeof v.title !== 'string' || !isDifficulty(v.difficulty)) return null;
  const due = v.dueDate;
  if (due !== undefined && !isDateKey(due)) return null;
  const task: Task = { id: v.id, title: v.title, difficulty: v.difficulty };
  if (typeof due === 'string') task.dueDate = due;
  return task;
}

function parseHabit(v: unknown): Habit | null {
  if (!isObj(v) || !isId(v.id) || typeof v.title !== 'string' || !isDifficulty(v.difficulty)) return null;
  const schedule = parseSchedule(v.schedule);
  return schedule ? { id: v.id, title: v.title, difficulty: v.difficulty, schedule } : null;
}

function parseCompletion(v: unknown): Completion | null {
  if (!isObj(v) || !isId(v.itemId) || (v.itemType !== 'task' && v.itemType !== 'habit')) return null;
  if (!isDateKey(v.date) || !isPoints(v.points)) return null;
  return { itemId: v.itemId, itemType: v.itemType, date: v.date, points: v.points };
}

function parseReward(v: unknown): Reward | null {
  if (!isObj(v) || !isId(v.id) || typeof v.name !== 'string' || !isCost(v.cost)) return null;
  return { id: v.id, name: v.name, cost: v.cost };
}

function parseRedemption(v: unknown): Redemption | null {
  if (!isObj(v) || !isId(v.rewardId) || typeof v.name !== 'string' || !isDateKey(v.date) || !isCost(v.cost)) return null;
  return { rewardId: v.rewardId, name: v.name, date: v.date, cost: v.cost };
}

function parseList<T>(v: unknown, parse: (x: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

/** Strict: any invalid entry rejects the whole document. */
export function parseState(raw: unknown): AppState | null {
  const m = migrate(raw);
  if (!m) return null;
  const tasks = parseList(m.tasks, parseTask);
  const habits = parseList(m.habits, parseHabit);
  const completions = parseList(m.completions, parseCompletion);
  const rewards = parseList(m.rewards, parseReward);
  const redemptions = parseList(m.redemptions, parseRedemption);
  const badges = parseList(m.badges, (x) => (isId(x) ? x : null));
  if (!tasks || !habits || !completions || !rewards || !redemptions || !badges) return null;
  return { version: CURRENT_VERSION, tasks, habits, completions, rewards, redemptions, badges };
}

export class ImportError extends Error {}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(text: string): AppState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }
  const state = parseState(raw);
  if (!state) throw new ImportError('This file is not a valid Gamified Todo export.');
  return state;
}
```

- [ ] **Step 4: Implement `src/storage/storage.ts`**

```ts
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';
import { parseState } from './serialization';

export const STORAGE_KEY = 'gamified-todo:state';
export const BACKUP_KEY = 'gamified-todo:backup';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoadResult {
  state: AppState;
  notice?: 'recovered';
}

export interface StateStorage {
  load(): LoadResult;
  /** Returns false when the write failed (storage full or blocked). */
  save(state: AppState): boolean;
}

function unavailableStore(): KeyValueStore {
  const fail = () => {
    throw new Error('Storage unavailable');
  };
  return { getItem: fail, setItem: fail };
}

function defaultStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return unavailableStore(); // accessing localStorage can throw when site data is blocked
  }
}

function tryParse(text: string): AppState | null {
  try {
    return parseState(JSON.parse(text));
  } catch {
    return null;
  }
}

export function createLocalStorage(kv: KeyValueStore = defaultStore()): StateStorage {
  return {
    load() {
      let text: string | null;
      try {
        text = kv.getItem(STORAGE_KEY);
      } catch {
        return { state: emptyState() };
      }
      if (text === null) return { state: emptyState() };
      const state = tryParse(text);
      if (state) return { state };
      try {
        kv.setItem(BACKUP_KEY, text); // keep the unreadable data so it can be recovered by hand
      } catch {
        /* nothing more we can do */
      }
      return { state: emptyState(), notice: 'recovered' };
    },
    save(state) {
      try {
        kv.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/storage && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/storage
git commit -m "feat: versioned localStorage persistence with backup and import/export"
```

---

### Task 7: App shell, Today screen, quick-add

**Files:**
- Create: `src/app/id.ts`, `src/app/useToday.ts`, `src/app/AppContext.tsx`
- Create: `src/ui/labels.ts`, `src/ui/ItemForm.tsx`, `src/ui/Header.tsx`, `src/ui/Nav.tsx`, `src/ui/Banners.tsx`, `src/ui/Celebrations.tsx`, `src/ui/Today.tsx`
- Create: `src/styles.css`, `src/test-utils.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/ui/Today.test.tsx`

**Interfaces:**
- Consumes: reducer/`Action`/`emptyState` (Task 5), `progressStats`/`ProgressStats` (Task 5), `StateStorage`/`createLocalStorage` (Task 6), `BADGES` (Task 4), `isHabitDue`, `POINTS`, `levelForPoints`.
- Produces:
  - `src/app/AppContext.tsx`: `<AppProvider storage?: StateStorage now?: () => Date>`; `useApp(): {state; dispatch; today; stats: ProgressStats; saveFailed: boolean; recovered: boolean; dismissRecovered(): void}`
  - `src/app/id.ts`: `newId(): string`
  - `src/ui/labels.ts`: `DAY_LABELS: string[]`, `DIFFICULTY_LABEL: Record<Difficulty,string>`, `describeSchedule(s: Schedule): string`
  - `src/ui/ItemForm.tsx`: `interface ItemFormValues {kind:'task'|'habit'; title; difficulty; dueDate?: DateKey; schedule: Schedule}`; `<ItemForm initial?: ItemFormValues lockKind?: boolean submitLabel: string onSubmit(v) onCancel()/>`
  - `src/ui/Nav.tsx`: `TABS` (`as const`), `type TabId`, `<Nav tab onChange/>`
  - `src/test-utils.tsx`: `memoryStorage(initial?)` (returns `StateStorage & {current(): AppState}`), `NOW`, `renderApp(initial?)`

- [ ] **Step 1: Write the small supporting modules**

`src/app/id.ts`:
```ts
export function newId(): string {
  // crypto.randomUUID needs a secure context; fall back for plain-http dev on a LAN address.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

`src/app/useToday.ts`:
```ts
import { useEffect, useState } from 'react';
import { toDateKey, type DateKey } from '../logic/dates';

/** The current local date, refreshed every 30s and when the tab becomes visible (handles midnight). */
export function useToday(now: () => Date = () => new Date()): DateKey {
  const [today, setToday] = useState(() => toDateKey(now()));
  useEffect(() => {
    const tick = () => {
      const key = toDateKey(now());
      setToday((prev) => (prev === key ? prev : key));
    };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return today;
}
```

`src/app/AppContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { DateKey } from '../logic/dates';
import { progressStats, type ProgressStats } from '../logic/selectors';
import { reducer, type Action } from '../logic/state';
import type { AppState } from '../logic/types';
import { createLocalStorage, type StateStorage } from '../storage/storage';
import { useToday } from './useToday';

interface AppContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  today: DateKey;
  stats: ProgressStats;
  saveFailed: boolean;
  recovered: boolean;
  dismissRecovered: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

interface ProviderProps {
  children: ReactNode;
  storage?: StateStorage;
  now?: () => Date;
}

export function AppProvider({ children, storage, now }: ProviderProps) {
  const store = useMemo(() => storage ?? createLocalStorage(), [storage]);
  const [initial] = useState(() => store.load());
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [saveFailed, setSaveFailed] = useState(false);
  const [recovered, setRecovered] = useState(initial.notice === 'recovered');
  const today = useToday(now);

  useEffect(() => {
    setSaveFailed(!store.save(state));
  }, [state, store]);

  const stats = useMemo(() => progressStats(state, today), [state.completions, state.redemptions, today]);

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, today, stats, saveFailed, recovered, dismissRecovered: () => setRecovered(false) }),
    [state, today, stats, saveFailed, recovered],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

`src/ui/labels.ts`:
```ts
import type { Difficulty, Schedule } from '../logic/types';

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function describeSchedule(s: Schedule): string {
  return s.kind === 'daily' ? 'Every day' : s.days.map((d) => DAY_LABELS[d]).join(', ');
}
```

- [ ] **Step 2: Write `ItemForm`**

`src/ui/ItemForm.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import type { DateKey } from '../logic/dates';
import { POINTS } from '../logic/points';
import type { Difficulty, Schedule } from '../logic/types';
import { DAY_LABELS, DIFFICULTY_LABEL } from './labels';

export interface ItemFormValues {
  kind: 'task' | 'habit';
  title: string;
  difficulty: Difficulty;
  dueDate?: DateKey;
  schedule: Schedule;
}

interface Props {
  initial?: ItemFormValues;
  lockKind?: boolean;
  submitLabel: string;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}

export function ItemForm({ initial, lockKind, submitLabel, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<'task' | 'habit'>(initial?.kind ?? 'task');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [everyDay, setEveryDay] = useState(!initial || initial.schedule.kind === 'daily');
  const [days, setDays] = useState<number[]>(
    initial && initial.schedule.kind === 'weekdays' ? initial.schedule.days : [1, 2, 3, 4, 5],
  );

  const canSubmit = title.trim() !== '' && (kind === 'task' || everyDay || days.length > 0);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      kind,
      title,
      difficulty,
      dueDate: kind === 'task' && dueDate ? dueDate : undefined,
      schedule: everyDay ? { kind: 'daily' } : { kind: 'weekdays', days },
    });
  }

  return (
    <form className="item-form" onSubmit={submit}>
      <label>
        Type
        <select value={kind} disabled={lockKind} onChange={(e) => setKind(e.target.value as 'task' | 'habit')}>
          <option value="task">One-off task</option>
          <option value="habit">Recurring habit</option>
        </select>
      </label>
      <label>
        Title
        <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        Difficulty
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          {(Object.keys(POINTS) as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]} ({POINTS[d]} pts)
            </option>
          ))}
        </select>
      </label>
      {kind === 'task' ? (
        <label>
          Due date (optional)
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      ) : (
        <fieldset>
          <legend>Repeats</legend>
          <label className="inline">
            <input type="checkbox" checked={everyDay} onChange={(e) => setEveryDay(e.target.checked)} /> Every day
          </label>
          {!everyDay && (
            <div className="days">
              {DAY_LABELS.map((label, d) => (
                <label key={d} className="inline">
                  <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} /> {label}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      <div className="actions">
        <button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write Header, Nav, Banners, Celebrations**

`src/ui/Header.tsx`:
```tsx
import { useApp } from '../app/AppContext';

export function Header() {
  const { stats } = useApp();
  const { level, streak, balance, atRisk, freezeUsedThisWeek } = stats;
  return (
    <header className="header">
      <div className="stat level">
        <strong data-testid="level">Level {level.level}</strong>
        <div
          className="bar"
          role="progressbar"
          aria-label="Progress to next level"
          aria-valuemin={0}
          aria-valuemax={level.pointsForNext}
          aria-valuenow={level.pointsIntoLevel}
        >
          <div style={{ width: `${Math.round(level.fraction * 100)}%` }} />
        </div>
        <small>
          {level.pointsIntoLevel} / {level.pointsForNext} to next level
        </small>
      </div>
      <div className="stat">
        <span>
          🔥 <strong data-testid="streak">{streak.current}</strong> day streak
        </span>
        <small>Freeze {freezeUsedThisWeek ? 'used this week' : 'available'}</small>
      </div>
      <div className="stat">
        <span>
          ⭐ <strong data-testid="balance">{balance}</strong> points
        </span>
        <small>to spend</small>
      </div>
      {atRisk && <p className="risk">Your {streak.current}-day streak is at risk — complete something today!</p>}
    </header>
  );
}
```

`src/ui/Nav.tsx`:
```tsx
export const TABS = [{ id: 'today', label: 'Today' }] as const;
export type TabId = (typeof TABS)[number]['id'];

export function Nav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/ui/Banners.tsx`:
```tsx
import { useApp } from '../app/AppContext';

export function Banners() {
  const { saveFailed, recovered, dismissRecovered } = useApp();
  return (
    <>
      {saveFailed && (
        <p className="banner warn" role="alert">
          Your browser is blocking or has run out of storage — changes will not be saved. Export a backup from the
          Progress screen if you can.
        </p>
      )}
      {recovered && (
        <p className="banner" role="status">
          Your saved data could not be read, so the app started fresh. The old data was kept as a backup in this
          browser.
          <button onClick={dismissRecovered}>Dismiss</button>
        </p>
      )}
    </>
  );
}
```

`src/ui/Celebrations.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext';
import { BADGES } from '../logic/badges';
import { levelForPoints } from '../logic/points';
import { lifetimePoints } from '../logic/selectors';

export function Celebrations() {
  const { state } = useApp();
  const level = levelForPoints(lifetimePoints(state));
  const prev = useRef({ level, badges: state.badges });
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const fresh: string[] = [];
    if (level > prev.current.level) fresh.push(`Level up! You reached level ${level}`);
    for (const id of state.badges) {
      if (prev.current.badges.includes(id)) continue;
      const def = BADGES.find((b) => b.id === id);
      if (def) fresh.push(`Badge unlocked: ${def.name}`);
    }
    prev.current = { level, badges: state.badges };
    if (fresh.length > 0) setMessages((m) => [...m, ...fresh]);
  }, [level, state.badges]);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => setMessages((m) => m.slice(1)), 4000);
    return () => clearTimeout(t);
  }, [messages]);

  if (messages.length === 0) return null;
  return (
    <div className="celebration" role="status">
      {messages[0]}
      <button onClick={() => setMessages((m) => m.slice(1))}>OK</button>
    </div>
  );
}
```

- [ ] **Step 4: Write the Today screen**

`src/ui/Today.tsx`:
```tsx
import { useState } from 'react';
import { useApp } from '../app/AppContext';
import { newId } from '../app/id';
import { isHabitDue } from '../logic/habits';
import { POINTS } from '../logic/points';
import type { Difficulty } from '../logic/types';
import { ItemForm, type ItemFormValues } from './ItemForm';
import { DIFFICULTY_LABEL } from './labels';

interface RowProps {
  title: string;
  difficulty: Difficulty;
  meta?: string;
  checked: boolean;
  pop?: number;
  onToggle: () => void;
}

function ItemRow({ title, difficulty, meta, checked, pop, onToggle }: RowProps) {
  return (
    <li className={`row${checked ? ' done' : ''}`}>
      <label>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="title">{title}</span>
        <span className={`tag ${difficulty}`}>
          {DIFFICULTY_LABEL[difficulty]} · {POINTS[difficulty]} pts
        </span>
        {meta && <span className="meta">{meta}</span>}
      </label>
      {pop !== undefined && (
        <span className="pop" aria-hidden="true">
          +{pop}
        </span>
      )}
    </li>
  );
}

export function Today() {
  const { state, dispatch, today } = useApp();
  const [adding, setAdding] = useState(false);
  const [pops, setPops] = useState<Record<string, number>>({});

  function showPop(key: string, points: number) {
    setPops((p) => ({ ...p, [key]: points }));
    setTimeout(() => {
      setPops((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }, 1000);
  }

  const habitDoneToday = new Set(
    state.completions.filter((c) => c.itemType === 'habit' && c.date === today).map((c) => c.itemId),
  );
  const taskDoneDate = new Map<string, string>(
    state.completions.filter((c) => c.itemType === 'task').map((c) => [c.itemId, c.date] as [string, string]),
  );
  const habits = state.habits.filter((h) => isHabitDue(h, today) || habitDoneToday.has(h.id));
  const tasks = state.tasks.filter((t) => !taskDoneDate.has(t.id) || taskDoneDate.get(t.id) === today);

  function add(v: ItemFormValues) {
    if (v.kind === 'task') {
      dispatch({ type: 'addTask', id: newId(), title: v.title, difficulty: v.difficulty, dueDate: v.dueDate });
    } else {
      dispatch({ type: 'addHabit', id: newId(), title: v.title, difficulty: v.difficulty, schedule: v.schedule });
    }
    setAdding(false);
  }

  return (
    <section>
      <div className="section-head">
        <h2>Today</h2>
        <button onClick={() => setAdding(true)}>Add item</button>
      </div>
      {adding && <ItemForm submitLabel="Add" onSubmit={add} onCancel={() => setAdding(false)} />}

      {state.habits.length === 0 && state.tasks.length === 0 && !adding && (
        <p className="empty">Nothing here yet — add your first habit or task to start your streak.</p>
      )}

      {state.habits.length > 0 && (
        <>
          <h3>Habits</h3>
          {habits.length === 0 ? (
            <p className="empty">No habits due today.</p>
          ) : (
            <ul className="list">
              {habits.map((h) => {
                const checked = habitDoneToday.has(h.id);
                return (
                  <ItemRow
                    key={h.id}
                    title={h.title}
                    difficulty={h.difficulty}
                    checked={checked}
                    pop={pops[h.id]}
                    onToggle={() => {
                      dispatch({ type: 'toggleHabit', id: h.id, today });
                      if (!checked) showPop(h.id, POINTS[h.difficulty]);
                    }}
                  />
                );
              })}
            </ul>
          )}
        </>
      )}

      {state.tasks.length > 0 && (
        <>
          <h3>Tasks</h3>
          {tasks.length === 0 ? (
            <p className="empty">All tasks done — nice work.</p>
          ) : (
            <ul className="list">
              {tasks.map((t) => {
                const checked = taskDoneDate.has(t.id);
                return (
                  <ItemRow
                    key={t.id}
                    title={t.title}
                    difficulty={t.difficulty}
                    meta={t.dueDate ? `Due ${t.dueDate}` : undefined}
                    checked={checked}
                    pop={pops[t.id]}
                    onToggle={() => {
                      dispatch({ type: 'toggleTask', id: t.id, today });
                      if (!checked) showPop(t.id, POINTS[t.difficulty]);
                    }}
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Write App, main, styles, test utils**

`src/App.tsx`:
```tsx
import { useState, type ComponentType } from 'react';
import { Banners } from './ui/Banners';
import { Celebrations } from './ui/Celebrations';
import { Header } from './ui/Header';
import { Nav, type TabId } from './ui/Nav';
import { Today } from './ui/Today';

const SCREENS: Record<TabId, ComponentType> = {
  today: Today,
};

export default function App() {
  const [tab, setTab] = useState<TabId>('today');
  const Screen = SCREENS[tab];
  return (
    <div className="app">
      <Banners />
      <Header />
      <main>
        <Screen />
      </main>
      <Nav tab={tab} onChange={setTab} />
      <Celebrations />
    </div>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './app/AppContext';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
```

`src/styles.css`:
```css
:root {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --text: #1c2030;
  --muted: #6b7280;
  --accent: #5b5bf0;
  --accent-soft: #e6e6fe;
  --line: #e3e5ee;
  --warn: #b45309;
  --warn-bg: #fff4e0;
  --heat0: #ebedf3;
  --heat1: #c7c9fb;
  --heat2: #9a9cf6;
  --heat3: #6f70ee;
  --heat4: #4343c9;
  --frozen: #7dd3fc;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12141c;
    --surface: #1b1e29;
    --text: #e8eaf2;
    --muted: #9aa1b2;
    --accent: #8b8bff;
    --accent-soft: #2a2c4d;
    --line: #2b2f3d;
    --warn: #fbbf24;
    --warn-bg: #3a2f10;
    --heat0: #262a38;
    --heat1: #343780;
    --heat2: #4a4db8;
    --heat3: #6a6de6;
    --heat4: #9fa1ff;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.45 system-ui, sans-serif; }
button { font: inherit; padding: 0.5rem 0.9rem; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--text); cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
input, select { font: inherit; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--text); }
h2 { margin: 0; } h3 { margin: 1.2rem 0 0.4rem; color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }

.app { max-width: 720px; margin: 0 auto; padding: 0 16px 88px; }
.header { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; padding: 16px 0; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.stat small { color: var(--muted); }
.bar { height: 8px; border-radius: 99px; background: var(--heat0); overflow: hidden; }
.bar > div { height: 100%; background: var(--accent); transition: width 0.3s; }
.risk { grid-column: 1 / -1; margin: 0; padding: 8px 12px; border-radius: 10px; background: var(--warn-bg); color: var(--warn); }

.banner { margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; background: var(--accent-soft); }
.banner.warn { background: var(--warn-bg); color: var(--warn); }
.banner button { margin-left: 8px; }

.nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex; background: var(--surface); border-top: 1px solid var(--line); }
.nav button { flex: 1; border: 0; border-radius: 0; padding: 14px 4px; background: transparent; }
.nav button[aria-current='page'] { color: var(--accent); font-weight: 600; box-shadow: inset 0 3px 0 var(--accent); }
@media (min-width: 768px) {
  .app { padding-left: 170px; }
  .nav { top: 0; right: auto; bottom: 0; width: 150px; flex-direction: column; justify-content: flex-start; padding-top: 24px; border-top: 0; border-right: 1px solid var(--line); }
  .nav button { flex: none; text-align: left; padding: 12px 18px; }
  .nav button[aria-current='page'] { box-shadow: inset 3px 0 0 var(--accent); }
}

.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.row { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.row label { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; cursor: pointer; }
.row input[type='checkbox'] { width: 22px; height: 22px; accent-color: var(--accent); }
.row .title { flex: 1; min-width: 40%; }
.row.done .title { text-decoration: line-through; color: var(--muted); }
.tag { font-size: 0.75rem; padding: 2px 8px; border-radius: 99px; background: var(--accent-soft); }
.meta { color: var(--muted); font-size: 0.8rem; }
.row-actions { display: flex; gap: 6px; margin-left: auto; }
.pop { position: absolute; right: 14px; top: 4px; color: var(--accent); font-weight: 700; animation: pop 1s ease-out forwards; pointer-events: none; }
@keyframes pop { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-22px); } }
@media (prefers-reduced-motion: reduce) { .pop { animation: none; } }
.empty { color: var(--muted); }

.item-form { display: grid; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.item-form label { display: grid; gap: 4px; }
.item-form label.inline { display: inline-flex; gap: 6px; align-items: center; }
.item-form .days { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.item-form fieldset { border: 1px solid var(--line); border-radius: 8px; }
.actions { display: flex; gap: 8px; }

.celebration { position: fixed; left: 50%; bottom: 80px; transform: translateX(-50%); background: var(--accent); color: #fff; padding: 12px 18px; border-radius: 99px; box-shadow: 0 6px 20px rgb(0 0 0 / 0.25); display: flex; gap: 12px; align-items: center; }
.celebration button { background: rgb(255 255 255 / 0.2); color: #fff; border: 0; padding: 4px 10px; }

.reward-form { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
.reward-form input[type='number'] { width: 7rem; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 16px 0; }
.stats div { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.stats dt { color: var(--muted); font-size: 0.8rem; } .stats dd { margin: 0; font-size: 1.3rem; font-weight: 700; }
.badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; list-style: none; padding: 0; }
.badge { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.badge.locked { opacity: 0.5; filter: grayscale(1); }
.badge small { display: block; color: var(--muted); }

.heatmap-scroll { overflow-x: auto; padding-bottom: 6px; }
.heatmap { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); grid-auto-columns: 12px; gap: 3px; width: max-content; }
.cell { width: 12px; height: 12px; padding: 0; border: 0; border-radius: 3px; background: var(--heat0); }
.cell.l1 { background: var(--heat1); } .cell.l2 { background: var(--heat2); } .cell.l3 { background: var(--heat3); } .cell.l4 { background: var(--heat4); }
.cell.frozen { background: var(--frozen); box-shadow: inset 0 0 0 2px var(--surface); }
.cell.future { visibility: hidden; }
.heat-detail { color: var(--muted); margin: 6px 0; min-height: 1.4em; }
.legend { display: flex; gap: 4px; align-items: center; color: var(--muted); font-size: 0.8rem; }
.legend .cell { display: inline-block; }
.data-transfer { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 18px; }
.error { color: var(--warn); }
```

`src/test-utils.tsx`:
```tsx
import { render } from '@testing-library/react';
import { AppProvider } from './app/AppContext';
import App from './App';
import { emptyState } from './logic/state';
import type { AppState } from './logic/types';
import type { StateStorage } from './storage/storage';

export const NOW = () => new Date(2026, 9, 2, 12, 0, 0); // Friday 2026-10-02

export function memoryStorage(initial: AppState = emptyState()): StateStorage & { current(): AppState } {
  let current = initial;
  return {
    load: () => ({ state: current }),
    save: (s) => {
      current = s;
      return true;
    },
    current: () => current,
  };
}

export function renderApp(initial: AppState = emptyState()) {
  const storage = memoryStorage(initial);
  const utils = render(
    <AppProvider storage={storage} now={NOW}>
      <App />
    </AppProvider>,
  );
  return { ...utils, storage };
}
```

- [ ] **Step 6: Write the failing component tests**

`src/ui/Today.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';

const T = '2026-10-02';

describe('Today screen', () => {
  it('a brand-new user sees an empty state and zeroed header', () => {
    renderApp();
    expect(screen.getByText(/add your first habit or task/i)).toBeInTheDocument();
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    expect(screen.getByTestId('streak')).toHaveTextContent('0');
    expect(screen.getByTestId('balance')).toHaveTextContent('0');
  });

  it('adds a task, completes it, and updates points and streak; un-checking removes them', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/title/i), 'Write report');
    await user.selectOptions(screen.getByLabelText(/difficulty/i), 'hard');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    const box = screen.getByRole('checkbox', { name: /write report/i });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(screen.getByTestId('balance')).toHaveTextContent('20');
    expect(screen.getByTestId('streak')).toHaveTextContent('1');

    await user.click(box);
    expect(screen.getByTestId('balance')).toHaveTextContent('0');
  });

  it('will not submit a blank or whitespace-only title', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/title/i), '   ');
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });

  it('adds a weekday habit and requires at least one day', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.selectOptions(screen.getByLabelText(/type/i), 'habit');
    await user.type(screen.getByLabelText(/title/i), 'Run');
    await user.click(screen.getByLabelText(/every day/i)); // turn off "every day"
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) await user.click(screen.getByLabelText(day)); // clear defaults
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    await user.click(screen.getByLabelText('Fri')); // today is Friday
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByRole('checkbox', { name: /run/i })).toBeInTheDocument();
  });

  it('shows a level-up celebration when a completion crosses a level threshold', async () => {
    const user = userEvent.setup();
    const initial: AppState = {
      ...emptyState(),
      tasks: [{ id: 't1', title: 'Big one', difficulty: 'hard' }],
      completions: [{ itemId: 'old', itemType: 'task', date: '2026-09-01', points: 40 }],
    };
    renderApp(initial);
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    await user.click(screen.getByRole('checkbox', { name: /big one/i }));
    expect(screen.getByTestId('level')).toHaveTextContent('Level 2');
    expect(await screen.findByText(/level up/i)).toBeInTheDocument();
  });

  it('warns when a running streak has nothing done today', () => {
    renderApp({ ...emptyState(), completions: [{ itemId: 'a', itemType: 'task', date: '2026-10-01', points: 10 }] });
    expect(screen.getByText(/streak is at risk/i)).toBeInTheDocument();
  });

  it('does not warn once something is done today', () => {
    renderApp({
      ...emptyState(),
      completions: [
        { itemId: 'a', itemType: 'task', date: '2026-10-01', points: 10 },
        { itemId: 'b', itemType: 'task', date: T, points: 10 },
      ],
    });
    expect(screen.queryByText(/streak is at risk/i)).not.toBeInTheDocument();
  });

  it('persists changes through the storage interface', async () => {
    const user = userEvent.setup();
    const { storage } = renderApp();
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/title/i), 'Saved task');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(storage.current().tasks.map((t) => t.title)).toEqual(['Saved task']);
  });
});
```

- [ ] **Step 7: Run to verify (tests were written against components created above)**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS for every test file so far, no type errors. If a test fails, fix the component, not the test (unless the test contradicts the spec).

- [ ] **Step 8: Manual smoke check**

Run: `npm run dev`, open the printed URL. Add a habit and a task, tick them, watch the header and the "+N" pop, reload the page and confirm data persisted. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src index.html
git commit -m "feat: app shell with header, today screen and quick add"
```

---

### Task 8: Habits & Tasks management and Rewards

**Files:**
- Create: `src/ui/Manage.tsx`, `src/ui/Rewards.tsx`
- Modify: `src/ui/Nav.tsx` (add two tabs), `src/App.tsx` (add two screens)
- Test: `src/ui/Manage.test.tsx`, `src/ui/Rewards.test.tsx`

**Interfaces:**
- Consumes: `useApp`, `ItemForm`/`ItemFormValues`, `labels`, `newId`, `balance`, `Action`
- Produces: `<Manage />`, `<Rewards />`; tabs `manage` ("Habits & Tasks") and `rewards` ("Rewards")

- [ ] **Step 1: Write the failing tests**

`src/ui/Manage.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import type { AppState } from '../logic/types';

const initial = (): AppState => ({
  ...emptyState(),
  habits: [{ id: 'h1', title: 'Read', difficulty: 'easy', schedule: { kind: 'weekdays', days: [1, 3] } }],
  tasks: [
    { id: 't1', title: 'Email landlord', difficulty: 'medium' },
    { id: 't2', title: 'File taxes', difficulty: 'hard' },
  ],
  completions: [{ itemId: 't2', itemType: 'task', date: '2026-10-01', points: 20 }],
});

afterEach(() => vi.restoreAllMocks());

async function openManage() {
  const user = userEvent.setup();
  const utils = renderApp(initial());
  await user.click(screen.getByRole('button', { name: /habits & tasks/i }));
  return { user, ...utils };
}

describe('Habits & Tasks screen', () => {
  it('lists habits with their schedule, open tasks, and completed tasks separately', async () => {
    await openManage();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText(/mon, wed/i)).toBeInTheDocument();
    expect(screen.getByText('Email landlord')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /completed tasks/i })).toBeInTheDocument();
    expect(screen.getByText('File taxes')).toBeInTheDocument();
  });

  it('edits a habit title', async () => {
    const { user, storage } = await openManage();
    await user.click(screen.getByRole('button', { name: /edit read/i }));
    const title = screen.getByLabelText(/title/i);
    await user.clear(title);
    await user.type(title, 'Read 20 pages');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByText('Read 20 pages')).toBeInTheDocument();
    expect(storage.current().habits[0].title).toBe('Read 20 pages');
  });

  it('deletes a task after confirmation but keeps its earned points', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, storage } = await openManage();
    await user.click(screen.getByRole('button', { name: /delete file taxes/i }));
    expect(screen.queryByText('File taxes')).not.toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(1);
    expect(screen.getByTestId('balance')).toHaveTextContent('20');
  });

  it('does nothing when the delete confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = await openManage();
    await user.click(screen.getByRole('button', { name: /delete email landlord/i }));
    expect(screen.getByText('Email landlord')).toBeInTheDocument();
  });
});
```

`src/ui/Rewards.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';

const withPoints = (points: number) => ({
  ...emptyState(),
  completions: [{ itemId: 'a', itemType: 'task' as const, date: '2026-10-01', points }],
});

async function openRewards(points: number) {
  const user = userEvent.setup();
  const utils = renderApp(withPoints(points));
  await user.click(screen.getByRole('button', { name: /^rewards$/i }));
  return { user, ...utils };
}

async function addReward(user: ReturnType<typeof userEvent.setup>, name: string, cost: string) {
  await user.type(screen.getByLabelText(/reward name/i), name);
  await user.type(screen.getByLabelText(/cost/i), cost);
  await user.click(screen.getByRole('button', { name: /add reward/i }));
}

describe('Rewards screen', () => {
  it('the add button stays disabled for a blank name or a non-positive cost', async () => {
    const { user } = await openRewards(30);
    const add = screen.getByRole('button', { name: /add reward/i });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText(/reward name/i), 'Coffee');
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText(/cost/i), '0');
    expect(add).toBeDisabled();
  });

  it('redeem is disabled when the balance is too low', async () => {
    const { user } = await openRewards(10);
    await addReward(user, 'Gaming hour', '25');
    expect(screen.getByRole('button', { name: /redeem gaming hour/i })).toBeDisabled();
  });

  it('redeeming spends the balance, logs history, and keeps the level', async () => {
    const { user } = await openRewards(30);
    await addReward(user, 'Coffee', '15');
    await user.click(screen.getByRole('button', { name: /redeem coffee/i }));
    expect(screen.getByTestId('balance')).toHaveTextContent('15');
    expect(screen.getByTestId('level')).toHaveTextContent('Level 1');
    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument();
    expect(screen.getAllByText(/coffee/i).length).toBeGreaterThan(1); // shop row + history row
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Manage.test.tsx src/ui/Rewards.test.tsx`
Expected: FAIL — no "Habits & Tasks" / "Rewards" tab yet.

- [ ] **Step 3: Implement `src/ui/Manage.tsx`**

```tsx
import { useState } from 'react';
import { useApp } from '../app/AppContext';
import { POINTS } from '../logic/points';
import { ItemForm, type ItemFormValues } from './ItemForm';
import { DIFFICULTY_LABEL, describeSchedule } from './labels';

type Editing = { kind: 'task' | 'habit'; id: string } | null;

export function Manage() {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState<Editing>(null);

  const doneDate = new Map<string, string>(
    state.completions.filter((c) => c.itemType === 'task').map((c) => [c.itemId, c.date] as [string, string]),
  );
  const openTasks = state.tasks.filter((t) => !doneDate.has(t.id));
  const doneTasks = state.tasks.filter((t) => doneDate.has(t.id));

  function save(v: ItemFormValues) {
    if (!editing) return;
    if (editing.kind === 'task') {
      dispatch({ type: 'updateTask', id: editing.id, title: v.title, difficulty: v.difficulty, dueDate: v.dueDate });
    } else {
      dispatch({ type: 'updateHabit', id: editing.id, title: v.title, difficulty: v.difficulty, schedule: v.schedule });
    }
    setEditing(null);
  }

  function remove(kind: 'task' | 'habit', id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? Points you already earned are kept.`)) return;
    dispatch(kind === 'task' ? { type: 'deleteTask', id } : { type: 'deleteHabit', id });
  }

  const actions = (kind: 'task' | 'habit', id: string, title: string) => (
    <span className="row-actions">
      <button aria-label={`Edit ${title}`} onClick={() => setEditing({ kind, id })}>
        Edit
      </button>
      <button aria-label={`Delete ${title}`} onClick={() => remove(kind, id, title)}>
        Delete
      </button>
    </span>
  );

  return (
    <section>
      <h2>Habits &amp; Tasks</h2>

      <h3>Habits</h3>
      {state.habits.length === 0 && <p className="empty">No habits yet.</p>}
      <ul className="list">
        {state.habits.map((h) =>
          editing?.kind === 'habit' && editing.id === h.id ? (
            <li key={h.id}>
              <ItemForm
                lockKind
                submitLabel="Save"
                initial={{ kind: 'habit', title: h.title, difficulty: h.difficulty, schedule: h.schedule }}
                onSubmit={save}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={h.id} className="row">
              <label>
                <span className="title">{h.title}</span>
                <span className={`tag ${h.difficulty}`}>
                  {DIFFICULTY_LABEL[h.difficulty]} · {POINTS[h.difficulty]} pts
                </span>
                <span className="meta">{describeSchedule(h.schedule)}</span>
                {actions('habit', h.id, h.title)}
              </label>
            </li>
          ),
        )}
      </ul>

      <h3>Open tasks</h3>
      {openTasks.length === 0 && <p className="empty">No open tasks.</p>}
      <ul className="list">
        {openTasks.map((t) =>
          editing?.kind === 'task' && editing.id === t.id ? (
            <li key={t.id}>
              <ItemForm
                lockKind
                submitLabel="Save"
                initial={{ kind: 'task', title: t.title, difficulty: t.difficulty, dueDate: t.dueDate, schedule: { kind: 'daily' } }}
                onSubmit={save}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={t.id} className="row">
              <label>
                <span className="title">{t.title}</span>
                <span className={`tag ${t.difficulty}`}>
                  {DIFFICULTY_LABEL[t.difficulty]} · {POINTS[t.difficulty]} pts
                </span>
                {t.dueDate && <span className="meta">Due {t.dueDate}</span>}
                {actions('task', t.id, t.title)}
              </label>
            </li>
          ),
        )}
      </ul>

      {doneTasks.length > 0 && (
        <>
          <h3>Completed tasks</h3>
          <ul className="list">
            {doneTasks.map((t) => (
              <li key={t.id} className="row done">
                <label>
                  <span className="title">{t.title}</span>
                  <span className="meta">Done {doneDate.get(t.id)}</span>
                  {actions('task', t.id, t.title)}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Implement `src/ui/Rewards.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/AppContext';
import { newId } from '../app/id';

export function Rewards() {
  const { state, dispatch, today, stats } = useApp();
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');

  const costNum = Number(cost);
  const valid = name.trim() !== '' && Number.isInteger(costNum) && costNum >= 1;

  function add(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    dispatch({ type: 'addReward', id: newId(), name, cost: costNum });
    setName('');
    setCost('');
  }

  return (
    <section>
      <h2>Rewards</h2>
      <p>
        You have <strong>{stats.balance}</strong> points to spend.
      </p>

      <form className="reward-form" onSubmit={add}>
        <label>
          Reward name
          <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Cost (points)
          <input type="number" min={1} step={1} value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
        <button type="submit" disabled={!valid}>
          Add reward
        </button>
      </form>

      {state.rewards.length === 0 ? (
        <p className="empty">Add something you'd love to earn — a treat, a game hour, a day off.</p>
      ) : (
        <ul className="list">
          {state.rewards.map((r) => (
            <li key={r.id} className="row">
              <label>
                <span className="title">{r.name}</span>
                <span className="tag">{r.cost} pts</span>
                <span className="row-actions">
                  <button
                    aria-label={`Redeem ${r.name}`}
                    disabled={stats.balance < r.cost}
                    onClick={() => dispatch({ type: 'redeemReward', id: r.id, today })}
                  >
                    Redeem
                  </button>
                  <button aria-label={`Delete ${r.name}`} onClick={() => dispatch({ type: 'deleteReward', id: r.id })}>
                    Delete
                  </button>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {state.redemptions.length > 0 && (
        <>
          <h3>History</h3>
          <ul className="list">
            {[...state.redemptions].reverse().map((r, i) => (
              <li key={`${r.rewardId}-${r.date}-${i}`} className="row">
                <span className="title">{r.name}</span> <span className="meta">{r.date} · −{r.cost} pts</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Register the tabs**

`src/ui/Nav.tsx` — change the `TABS` line to:
```tsx
export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'manage', label: 'Habits & Tasks' },
  { id: 'rewards', label: 'Rewards' },
] as const;
```

`src/App.tsx` — add imports and entries:
```tsx
import { Manage } from './ui/Manage';
import { Rewards } from './ui/Rewards';

const SCREENS: Record<TabId, ComponentType> = {
  today: Today,
  manage: Manage,
  rewards: Rewards,
};
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS for all tests, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: manage habits/tasks and rewards shop"
```

---

### Task 9: Progress screen (heatmap, badges, stats, export/import)

**Files:**
- Create: `src/ui/Heatmap.tsx`, `src/ui/BadgeGrid.tsx`, `src/ui/DataTransfer.tsx`, `src/ui/Progress.tsx`
- Modify: `src/ui/Nav.tsx` (add tab), `src/App.tsx` (add screen)
- Test: `src/ui/Progress.test.tsx`

**Interfaces:**
- Consumes: `buildHeatmap`/`HeatmapData`/`HeatCell` (Task 4), `BADGES`, `exportState`/`importState`, `useApp` (provides `stats.streak.frozenDays`)
- Produces: `<Progress />`, tab `progress` ("Progress")

- [ ] **Step 1: Write the failing tests**

`src/ui/Progress.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test-utils';
import { emptyState } from '../logic/state';
import { exportState } from '../storage/serialization';
import type { AppState, Completion } from '../logic/types';

const T = '2026-10-02';
const c = (date: string, points: number, id = `i-${date}-${points}`): Completion => ({ itemId: id, itemType: 'task', date, points });

afterEach(() => vi.restoreAllMocks());

async function openProgress(initial: AppState = emptyState()) {
  const user = userEvent.setup();
  const utils = renderApp(initial);
  await user.click(screen.getByRole('button', { name: /^progress$/i }));
  return { user, ...utils };
}

describe('Progress screen', () => {
  it('a brand-new user sees an empty heatmap, zero stats and only locked badges', async () => {
    await openProgress();
    expect(screen.getByText(/0 completions in the last year/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /completion heatmap/i })).toBeInTheDocument();
    expect(screen.getAllByText(/locked/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/earned/i)).not.toBeInTheDocument();
  });

  it('shows per-day detail for a tapped heatmap cell', async () => {
    const { user } = await openProgress({ ...emptyState(), completions: [c(T, 10), c(T, 20)] });
    expect(screen.getByText(/2 completions in the last year/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /30 points, 2 items/i }));
    expect(screen.getAllByText(/30 points, 2 items/i).length).toBeGreaterThan(1); // cell label + detail line
  });

  it('marks a freeze day', async () => {
    await openProgress({
      ...emptyState(),
      completions: [c('2026-09-28', 5), c('2026-09-29', 5), c('2026-10-01', 5), c(T, 5)],
    });
    expect(screen.getByRole('button', { name: /streak freeze used/i })).toBeInTheDocument();
  });

  it('shows unlocked badges as earned', async () => {
    await openProgress({ ...emptyState(), completions: [c(T, 10)], badges: ['first-step'] });
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText(/earned/i)).toBeInTheDocument();
  });

  it('rejects a malformed import file and leaves existing data untouched', async () => {
    const initial: AppState = { ...emptyState(), completions: [c(T, 10)] };
    const { user, storage } = await openProgress(initial);
    const confirm = vi.spyOn(window, 'confirm');
    const file = new File(['{"hello": "world"}'], 'bad.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import/i), file);
    expect(await screen.findByText(/not a valid gamified todo export/i)).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    expect(storage.current().completions).toHaveLength(1);
  });

  it('rejects non-JSON text the same way', async () => {
    const { user, storage } = await openProgress({ ...emptyState(), completions: [c(T, 10)] });
    await user.upload(screen.getByLabelText(/import/i), new File(['nope {'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByText(/not valid json/i)).toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(1);
  });

  it('imports a valid export after confirmation', async () => {
    const incoming: AppState = { ...emptyState(), completions: [c('2026-10-01', 5), c(T, 5), c('2026-09-30', 5)] };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, storage } = await openProgress();
    await user.upload(
      screen.getByLabelText(/import/i),
      new File([exportState(incoming)], 'good.json', { type: 'application/json' }),
    );
    expect(await screen.findByText(/import complete/i)).toBeInTheDocument();
    expect(storage.current().completions).toHaveLength(3);
    expect(screen.getByText(/3 completions in the last year/i)).toBeInTheDocument();
  });

  it('keeps existing data when the user declines the import confirmation', async () => {
    const incoming: AppState = { ...emptyState(), completions: [c(T, 5)] };
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user, storage } = await openProgress({ ...emptyState(), completions: [c(T, 10), c('2026-10-01', 10)] });
    await user.upload(
      screen.getByLabelText(/import/i),
      new File([exportState(incoming)], 'good.json', { type: 'application/json' }),
    );
    expect(storage.current().completions).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/Progress.test.tsx`
Expected: FAIL — no "Progress" tab yet.

- [ ] **Step 3: Implement `src/ui/Heatmap.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { HeatCell, HeatmapData } from '../logic/heatmap';

function describe(cell: HeatCell): string {
  const [y, m, d] = cell.date.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (cell.frozen) return `${label}: streak freeze used`;
  return `${label}: ${cell.points} points, ${cell.count} ${cell.count === 1 ? 'item' : 'items'}`;
}

export function Heatmap({ heatmap }: { heatmap: HeatmapData }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<HeatCell | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth; // start at the most recent week
  }, []);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-scroll" ref={scroller}>
        <div className="heatmap" role="group" aria-label="Completion heatmap">
          {heatmap.weeks.flat().map((cell) =>
            cell.future ? (
              <span key={cell.date} className="cell future" aria-hidden="true" />
            ) : (
              <button
                key={cell.date}
                type="button"
                className={`cell l${cell.level}${cell.frozen ? ' frozen' : ''}`}
                aria-label={describe(cell)}
                onClick={() => setSelected(cell)}
              />
            ),
          )}
        </div>
      </div>
      <p className="heat-detail" aria-live="polite">
        {selected ? describe(selected) : 'Tap a day for details'}
      </p>
      <div className="legend" aria-hidden="true">
        Less <span className="cell" /> <span className="cell l1" /> <span className="cell l2" />{' '}
        <span className="cell l3" /> <span className="cell l4" /> More · <span className="cell frozen" /> Freeze
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `BadgeGrid`, `DataTransfer`, `Progress`**

`src/ui/BadgeGrid.tsx`:
```tsx
import { BADGES } from '../logic/badges';

export function BadgeGrid({ earned }: { earned: string[] }) {
  return (
    <>
      <h3>Badges</h3>
      <ul className="badges">
        {BADGES.map((b) => {
          const has = earned.includes(b.id);
          return (
            <li key={b.id} className={`badge${has ? '' : ' locked'}`}>
              <strong>{b.name}</strong>
              <small>{has ? 'Earned' : `Locked — ${b.goal}`}</small>
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

`src/ui/DataTransfer.tsx`:
```tsx
import { useState, type ChangeEvent } from 'react';
import { useApp } from '../app/AppContext';
import { exportState, importState } from '../storage/serialization';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function DataTransfer() {
  const { state, today, dispatch } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function exportData() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamified-todo-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const imported = importState(await readFile(file));
      if (!window.confirm('Importing replaces all current data in this browser. Continue?')) return;
      dispatch({ type: 'replaceState', state: imported, today });
      setMessage('Import complete.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that file.');
    }
  }

  return (
    <div className="data-transfer">
      <button onClick={exportData}>Export data</button>
      <label>
        Import data{' '}
        <input type="file" accept="application/json,.json" onChange={onFile} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
```

`src/ui/Progress.tsx`:
```tsx
import { useMemo } from 'react';
import { useApp } from '../app/AppContext';
import { buildHeatmap } from '../logic/heatmap';
import { BadgeGrid } from './BadgeGrid';
import { DataTransfer } from './DataTransfer';
import { Heatmap } from './Heatmap';

export function Progress() {
  const { state, today, stats } = useApp();
  const heatmap = useMemo(
    () => buildHeatmap(state.completions, stats.streak.frozenDays, today),
    [state.completions, stats.streak.frozenDays, today],
  );

  return (
    <section>
      <h2>Progress</h2>
      <p className="summary">
        {heatmap.totalCompletions} {heatmap.totalCompletions === 1 ? 'completion' : 'completions'} in the last year
        · Current streak {stats.streak.current} · Longest {stats.streak.longest}
      </p>
      <Heatmap heatmap={heatmap} />

      <dl className="stats">
        <div>
          <dt>Level</dt>
          <dd>{stats.level.level}</dd>
        </div>
        <div>
          <dt>Lifetime points</dt>
          <dd>{stats.lifetime}</dd>
        </div>
        <div>
          <dt>Items completed</dt>
          <dd>{stats.totalCompletions}</dd>
        </div>
        <div>
          <dt>Rewards redeemed</dt>
          <dd>{state.redemptions.length}</dd>
        </div>
      </dl>

      <BadgeGrid earned={state.badges} />
      <DataTransfer />
    </section>
  );
}
```

Caution: the test "a brand-new user … `queryByText(/earned/i)` not in document" relies on no copy containing the word "earned" when nothing is earned. The stat label "Items completed" and "Lifetime points" do not contain it; keep it that way.

- [ ] **Step 5: Register the tab**

`src/ui/Nav.tsx` — extend `TABS`:
```tsx
export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'manage', label: 'Habits & Tasks' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'progress', label: 'Progress' },
] as const;
```

`src/App.tsx` — add:
```tsx
import { Progress } from './ui/Progress';

const SCREENS: Record<TabId, ComponentType> = {
  today: Today,
  manage: Manage,
  rewards: Rewards,
  progress: Progress,
};
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS for all tests, no type errors.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`. On Progress: confirm the heatmap scrolls to the latest week on a narrow window, click Export (a `.json` downloads), then import it back. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: progress screen with heatmap, badges, stats and data export/import"
```

---

### Task 10: PWA, GitHub Pages workflow, README

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`, generated icons in `public/`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts`, `index.html`, `package.json` (scripts, via npm)

**Interfaces:**
- Consumes: the finished app
- Produces: installable offline PWA built to `dist/` with base `/todolist/`; deploy workflow

- [ ] **Step 1: Install PWA tooling**

Run: `npm i -D vite-plugin-pwa @vite-pwa/assets-generator`
Expected: installs without errors.

- [ ] **Step 2: Create the icon source**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#5b5bf0"/>
  <path d="M150 270l70 70 150-170" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="392" cy="120" r="34" fill="#fbbf24"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({ preset: minimal2023Preset, images: ['public/icon.svg'] });
```

Run: `npx pwa-assets-generator`
Expected: creates `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Check with `ls public`.

- [ ] **Step 3: Configure Vite**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project site from /<repo>/, so only the production build uses that base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/todolist/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Gamified Todo',
        short_name: 'Todo',
        description: 'Tasks, habits, streaks and rewards.',
        theme_color: '#5b5bf0',
        background_color: '#f6f7fb',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
}));
```

`index.html` — add inside `<head>`:
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="theme-color" content="#5b5bf0" />
```
(Vite rewrites these root-relative `public/` URLs to include the `/todolist/` base at build time.)

- [ ] **Step 4: Verify the production build and offline behavior**

Run: `npm test && npm run build && npm run preview`
Expected: tests pass; build prints a `dist/` with `sw.js` and `manifest.webmanifest`; preview serves at `http://localhost:4173/todolist/`. Open it, then in DevTools → Application confirm the manifest loads and the service worker is registered; tick "Offline" and reload — the app must still load. Stop the preview server.

- [ ] **Step 5: Add the deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Write the README**

`README.md`:
```markdown
# Gamified Todo

A personal, browser-only todo app: one-off tasks and recurring habits earn points, keep a daily streak (with one freeze per week), unlock levels and badges, and can be spent on rewards you define. Includes a 12-month completion heatmap and JSON export/import. Installable as a PWA and works offline.

## Develop

    npm install
    npm run dev        # http://localhost:5173
    npm test           # unit + component tests
    npm run build      # type-check + production build into dist/

## Data

Everything is stored in your browser's localStorage — there is no server. Use **Progress → Export data** to back up or move to another device; clearing site data deletes your progress.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Design: `docs/superpowers/specs/2026-10-02-gamified-todo-design.md`.
```

- [ ] **Step 7: Final full check and commit**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all pass.

```bash
git add -A
git commit -m "feat: installable PWA and GitHub Pages deployment"
```

- [ ] **Step 8: STOP — ask before publishing**

Do **not** push yet. Tell the user the local repo is complete and ask for permission to run:
```bash
git push -u origin main
```
After a yes: push, then remind the user to set **Settings → Pages → Source: GitHub Actions** in `tidschn/todolist` and watch the first workflow run. Report the live URL (`https://tidschn.github.io/todolist/`) only after the run succeeds.

---

## Self-Review (completed)

**Spec coverage:** platform/PWA/offline (T10); stack (T1); localStorage behind interface + versioned schema (T6); tasks + habits + weekday schedules (T2, T5, T7, T8); points 5/10/20 (T2); streak with weekly freeze (T3); levels (T2); badges incl. 3/7/30/100 and count badges (T4); rewards (T5, T8); heatmap incl. shades, frozen marker, tooltip/detail, scroll-to-latest, summary line (T4, T9); Today header with level bar / streak+freeze / balance / at-risk reminder / quick-add / "+N" pop (T7); Habits & Tasks management incl. completed tasks (T8); Progress screen with badges (locked show goal), stats, export/import (T9); celebration banners (T7); un-check removes points, redemption floor, delete keeps completions (T5); corrupt-data backup, storage-warning, export/import (T6, T7, T9); testing strategy (all tasks); GitHub Pages (T10). All spec items map to a task.

**Placeholder scan:** no TBD/TODO; every code step contains the code.

**Type consistency:** `HeatmapData` (not `Heatmap`) is the logic type, the component is `Heatmap`; `StreakResult.freezeWeeksUsed` used by `progressStats`; `Action` types match across reducer, tests and UI dispatches; `ItemFormValues` shared by Today/Manage; `TABS`/`TabId` extended in T8 and T9 with matching `SCREENS` keys; `StateStorage`/`memoryStorage` signatures match.
