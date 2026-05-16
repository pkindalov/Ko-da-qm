import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollows } from './useFollows';

const { mockGetUser, mockFrom, mockSelect, mockEq, mockInsert, mockDelete, mockDeleteEq1, mockDeleteEq2 } = vi.hoisted(() => {
  const mockEq = vi.fn();
  // delete chain: .delete().eq(follower_id).eq(following_id) — two chained eqs
  const mockDeleteEq2 = vi.fn();
  const mockDeleteEq1 = vi.fn().mockReturnValue({ eq: mockDeleteEq2 });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = vi.fn();
  const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq1 });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete });
  const mockGetUser = vi.fn();

  return { mockGetUser, mockFrom, mockSelect, mockEq, mockInsert, mockDelete, mockDeleteEq1, mockDeleteEq2 };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
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
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toEqual([]);
    expect(result.current.currentUserId).toBe('');
    expect(result.current.loading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads followingIds for the authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }, { following_id: 'u3' }], error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toEqual(['u2', 'u3']);
    expect(result.current.currentUserId).toBe('u1');
    expect(result.current.loading).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith('follows');
    expect(mockEq).toHaveBeenCalledWith('follower_id', 'u1');
  });

  it('returns empty followingIds when DB returns empty array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('logs error and keeps empty followingIds on DB load error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('useFollows load error:', { message: 'DB error' });
    consoleSpy.mockRestore();
  });

  it('does not crash when getUser rejects', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('useFollows getUser error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('toggleFollow adds a new follow optimistically', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).toContain('u2');
    expect(mockInsert).toHaveBeenCalledWith({ follower_id: 'u1', following_id: 'u2' });
  });

  it('toggleFollow removes an existing follow optimistically', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }], error: null });
    mockDeleteEq2.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    expect(result.current.followingIds).toContain('u2');

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).not.toContain('u2');
    expect(mockDelete).toHaveBeenCalled();
  });

  it('follow rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).not.toContain('u2');
    consoleSpy.mockRestore();
  });

  it('unfollow rolls back optimistic update on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [{ following_id: 'u2' }], error: null });
    mockDeleteEq2.mockResolvedValue({ error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u2'); });

    expect(result.current.followingIds).toContain('u2');
    consoleSpy.mockRestore();
  });

  it('does not follow own user ID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u1'); });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.current.followingIds).not.toContain('u1');
  });

  it('does not add duplicate entries when following the same user twice', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockEq.mockResolvedValueOnce({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFollows('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFollow('u3'); });
    // second call: u3 is now in followingIds, so this toggles it off (unfollow)
    mockDeleteEq2.mockResolvedValue({ error: null });
    await act(async () => { result.current.toggleFollow('u3'); });

    expect(result.current.followingIds.filter((id) => id === 'u3')).toHaveLength(0);
  });
});
