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
