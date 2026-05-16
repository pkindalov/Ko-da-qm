import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Notification, Language } from '../../../shared/types';
import { ANONYMOUS_ACTOR, getNotificationParts, formatTimeAgo } from '../constants/notificationMessages';

const buildNotificationMsg = (
  notification: Notification,
  lang: Language,
  onActorClick: () => void,
) => {
  const { before, after } = getNotificationParts(notification.type, lang);
  const displayName = notification.actorName ?? ANONYMOUS_ACTOR[lang];

  if (!notification.actorId) {
    return <>{before}{displayName}{after}</>;
  }

  return (
    <>
      {before}
      <Link
        className="notif-actor-link"
        to={`/user/${notification.actorId}`}
        onClick={onActorClick}
      >
        {displayName}
      </Link>
      {after}
    </>
  );
};

const MAX_BADGE_COUNT = 99;

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onMarkAsUnread: (id: string) => void;
  onMarkAllAsUnread: () => void;
  onDeleteNotification: (id: string) => void;
  onDeleteAll: () => void;
  lang: Language;
}

export const NotificationBell = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onMarkAsUnread,
  onMarkAllAsUnread,
  onDeleteNotification,
  onDeleteAll,
  lang,
}: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const badgeLabel = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        className="nav-item"
        onClick={() => setIsOpen(open => !open)}
        aria-label={lang === 'en' ? 'Notifications' : 'Известия'}
      >
        <span className="nav-icon">🔔</span>
        {lang === 'en' ? 'Notifications' : 'Известия'}
        {unreadCount > 0 && (
          <span className="notif-badge" aria-label={`${unreadCount} unread`}>{badgeLabel}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown" role="dialog" aria-label={lang === 'en' ? 'Notifications' : 'Известия'}>
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">
              {lang === 'en' ? 'Notifications' : 'Известия'}
            </span>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button className="notif-mark-all-btn" onClick={onMarkAllAsRead}>
                  {lang === 'en' ? 'Mark all read' : 'Прочети всички'}
                </button>
              )}
              {notifications.length > unreadCount && (
                <button className="notif-mark-all-btn" onClick={onMarkAllAsUnread}>
                  {lang === 'en' ? 'Mark all unread' : 'Маркирай всички'}
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-delete-all-btn" onClick={onDeleteAll}>
                  {lang === 'en' ? 'Delete all' : 'Изтрий всички'}
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              {lang === 'en' ? 'No notifications yet' : 'Няма известия'}
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notif-item${notification.isRead ? '' : ' unread'}`}
                >
                  <div className="notif-item-body">
                    <div className="notif-item-msg">
                      {buildNotificationMsg(notification, lang, () => setIsOpen(false))}
                    </div>
                    <div className="notif-item-time">
                      {formatTimeAgo(notification.createdAt, lang)}
                    </div>
                  </div>
                  <div className="notif-item-actions">
                    <button
                      className="notif-item-toggle"
                      onClick={() => notification.isRead ? onMarkAsUnread(notification.id) : onMarkAsRead(notification.id)}
                      aria-label={notification.isRead
                        ? (lang === 'en' ? 'Mark as unread' : 'Маркирай като непрочетено')
                        : (lang === 'en' ? 'Mark as read' : 'Маркирай като прочетено')
                      }
                    >
                      {notification.isRead
                        ? (lang === 'en' ? 'Mark unread' : 'Непрочетено')
                        : (lang === 'en' ? 'Mark read' : 'Прочетено')
                      }
                    </button>
                    <button
                      className="notif-item-delete"
                      onClick={() => onDeleteNotification(notification.id)}
                      aria-label={lang === 'en' ? 'Delete notification' : 'Изтрий известие'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
