import { useState, useRef, useEffect } from 'react';
import type { Notification, Language } from '../../../shared/types';
import { getNotificationMessage, formatTimeAgo } from '../constants/notificationMessages';

const MAX_BADGE_COUNT = 99;

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  lang: Language;
}

export const NotificationBell = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
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
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={onMarkAllAsRead}>
                {lang === 'en' ? 'Mark all read' : 'Прочети всички'}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              {lang === 'en' ? 'No notifications yet' : 'Няма известия'}
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(notification => (
                <button
                  key={notification.id}
                  className={`notif-item${notification.isRead ? '' : ' unread'}`}
                  onClick={() => { if (!notification.isRead) onMarkAsRead(notification.id); }}
                >
                  <div className="notif-item-msg">
                    {getNotificationMessage(notification.type, notification.actorName, lang)}
                  </div>
                  <div className="notif-item-time">
                    {formatTimeAgo(notification.createdAt, lang)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
