export const TABS = [
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'manage', label: 'Habits & Tasks', icon: '✅' },
  { id: 'rewards', label: 'Rewards', icon: '🎁' },
  { id: 'progress', label: 'Progress', icon: '📈' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export function Nav({ tab, onChange }: { tab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onChange(t.id)}>
          <span className="nav-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
