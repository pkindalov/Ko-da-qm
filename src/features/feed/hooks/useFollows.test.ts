import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollows } from './useFollows';
import { createQueryWrapper } from '../../../test/queryWrapper';

const { mockGetSession, mockFrom, mockSelect, mockEq, mockInsert, mockDelete, mockDeleteEq1, mockDeleteEq2 } = vi.hoisted(() => {
  const mockEq = vi.fn();
  // delete chain: .delete().eq(follower_id).eq(following_id) — two chained eqs
  const mockDeleteEq2 = vi.fn();
  const mockDeleteEq1 = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn();
  const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq1 });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete });
  const mockGetSession = vi.fn();

  return { mockGetSession, mockFrom, mockSelect, mockEq, mockInsert, mockDelete, mockDeleteEq1, mockDeleteEq2 };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    from: mockFrom,
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('useFollows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockDeleteEq1.mockReturnValue({ eq: mockDeleteEq2 });
    mockDelete.mockReturnValue({ eq: mockDeleteEq1 });
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete });
  });

  it('returns empty state and stops loading when no user is authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.followingIds).toEqual([]);
    expect(result.current.currentUserId).toBe('');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads followingIds for the authenticated user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }, { following_id: 'u3' }], error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.followingIds).toEqual(['u2', 'u3']);
    expect(result.current.currentUserId).toBe('u1');
    expect(mockFrom).toHaveBeenCalledWith('follows');
    expect(mockEq).toHaveBeenCalledWith('follower_id', 'u1');
  });

  it('returns empty followingIds when DB returns empty array', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.followingIds).toEqual([]);
  });

  it('logs error and keeps empty followingIds on DB load error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.followingIds).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('useFollows load error:', { message: 'DB error' });
    consoleSpy.mockRestore();
  });

  it('does not crash when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.followingIds).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('useFollows getSession error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('toggleFollow adds a new follow optimistically', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.toggleFollow('u2'); });
    await waitFor(() => expect(result.current.followingIds).toContain('u2'));

    expect(mockInsert).toHaveBeenCalledWith({ follower_id: 'u1', following_id: 'u2' });
  });

  it('toggleFollow removes an existing follow optimistically', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }], error: null });
    mockDeleteEq2.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.followingIds).toContain('u2'));

    await act(async () => { result.current.toggleFollow('u2'); });
    await waitFor(() => expect(result.current.followingIds).not.toContain('u2'));

    expect(mockDelete).toHaveBeenCalled();
  });

  it('follow rolls back optimistic update on DB error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).not.toContain('u2');
    consoleSpy.mockRestore();
  });

  it('unfollow rolls back optimistic update on DB error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }], error: null });
    mockDeleteEq2.mockResolvedValue({ error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.followingIds).toContain('u2'));

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).toContain('u2');
    consoleSpy.mockRestore();
  });

  it('does not follow own user ID', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u1'); });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.current.followingIds).not.toContain('u1');
  });

  it('does not add duplicate entries when following the same user twice', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.toggleFollow('u3'); });
    // wait for the optimistic update to land before the second toggle
    await waitFor(() => expect(result.current.followingIds).toContain('u3'));

    // second call: u3 is now in followingIds, so this toggles it off (unfollow)
    mockDeleteEq2.mockResolvedValue({ error: null });
    await act(async () => { result.current.toggleFollow('u3'); });

    await waitFor(() => expect(result.current.followingIds.filter((id) => id === 'u3')).toHaveLength(0));
  });
});
