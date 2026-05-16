import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import type { Notification } from '../../../shared/types';

vi.mock('sonner', () => ({ toast: vi.fn() }));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, onClick, className }: { children: React.ReactNode; to: string; onClick?: () => void; className?: string }) => (
    <a href={to} onClick={onClick} className={className}>{children}</a>
  ),
}));

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  actorId: 'u2',
  type: 'recipe_favorited',
  entityId: 'r1',
  entityType: 'recipe',
  isRead: false,
  createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
  actorName: 'Alice',
  ...overrides,
});

const defaultProps = {
  notifications: [] as Notification[],
  unreadCount: 0,
  onMarkAsRead: vi.fn(),
  onMarkAllAsRead: vi.fn(),
  onMarkAsUnread: vi.fn(),
  onMarkAllAsUnread: vi.fn(),
  onDeleteNotification: vi.fn(),
  onDeleteAll: vi.fn(),
  lang: 'en' as const,
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the bell button', () => {
    render(<NotificationBell {...defaultProps} />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('does not show badge when unreadCount is 0', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} />);
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });

  it('shows unread badge with the correct count', () => {
    render(<NotificationBell {...defaultProps} unreadCount={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows 99+ when unreadCount exceeds 99', () => {
    render(<NotificationBell {...defaultProps} unreadCount={100} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('dropdown is not visible before clicking the bell', () => {
    render(<NotificationBell {...defaultProps} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens dropdown when bell button is clicked', () => {
    render(<NotificationBell {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows empty state message when there are no notifications', () => {
    render(<NotificationBell {...defaultProps} notifications={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows notification message in the dropdown', () => {
    const notifications = [makeNotification({ actorName: 'Alice' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(
      screen.getByText((_, el) => el?.textContent === 'Alice added your recipe to favorites'),
    ).toBeInTheDocument();
  });

  it('renders actor name as a link to their profile', () => {
    const notifications = [makeNotification({ actorName: 'Alice', actorId: 'u2' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', '/user/u2');
  });

  it('uses anonymous fallback when actorName is null', () => {
    const notifications = [makeNotification({ actorName: null, actorId: null })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Someone added your recipe to favorites')).toBeInTheDocument();
  });

  it('renders anonymous label as a profile link when actorId is set but actorName is null', () => {
    const notifications = [makeNotification({ actorName: null, actorId: 'u99' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    const link = screen.getByRole('link', { name: 'Someone' });
    expect(link).toHaveAttribute('href', '/user/u99');
  });

  it('calls onEntityClick with entityType and entityId when entity keyword is clicked', () => {
    const onEntityClick = vi.fn();
    const notifications = [makeNotification({ entityType: 'recipe', entityId: 'r1' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onEntityClick={onEntityClick} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /your recipe/i }));
    expect(onEntityClick).toHaveBeenCalledWith('recipe', 'r1');
  });

  it('closes the dropdown when entity keyword is clicked', () => {
    const onEntityClick = vi.fn();
    const notifications = [makeNotification({ entityType: 'recipe', entityId: 'r1' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onEntityClick={onEntityClick} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /your recipe/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders entity keyword as plain text when entityId is null', () => {
    const onEntityClick = vi.fn();
    const notifications = [makeNotification({ entityId: null, entityType: null })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onEntityClick={onEntityClick} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByRole('button', { name: /your recipe/i })).not.toBeInTheDocument();
  });

  it('renders entity keyword as plain text when onEntityClick is not provided', () => {
    const notifications = [makeNotification({ entityType: 'recipe', entityId: 'r1' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByRole('button', { name: /your recipe/i })).not.toBeInTheDocument();
  });

  it('calls onMarkAsRead with the notification id when clicking the toggle on an unread notification', () => {
    const onMarkAsRead = vi.fn();
    const notifications = [makeNotification({ id: 'n42' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onMarkAsRead={onMarkAsRead} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as read/i }));
    expect(onMarkAsRead).toHaveBeenCalledWith('n42');
  });

  it('shows Mark all read button when there are unread notifications', () => {
    const notifications = [makeNotification()];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('does not show Mark all read button when all are read', () => {
    const notifications = [makeNotification({ isRead: true })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={0} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('calls onMarkAllAsRead when Mark all read is clicked', () => {
    const onMarkAllAsRead = vi.fn();
    const notifications = [makeNotification()];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onMarkAllAsRead={onMarkAllAsRead} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('Mark all read'));
    expect(onMarkAllAsRead).toHaveBeenCalled();
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <NotificationBell {...defaultProps} />
        <div data-testid="outside">outside</div>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onMarkAsUnread when clicking the toggle on a read notification', () => {
    const onMarkAsUnread = vi.fn();
    const notifications = [makeNotification({ id: 'n1', isRead: true })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={0} onMarkAsUnread={onMarkAsUnread} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as unread/i }));
    expect(onMarkAsUnread).toHaveBeenCalledWith('n1');
  });

  it('does not call onMarkAsRead when clicking the toggle on an already-read notification', () => {
    const onMarkAsRead = vi.fn();
    const notifications = [makeNotification({ id: 'n1', isRead: true })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={0} onMarkAsRead={onMarkAsRead} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as unread/i }));
    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it('shows Mark all unread button when there are read notifications', () => {
    const notifications = [makeNotification({ isRead: true })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={0} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Mark all unread')).toBeInTheDocument();
  });

  it('does not show Mark all unread button when all are unread', () => {
    const notifications = [makeNotification({ isRead: false })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByText('Mark all unread')).not.toBeInTheDocument();
  });

  it('calls onMarkAllAsUnread when Mark all unread is clicked', () => {
    const onMarkAllAsUnread = vi.fn();
    const notifications = [makeNotification({ isRead: true })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={0} onMarkAllAsUnread={onMarkAllAsUnread} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('Mark all unread'));
    expect(onMarkAllAsUnread).toHaveBeenCalled();
  });

  it('shows Mark read toggle label on unread items and Mark unread on read items', () => {
    const notifications = [
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: true, actorName: 'Bob' }),
    ];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as unread/i })).toBeInTheDocument();
  });

  it('shows Delete all button when there are notifications', () => {
    const notifications = [makeNotification()];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Delete all')).toBeInTheDocument();
  });

  it('does not show Delete all button when there are no notifications', () => {
    render(<NotificationBell {...defaultProps} notifications={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.queryByText('Delete all')).not.toBeInTheDocument();
  });

  it('calls onDeleteAll when Delete all is clicked', () => {
    const onDeleteAll = vi.fn();
    const notifications = [makeNotification()];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onDeleteAll={onDeleteAll} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('Delete all'));
    expect(onDeleteAll).toHaveBeenCalled();
  });

  it('calls onDeleteNotification with the id when the delete button on an item is clicked', () => {
    const onDeleteNotification = vi.fn();
    const notifications = [makeNotification({ id: 'n99' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onDeleteNotification={onDeleteNotification} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete notification/i }));
    expect(onDeleteNotification).toHaveBeenCalledWith('n99');
  });

  it('renders labels in bulgarian when lang is bg', () => {
    render(<NotificationBell {...defaultProps} lang="bg" notifications={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /известия/i }));
    expect(screen.getByText('Няма известия')).toBeInTheDocument();
  });

  it('shows bulgarian notification message', () => {
    const notifications = [makeNotification({ actorName: 'Иван' })];
    render(<NotificationBell {...defaultProps} lang="bg" notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /известия/i }));
    expect(
      screen.getByText((_, el) => el?.textContent === 'Иван добави рецептата ти в любими'),
    ).toBeInTheDocument();
  });
});
