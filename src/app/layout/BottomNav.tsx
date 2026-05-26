import type { JSX } from 'react';
import type { Tab, Language } from '../../shared/types';
import { HomeIcon, FeedIcon, FridgeIcon, RecipesIcon, CookbookIcon, ProductsIcon, ProfileIcon, PlannerIcon } from './NavIcons';

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
  { id: 'cookbook', icon: <CookbookIcon />, label: 'Книга',     labelEn: 'Cookbook' },
  { id: 'products', icon: <ProductsIcon />, label: 'Продукти',  labelEn: 'Products' },
  { id: 'profile',  icon: <ProfileIcon />,  label: 'Профил',    labelEn: 'Profile'  },
  { id: 'planner',  icon: <PlannerIcon />,  label: 'Планировчик', labelEn: 'Planner'  },
];

interface BottomNavProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
}

export const BottomNav = ({ tab, setTab, lang }: BottomNavProps) => {
  const isEnglish = lang === 'en';

  return (
    <nav className="bottom-nav">
      {NAV.map((navItem) => (
        <button
          key={navItem.id}
          className={`bn-item${tab === navItem.id ? ' active' : ''}`}
          onClick={() => setTab(navItem.id)}
        >
          <span className="bn-icon">{navItem.icon}</span>
          <span className="bn-label">{isEnglish ? navItem.labelEn : navItem.label}</span>
        </button>
      ))}
    </nav>
  );
}
