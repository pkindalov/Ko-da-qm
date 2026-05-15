import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserProfile } from './useUserProfile';

const makeDbRow = (overrides = {}) => ({
  id: 'recipe-1',
  user_id: 'user-42',
  name: 'Баница',
  name_en: 'Banitsa',
  emoji: '🥐',
  image_url: null,
  ingredients: ['flour', 'eggs', 'feta'],
  steps: ['mix', 'bake'],
  time: 45,
  tags: ['breakfast'],
  required_ingredients: ['flour'],
  is_ai: false,
  is_public: true,
  author_name: 'Petya',
  author_email: 'petya@example.com',
  ...overrides,
});

const { mockRecipesOrder, mockRecipesEq2, mockRecipesEq1, mockRecipesSelect, mockUsersEq, mockUsersSingle, mockUsersSelect, mockFrom } = vi.hoisted(() => {
  const mockUsersSingle = vi.fn();
  const mockUsersEq = vi.fn();
  const mockUsersSelect = vi.fn();

  const mockRecipesOrder = vi.fn();
  const mockRecipesEq2 = vi.fn();
  const mockRecipesEq1 = vi.fn();
  const mockRecipesSelect = vi.fn();

  const mockFrom = vi.fn();

  mockUsersEq.mockReturnValue({ single: mockUsersSingle });
  mockUsersSelect.mockReturnValue({ eq: mockUsersEq });

  mockRecipesOrder.mockResolvedValue({ data: [], error: null });
  mockRecipesEq2.mockReturnValue({ order: mockRecipesOrder });
  mockRecipesEq1.mockReturnValue({ eq: mockRecipesEq2 });
  mockRecipesSelect.mockReturnValue({ eq: mockRecipesEq1 });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') return { select: mockUsersSelect };
    return { select: mockRecipesSelect };
  });

  return { mockRecipesOrder, mockRecipesEq2, mockRecipesEq1, mockRecipesSelect, mockUsersEq, mockUsersSingle, mockUsersSelect, mockFrom };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsersEq.mockReturnValue({ single: mockUsersSingle });
    mockUsersSelect.mockReturnValue({ eq: mockUsersEq });

    mockRecipesOrder.mockResolvedValue({ data: [], error: null });
    mockRecipesEq2.mockReturnValue({ order: mockRecipesOrder });
    mockRecipesEq1.mockReturnValue({ eq: mockRecipesEq2 });
    mockRecipesSelect.mockReturnValue({ eq: mockRecipesEq1 });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return { select: mockUsersSelect };
      return { select: mockRecipesSelect };
    });
  });

  it('returns empty state and stops loading when userId is empty', async () => {
    const { result } = renderHook(() => useUserProfile(''));
    await act(async () => {});

    expect(result.current.recipes).toEqual([]);
    expect(result.current.userName).toBe('');
    expect(result.current.loading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches public recipes and user name for the given userId', async () => {
    mockRecipesOrder.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockUsersSingle.mockResolvedValue({ data: { name: 'Petya' }, error: null });

    const { result } = renderHook(() => useUserProfile('user-42'));
    await act(async () => {});

    expect(mockFrom).toHaveBeenCalledWith('recipes');
    expect(mockRecipesEq1).toHaveBeenCalledWith('user_id', 'user-42');
    expect(mockRecipesEq2).toHaveBeenCalledWith('is_public', true);

    expect(result.current.userName).toBe('Petya');
    expect(result.current.recipes).toHaveLength(1);
    expect(result.current.recipes[0]).toMatchObject({
      id: 'recipe-1',
      name: 'Баница',
      authorId: 'user-42',
      isPublic: true,
    });
    expect(result.current.loading).toBe(false);
  });

  it('falls back to author_name from recipes when users table returns no name', async () => {
    mockRecipesOrder.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockUsersSingle.mockResolvedValue({ data: { name: '' }, error: null });

    const { result } = renderHook(() => useUserProfile('user-42'));
    await act(async () => {});

    expect(result.current.userName).toBe('Petya');
  });

  it('selects only the required recipe fields – no wildcard', async () => {
    mockRecipesOrder.mockResolvedValue({ data: [], error: null });
    mockUsersSingle.mockResolvedValue({ data: { name: '' }, error: null });

    renderHook(() => useUserProfile('user-42'));
    await act(async () => {});

    expect(mockRecipesSelect).toHaveBeenCalledWith(
      'id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email',
    );
  });

  it('returns empty recipes when query returns null', async () => {
    mockRecipesOrder.mockResolvedValue({ data: null, error: null });
    mockUsersSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useUserProfile('user-42'));
    await act(async () => {});

    expect(result.current.recipes).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
