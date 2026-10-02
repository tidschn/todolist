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
