import type { JSX } from 'react';
import type { Tab, Language, Profile, Notification } from '../../shared/types';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { HomeIcon, FeedIcon, FridgeIcon, RecipesIcon, CookbookIcon, ProductsIcon, ProfileIcon, PlannerIcon } from './NavIcons';
import { KofiModal } from '../../shared/components/KofiModal';
import { useKofiSupport } from '../../shared/hooks/useKofiSupport';

interface NavItem {
  id: Tab;
  glyph: JSX.Element;
  label: string;
  labelEn: string;
}

const NAV: NavItem[] = [
  { id: 'home',     glyph: <HomeIcon />,     label: 'Начало',         labelEn: 'Home'     },
  { id: 'feed',     glyph: <FeedIcon />,     label: 'Лента',          labelEn: 'Feed'     },
  { id: 'fridge',   glyph: <FridgeIcon />,   label: 'Хладилник',      labelEn: 'Fridge'   },
  { id: 'recipes',  glyph: <RecipesIcon />,  label: 'Рецепти',        labelEn: 'Recipes'  },
  { id: 'cookbook', glyph: <CookbookIcon />, label: 'Готварска книга', labelEn: 'Cookbook' },
  { id: 'products', glyph: <ProductsIcon />, label: 'Продукти',       labelEn: 'Products' },
  { id: 'profile',  glyph: <ProfileIcon />,  label: 'Профил',         labelEn: 'Profile'  },
  { id: 'planner',  glyph: <PlannerIcon />,  label: 'Планировчик',    labelEn: 'Planner'  },
];

interface SidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
  profile: Profile;
  tweaksOpen: boolean;
  onTweaksToggle: () => void;
  onLangToggle: () => void;
  onLogout: () => void;
  onUserClick?: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onMarkAsUnread: (id: string) => void;
  onMarkAllAsUnread: () => void;
  onDeleteNotification: (id: string) => void;
  onDeleteAll: () => void;
  onEntityClick?: (entityType: string, entityId: string) => void;
}

export const Sidebar = ({ tab, setTab, lang, profile, tweaksOpen, onTweaksToggle, onLangToggle, onLogout, onUserClick, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onMarkAsUnread, onMarkAllAsUnread, onDeleteNotification, onDeleteAll, onEntityClick }: SidebarProps) => {
  const { open: kofiOpen, openSupport, close: closeKofi } = useKofiSupport();
  const userInitial = (profile.name || 'К').trim().charAt(0).toUpperCase();
  const filterCount = profile.allergies.length + profile.dislikes.length;

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setTab('home')} aria-label={lang === 'en' ? 'Ко-да-ям — home' : 'Ко-да-ям — начало'}>
        <img
          className="brand-logo"
          src={lang === 'en' ? '/logoEN.png' : '/logoBG.png'}
          alt=""
          width={40}
          height={40}
        />
        <span className="brand-text">
          <span className="brand-mark">Ко-да-ям</span>
          <span className="brand-sub">{lang === 'en' ? 'for picky eaters' : 'за капризни хора'}</span>
        </span>
      </button>

      <nav className="nav">
        <div className="nav-section-label">{lang === 'en' ? 'Sections' : 'Секции'}</div>
        {NAV.map((navItem, i) => (
          <button key={navItem.id} className={`nav-item${tab === navItem.id ? ' active' : ''}`} onClick={() => setTab(navItem.id)}>
            <span className="nav-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="nav-glyph">{navItem.glyph}</span>
            <span>{lang === 'en' ? navItem.labelEn : navItem.label}</span>
          </button>
        ))}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onMarkAsUnread={onMarkAsUnread}
          onMarkAllAsUnread={onMarkAllAsUnread}
          onDeleteNotification={onDeleteNotification}
          onDeleteAll={onDeleteAll}
          onEntityClick={onEntityClick}
          lang={lang}
          navNum={String(NAV.length + 1).padStart(2, '0')}
        />
      </nav>

      <div className="sidebar-footer">
        <button className="user-chip" onClick={onUserClick} disabled={onUserClick == null}>
          <div className="user-avatar">{userInitial}</div>
          <div>
            <div className="user-name">{profile.name || (lang === 'en' ? 'Guest cook' : 'Гост')}</div>
            <div className="user-meta">{filterCount} {lang === 'en' ? 'filters' : 'филтри'}</div>
          </div>
        </button>
        <div className="sidebar-utility">
          <button className={tweaksOpen ? 'on' : ''} onClick={onTweaksToggle}>Tweaks</button>
          <button onClick={onLangToggle}>{lang === 'bg' ? 'EN' : 'BG'}</button>
          <button className="logout" onClick={onLogout}>{lang === 'en' ? 'Log out' : 'Изход'}</button>
        </div>
        <button className="sidebar-kofi" onClick={openSupport}>
          {lang === 'en' ? 'Support ☕' : 'Подкрепи ☕'}
        </button>
        <KofiModal open={kofiOpen} onClose={closeKofi} lang={lang} />
      </div>
    </aside>
  );
}
