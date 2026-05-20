import type { Tab, Language } from '../../shared/types';

const HomeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10L10 3l7 7" />
    <path d="M5 9.5v8h3.5v-5h3v5H15v-8" />
  </svg>
);

const FeedIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="6.5" r="2.5" />
    <path d="M1.5 17.5c0-3.5 2.5-5.5 5.5-5.5s5.5 2 5.5 5.5" />
    <path d="M13.5 4.5a2.5 2.5 0 010 5" />
    <path d="M16 17.5c0-3-1.5-5-3-5.5" />
  </svg>
);

const FridgeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="2" width="11" height="16" rx="1.5" />
    <line x1="4.5" y1="8" x2="15.5" y2="8" />
    <line x1="8" y1="4.5" x2="8" y2="7" />
    <line x1="8" y1="10" x2="8" y2="13.5" />
  </svg>
);

const RecipesIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17V5.5" />
    <path d="M10 5.5C9 3.5 6.5 3 3 3.5v11C6.5 14 9 15 10 17" />
    <path d="M10 5.5c1-2 3.5-2.5 7-2v11C13.5 14 11 15 10 17" />
  </svg>
);

const ProductsIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="11" y="3" width="6" height="6" rx="1" />
    <rect x="3" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3.5" />
    <path d="M2.5 18.5c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
  </svg>
);

interface NavItem {
  id: Tab;
  icon: JSX.Element;
  label: string;
  labelEn: string;
}

const NAV: NavItem[] = [
  { id: 'home',     icon: <HomeIcon />,     label: 'Начало',    labelEn: 'Home'     },
  { id: 'feed',     icon: <FeedIcon />,     label: 'Лента',     labelEn: 'Feed'     },
  { id: 'fridge',   icon: <FridgeIcon />,   label: 'Хладилник', labelEn: 'Fridge'   },
  { id: 'recipes',  icon: <RecipesIcon />,  label: 'Рецепти',   labelEn: 'Recipes'  },
  { id: 'products', icon: <ProductsIcon />, label: 'Продукти',  labelEn: 'Products' },
  { id: 'profile',  icon: <ProfileIcon />,  label: 'Профил',    labelEn: 'Profile'  },
];

interface BottomNavProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
}

export const BottomNav = ({ tab, setTab, lang }: BottomNavProps) => {
  const isEn = lang === 'en';

  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <button
          key={n.id}
          className={`bn-item${tab === n.id ? ' active' : ''}`}
          onClick={() => setTab(n.id)}
        >
          <span className="bn-icon">{n.icon}</span>
          <span className="bn-label">{isEn ? n.labelEn : n.label}</span>
        </button>
      ))}
    </nav>
  );
}
