import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import type { Notification } from '../../../shared/types';

vi.mock('sonner', () => ({ toast: vi.fn() }));

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
    expect(screen.getByText('Alice added your recipe to favorites')).toBeInTheDocument();
  });

  it('uses anonymous fallback when actorName is null', () => {
    const notifications = [makeNotification({ actorName: null })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Someone added your recipe to favorites')).toBeInTheDocument();
  });

  it('calls onMarkAsRead with the notification id when clicking a notification', () => {
    const onMarkAsRead = vi.fn();
    const notifications = [makeNotification({ id: 'n42' })];
    render(<NotificationBell {...defaultProps} notifications={notifications} unreadCount={1} onMarkAsRead={onMarkAsRead} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    fireEvent.click(screen.getByText('Alice added your recipe to favorites'));
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

  it('renders labels in bulgarian when lang is bg', () => {
    render(<NotificationBell {...defaultProps} lang="bg" notifications={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /известия/i }));
    expect(screen.getByText('Няма известия')).toBeInTheDocument();
  });

  it('shows bulgarian notification message', () => {
    const notifications = [makeNotification({ actorName: 'Иван' })];
    render(<NotificationBell {...defaultProps} lang="bg" notifications={notifications} unreadCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: /известия/i }));
    expect(screen.getByText('Иван добави рецептата ти в любими')).toBeInTheDocument();
  });
});
