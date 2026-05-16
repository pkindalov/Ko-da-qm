import type { Tab, Language, Notification } from '../../shared/types';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';

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

interface SidebarProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  lang: Language;
  onTweaksToggle: () => void;
  onLogout: () => void;
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

export function Sidebar({ tab, setTab, lang, onTweaksToggle, onLogout, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onMarkAsUnread, onMarkAllAsUnread, onDeleteNotification, onDeleteAll, onEntityClick }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Ко-да-ям
        <span>{lang === 'en' ? 'for picky eaters' : 'за капризни хора'}</span>
      </div>

      {NAV.map((n) => (
        <button
          key={n.id}
          className={`nav-item${tab === n.id ? ' active' : ''}`}
          onClick={() => setTab(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          {lang === 'en' ? n.labelEn : n.label}
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
      />

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
        <span className="nav-icon">🚪</span> {lang === 'en' ? 'Log out' : 'Изход'}
      </button>
    </nav>
  );
}
