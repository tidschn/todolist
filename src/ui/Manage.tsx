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
              <div className="row-body">
                <span className="title">{h.title}</span>
                <span className={`tag ${h.difficulty}`}>
                  {DIFFICULTY_LABEL[h.difficulty]} · {POINTS[h.difficulty]} pts
                </span>
                <span className="meta">{describeSchedule(h.schedule)}</span>
                {actions('habit', h.id, h.title)}
              </div>
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
              <div className="row-body">
                <span className="title">{t.title}</span>
                <span className={`tag ${t.difficulty}`}>
                  {DIFFICULTY_LABEL[t.difficulty]} · {POINTS[t.difficulty]} pts
                </span>
                {t.dueDate && <span className="meta">Due {t.dueDate}</span>}
                {actions('task', t.id, t.title)}
              </div>
            </li>
          ),
        )}
      </ul>

      {doneTasks.length > 0 && (
        <>
          <h3>Completed tasks</h3>
          <ul className="list">
            {doneTasks.map((t) =>
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
                <li key={t.id} className="row done">
                  <div className="row-body">
                    <span className="title">{t.title}</span>
                    <span className="meta">Done {doneDate.get(t.id)}</span>
                    {actions('task', t.id, t.title)}
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}
