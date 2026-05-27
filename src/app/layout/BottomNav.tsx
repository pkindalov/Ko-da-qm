import type { JSX } from 'react';
import type { Tab, Language } from '../../shared/types';
import { HomeIcon, FeedIcon, FridgeIcon, RecipesIcon, ProfileIcon } from './NavIcons';

interface NavChild {
  id: Tab;
  label: string;
  labelEn: string;
}

interface NavLeaf {
  type: 'leaf';
  id: Tab;
  icon: JSX.Element;
  label: string;
  labelEn: string;
}

interface NavGroup {
  type: 'group';
  id: string;
  icon: JSX.Element;
  label: string;
  labelEn: string;
  children: NavChild[];
}

type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  { type: 'leaf',  id: 'home',    icon: <HomeIcon />,    label: 'Начало',  labelEn: 'Home'    },
  { type: 'leaf',  id: 'feed',    icon: <FeedIcon />,    label: 'Лента',   labelEn: 'Feed'    },
  {
    type: 'group', id: 'cook',    icon: <RecipesIcon />, label: 'Готвене', labelEn: 'Cook',
    children: [
      { id: 'recipes',  label: 'Рецепти',     labelEn: 'Recipes'  },
      { id: 'cookbook', label: 'Книга',       labelEn: 'Cookbook' },
      { id: 'planner',  label: 'Планировчик', labelEn: 'Planner'  },
    ],
  },
  {
    type: 'group', id: 'kitchen', icon: <FridgeIcon />,  label: 'Кухня',   labelEn: 'Kitchen',
    children: [
      { id: 'fridge',   label: 'Хладилник', labelEn: 'Fridge'   },
      { id: 'products', label: 'Продукти',  labelEn: 'Products' },
    ],
  },
  { type: 'leaf',  id: 'profile', icon: <ProfileIcon />, label: 'Профил',  labelEn: 'Profile' },
];

const findParent = (tab: Tab): NavEntry | undefined =>
  NAV.find(entry =>
    entry.type === 'leaf'
      ? entry.id === tab
      : entry.children.some(c => c.id === tab)
  );

interface BottomNavProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
}

export const BottomNav = ({ tab, setTab, lang }: BottomNavProps) => {
  const isEnglish = lang === 'en';
  const parent = findParent(tab);
  const subChildren = parent?.type === 'group' ? parent.children : null;

  const handleEntryClick = (entry: NavEntry) => {
    if (entry.type === 'leaf') {
      setTab(entry.id);
    } else {
      const alreadyInGroup = entry.children.some(c => c.id === tab);
      if (!alreadyInGroup) setTab(entry.children[0].id);
    }
  };

  return (
    <nav className="bottom-nav">
      <div className="bn-main-row">
        {NAV.map(entry => (
          <button
            key={entry.id}
            className={`bn-item${parent?.id === entry.id ? ' active' : ''}`}
            onClick={() => handleEntryClick(entry)}
          >
            <span className="bn-icon">{entry.icon}</span>
            <span className="bn-label">{isEnglish ? entry.labelEn : entry.label}</span>
          </button>
        ))}
      </div>

      {subChildren && (
        <div className="bn-subnav">
          {subChildren.map(child => (
            <button
              key={child.id}
              className={`bn-subitem${tab === child.id ? ' active' : ''}`}
              onClick={() => setTab(child.id)}
            >
              {isEnglish ? child.labelEn : child.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};
