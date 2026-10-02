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
