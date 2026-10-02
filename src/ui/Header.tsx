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
