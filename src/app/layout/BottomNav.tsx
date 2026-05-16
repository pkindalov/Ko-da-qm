import type { Tab, Language } from '../../shared/types';

interface NavItem {
  id: Tab;
  icon: string;
  label: string;
  labelEn: string;
}

const NAV: NavItem[] = [
  { id: 'home',     icon: '🏠', label: 'Начало',    labelEn: 'Home'     },
  { id: 'feed',     icon: '👥', label: 'Лента',     labelEn: 'Feed'     },
  { id: 'fridge',   icon: '🧊', label: 'Хладилник', labelEn: 'Fridge'   },
  { id: 'recipes',  icon: '📖', label: 'Рецепти',   labelEn: 'Recipes'  },
  { id: 'products', icon: '🥕', label: 'Продукти',  labelEn: 'Products' },
  { id: 'profile',  icon: '👤', label: 'Профил',    labelEn: 'Profile'  },
];

interface BottomNavProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
}

export function BottomNav({ tab, setTab, lang }: BottomNavProps) {
  const L = lang === 'en';

  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`bn-item${tab === n.id ? ' active' : ''}`}
          onClick={() => setTab(n.id)}
        >
          <span className="bn-icon">{n.icon}</span>
          {L ? n.labelEn : n.label}
        </button>
      ))}
    </nav>
  );
}
