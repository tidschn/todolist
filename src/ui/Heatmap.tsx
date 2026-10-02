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
