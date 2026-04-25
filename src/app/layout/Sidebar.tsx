import type { Tab, Language } from '../../shared/types';

interface NavItem {
  id: Tab;
  icon: string;
  label: string;
  labelEn: string;
}

const NAV: NavItem[] = [
  { id: 'home',     icon: '🏠', label: 'Начало',    labelEn: 'Home'     },
  { id: 'fridge',   icon: '🧊', label: 'Хладилник', labelEn: 'Fridge'   },
  { id: 'recipes',  icon: '📖', label: 'Рецепти',   labelEn: 'Recipes'  },
  { id: 'products', icon: '🥕', label: 'Продукти',  labelEn: 'Products' },
  { id: 'profile',  icon: '👤', label: 'Профил',    labelEn: 'Profile'  },
];

interface SidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
  onTweaksToggle: () => void;
  onLogout: () => void;
}

export function Sidebar({ tab, setTab, lang, onTweaksToggle, onLogout }: SidebarProps) {
  const L = lang === 'en';

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Ко-да-ям
        <span>{L ? 'for picky eaters' : 'за капризни хора'}</span>
      </div>

      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item${tab === n.id ? ' active' : ''}`}
          onClick={() => setTab(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          {L ? n.labelEn : n.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button
        className="nav-item"
        onClick={onTweaksToggle}
        style={{ color: 'var(--text2)' }}
      >
        <span className="nav-icon">⚙</span> Tweaks
      </button>
      <button
        className="nav-item"
        onClick={onLogout}
        style={{ color: 'var(--danger)' }}
      >
        <span className="nav-icon">🚪</span> {L ? 'Log out' : 'Изход'}
      </button>
    </nav>
  );
}
