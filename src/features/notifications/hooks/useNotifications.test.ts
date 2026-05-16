import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';

const { mockGetUser, mockFrom, mockRemoveChannel, mockChannel, mockLimit, mockOrder, mockSelect, mockEq, mockIn, mockUpdate, mockDelete } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  const mockIn = vi.fn();
  const mockEq = vi.fn();
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq, in: mockIn });
  const mockDelete = vi.fn().mockReturnValue({ eq: mockEq, in: mockIn });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, update: mockUpdate, delete: mockDelete });
  const mockGetUser = vi.fn();
  const mockRemoveChannel = vi.fn();
  const mockChannel = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  });

  return { mockGetUser, mockFrom, mockRemoveChannel, mockChannel, mockLimit, mockOrder, mockSelect, mockEq, mockIn, mockUpdate, mockDelete };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

const makeRow = (overrides = {}) => ({
  id: 'n1',
  actor_id: 'u2',
  type: 'recipe_favorited',
  entity_id: 'r1',
  entity_type: 'recipe',
  is_read: false,
  created_at: '2024-01-01T10:00:00Z',
  actor: { name: 'Alice' },
  ...overrides,
});

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq, in: mockIn });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockDelete.mockReturnValue({ eq: mockEq, in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, delete: mockDelete });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockEq.mockResolvedValue({ error: null });
    mockIn.mockResolvedValue({ error: null });
  });

  it('stays empty and does not query when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads and maps notification rows on mount', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow()], error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      id: 'n1',
      actorId: 'u2',
      type: 'recipe_favorited',
      entityId: 'r1',
      entityType: 'recipe',
      isRead: false,
      actorName: 'Alice',
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it('maps null actor to null actorName', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ actor: null, actor_id: null })], error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications[0].actorName).toBeNull();
    expect(result.current.notifications[0].actorId).toBeNull();
  });

  it('counts only unread notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1', is_read: false }), makeRow({ id: 'n2', is_read: true })],
      error: null,
    });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it('markAsRead optimistically updates isRead then calls DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: false })], error: null });
    mockEq.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications[0].isRead).toBe(false);

    await act(async () => { result.current.markAsRead('n1'); });

    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
    expect(mockEq).toHaveBeenCalledWith('id', 'n1');
  });

  it('markAsRead rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: false })], error: null });
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAsRead('n1'); });

    expect(result.current.notifications[0].isRead).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it('markAllAsRead marks all unread and calls DB with their IDs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1', is_read: false }), makeRow({ id: 'n2', is_read: false })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsRead(); });

    expect(result.current.unreadCount).toBe(0);
    expect(mockIn).toHaveBeenCalledWith('id', ['n1', 'n2']);
  });

  it('markAllAsRead is a no-op when there are no unread notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: true })], error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsRead(); });

    expect(mockIn).not.toHaveBeenCalled();
  });

  it('markAllAsRead rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1', is_read: false }), makeRow({ id: 'n2', is_read: false })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsRead(); });

    expect(result.current.notifications[0].isRead).toBe(false);
    expect(result.current.notifications[1].isRead).toBe(false);
    expect(result.current.unreadCount).toBe(2);
  });

  it('loadNotifications logs error and does not update state on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('loadNotifications error:', { message: 'DB error' });
    consoleSpy.mockRestore();
  });

  it('does not crash when getUser rejects', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('getUser error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('subscribes to realtime channel for the authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(mockChannel).toHaveBeenCalledWith('notifications:u1');
  });

  it('removes the realtime channel on unmount', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const { unmount } = renderHook(() => useNotifications('en'));
    await act(async () => {});
    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('markAsUnread optimistically updates isRead then calls DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: true })], error: null });
    mockEq.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications[0].isRead).toBe(true);

    await act(async () => { result.current.markAsUnread('n1'); });

    expect(result.current.notifications[0].isRead).toBe(false);
    expect(result.current.unreadCount).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'n1');
  });

  it('markAsUnread rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: true })], error: null });
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAsUnread('n1'); });

    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('markAllAsUnread marks all read and calls DB with their IDs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1', is_read: true }), makeRow({ id: 'n2', is_read: true })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsUnread(); });

    expect(result.current.unreadCount).toBe(2);
    expect(mockIn).toHaveBeenCalledWith('id', ['n1', 'n2']);
  });

  it('markAllAsUnread is a no-op when there are no read notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1', is_read: false })], error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsUnread(); });

    expect(mockIn).not.toHaveBeenCalled();
  });

  it('markAllAsUnread rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1', is_read: true }), makeRow({ id: 'n2', is_read: true })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.markAllAsUnread(); });

    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.notifications[1].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('deleteNotification optimistically removes the item then calls DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1' })], error: null });
    mockEq.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    expect(result.current.notifications).toHaveLength(1);

    await act(async () => { result.current.deleteNotification('n1'); });

    expect(result.current.notifications).toHaveLength(0);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'n1');
  });

  it('deleteNotification re-fetches from DB on error instead of restoring a stale snapshot', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [makeRow({ id: 'n1' })], error: null });
    mockEq.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.deleteNotification('n1'); });

    expect(result.current.notifications).toHaveLength(1);
    expect(mockLimit).toHaveBeenCalledTimes(2);
  });

  it('deleteAllNotifications optimistically clears all items then calls DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1' }), makeRow({ id: 'n2' })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.deleteAllNotifications(); });

    expect(result.current.notifications).toHaveLength(0);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockIn).toHaveBeenCalledWith('id', ['n1', 'n2']);
  });

  it('deleteAllNotifications is a no-op when there are no notifications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.deleteAllNotifications(); });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deleteAllNotifications re-fetches from DB on error instead of restoring a stale snapshot', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockLimit.mockResolvedValue({
      data: [makeRow({ id: 'n1' }), makeRow({ id: 'n2' })],
      error: null,
    });
    mockIn.mockResolvedValue({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useNotifications('en'));
    await act(async () => {});

    await act(async () => { result.current.deleteAllNotifications(); });

    expect(result.current.notifications).toHaveLength(2);
    expect(mockLimit).toHaveBeenCalledTimes(2);
  });
});
