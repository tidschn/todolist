export const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'manage', label: 'Habits & Tasks' },
  { id: 'rewards', label: 'Rewards' },
] as const;
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
