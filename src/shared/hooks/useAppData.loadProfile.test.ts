import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockSingle, mockEq, mockSelect, mockInsert, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();

  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });

  return { mockSingle, mockEq, mockSelect, mockInsert, mockFrom, mockGetUser };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: mockFrom,
  },
}));

function makeFromChain(profileData: object | null) {
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
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } });
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
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-2', user_metadata: { name: 'Мария' } } },
    });
    makeFromChain(null);

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-2', name: 'Мария' }),
    );
    expect(result.current.profile.name).toBe('Мария');
  });

  it('creates a new row with empty name when user_metadata has no name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-3', user_metadata: {} } },
    });
    makeFromChain(null);

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-3', name: '' }),
    );
    expect(result.current.profile.name).toBe('');
  });

  it('does not load profile when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('exposes the authenticated userId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-42', user_metadata: {} } } });
    makeFromChain({ name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.userId).toBe('user-42');
  });

  it('exposes empty userId when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.userId).toBe('');
  });

  it('selects only the required user profile fields – no wildcard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } });
    makeFromChain({ name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] });

    renderHook(() => useAppData());
    await act(async () => {});

    expect(mockSelect).toHaveBeenCalledWith('name, allergies, dislikes, dietary_prefs');
  });
});
