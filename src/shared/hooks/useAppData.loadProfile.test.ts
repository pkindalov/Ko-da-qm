import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockSingle, mockEq, mockSelect, mockInsert, mockFrom, mockGetSession } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  const mockGetSession = vi.fn();

  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });

  return { mockSingle, mockEq, mockSelect, mockInsert, mockFrom, mockGetSession };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
  },
}));

const makeFromChain = (profileData: object | null) => {
  mockSingle.mockResolvedValue({ data: profileData, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ data: null, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') return { select: mockSelect, insert: mockInsert };
    return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
  });
}

describe('useAppData – loadProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads profile data from the users table and sets in-memory state', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    makeFromChain({
      name: 'Иван',
      allergies: ['глутен'],
      dislikes: ['лук'],
      dietary_prefs: ['vegan'],
    });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(result.current.profile).toEqual({
      name: 'Иван',
      allergies: ['глутен'],
      dislikes: ['лук'],
      dietaryPrefs: ['vegan'],
    });
  });

  it('creates a new row in users using user_metadata name and sets in-memory state', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-2', user_metadata: { name: 'Мария' } } } } });
    makeFromChain(null);

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-2', name: 'Мария' }),
    );
    expect(result.current.profile.name).toBe('Мария');
  });

  it('creates a new row with empty name when user_metadata has no name', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-3', user_metadata: {} } } } });
    makeFromChain(null);

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-3', name: '' }),
    );
    expect(result.current.profile.name).toBe('');
  });

  it('does not load profile when there is no authenticated user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('exposes the authenticated userId', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-42', user_metadata: {} } } } });
    makeFromChain({ name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.userId).toBe('user-42');
  });

  it('exposes empty userId when there is no authenticated user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.userId).toBe('');
  });

  it('remains loading until DB data has been fetched, not just until session resolves', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });

    let resolveProfile!: (value: { data: object; error: null }) => void;
    const profilePromise = new Promise<{ data: object; error: null }>(
      resolve => { resolveProfile = resolve; }
    );

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: () => profilePromise }) }), insert: mockInsert };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const { result } = renderHook(() => useAppData());

    // Drain microtasks so getSession resolves and code reaches Promise.all,
    // but profilePromise is still pending so Promise.all hasn't settled yet.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveProfile({ data: { name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] }, error: null });
    });

    expect(result.current.loading).toBe(false);
  });

  it('selects only the required user profile fields – no wildcard', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    makeFromChain({ name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] });

    renderHook(() => useAppData());
    await act(async () => {});

    expect(mockSelect).toHaveBeenCalledWith('name, allergies, dislikes, dietary_prefs, disabled_at');
  });
});
