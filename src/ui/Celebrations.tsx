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
