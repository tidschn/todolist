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
