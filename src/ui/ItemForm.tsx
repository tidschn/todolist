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
