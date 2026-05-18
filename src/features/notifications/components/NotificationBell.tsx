import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Notification, Language } from '../../../shared/types';
import { ANONYMOUS_ACTOR, getNotificationParts, formatTimeAgo } from '../constants/notificationMessages';

const BellIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2.5v1" />
    <path d="M6 14V9.5C6 7 7.8 5 10 5s4 2 4 4.5V14" />
    <line x1="4" y1="14" x2="16" y2="14" />
    <path d="M7.5 16a2.5 2.5 0 005 0" />
  </svg>
);

const MAX_BADGE_COUNT = 99;

const buildNotificationMsg = (
  notification: Notification,
  lang: Language,
  closeDropdown: () => void,
  onEntityClick?: (entityType: string, entityId: string) => void,
) => {
  const { beforeActor, betweenActorEntity, entityKeyword, afterEntity } = getNotificationParts(notification.type, lang);
  const displayName = notification.actorName ?? ANONYMOUS_ACTOR[lang];

  const actorNode = notification.actorId ? (
    <Link
      className="notif-actor-link"
      to={`/user/${notification.actorId}`}
      onClick={closeDropdown}
    >
      {displayName}
    </Link>
  ) : displayName;

  const canClickEntity = Boolean(onEntityClick && notification.entityId && notification.entityType);
  const entityNode = canClickEntity ? (
    <button
      className="notif-entity-link"
      onClick={() => {
        onEntityClick!(notification.entityType!, notification.entityId!);
        closeDropdown();
      }}
    >
      {entityKeyword}
    </button>
  ) : entityKeyword;

  return (
    <>
      {beforeActor}{actorNode}{betweenActorEntity}{entityNode}{afterEntity}
    </>
  );
};

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onMarkAsUnread: (id: string) => void;
  onMarkAllAsUnread: () => void;
  onDeleteNotification: (id: string) => void;
  onDeleteAll: () => void;
  onEntityClick?: (entityType: string, entityId: string) => void;
  lang: Language;
  navNum?: string;
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
  onEntityClick,
  lang,
  navNum,
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
        {navNum != null && <span className="nav-num">{navNum}</span>}
        <span className="nav-glyph"><BellIcon /></span>
        <span>{lang === 'en' ? 'Notifications' : 'Известия'}</span>
        {unreadCount > 0 && (
          <span className="notif-badge" aria-label={`${unreadCount} unread`}>{badgeLabel}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown" role="dialog" aria-label={lang === 'en' ? 'Notifications' : 'Известия'}>
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">
              <span className={`notif-led${unreadCount > 0 ? ' active' : ''}`} aria-hidden="true" />
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
                      {buildNotificationMsg(notification, lang, () => setIsOpen(false), onEntityClick)}
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
