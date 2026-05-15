import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useFavorites } from './useFavorites';
import type { Recipe } from '../../../shared/types';

const { mockGetUser, mockSelect, mockInsert, mockEq, mockDelete, mockFrom } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockEq = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();

  mockDelete.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete });

  return { mockGetUser, mockSelect, mockInsert, mockEq, mockDelete, mockFrom };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}));

const makeDbRow = (overrides = {}) => ({
  recipe_id: 'r1',
  recipes: {
    id: 'r1',
    name: 'Pancakes',
    name_en: 'Pancakes',
    emoji: '🥞',
    ingredients: ['flour', 'egg'],
    steps: ['mix', 'fry'],
    time: 15,
    tags: ['breakfast'],
    required_ingredients: ['flour'],
    is_ai: false,
    is_public: true,
    author_name: 'Alice',
    author_email: 'alice@example.com',
    ...overrides,
  },
});

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Pancakes',
  nameEn: 'Pancakes',
  emoji: '🥞',
  ingredients: ['flour', 'egg'],
  steps: ['mix', 'fry'],
  time: 15,
  tags: ['breakfast'],
  requiredIngredients: ['flour'],
  isAI: false,
  isPublic: true,
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  ...overrides,
});

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, delete: mockDelete });
  });

  it('returns empty state when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toEqual([]);
    expect(result.current.favoriteRecipes).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads favorites and maps them to Recipe type on mount', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(mockFrom).toHaveBeenCalledWith('favorites');
    expect(mockSelect).toHaveBeenCalledWith('recipe_id, recipes(*)');
    expect(result.current.favoriteIds).toEqual(['r1']);
    expect(result.current.favoriteRecipes).toHaveLength(1);
    expect(result.current.favoriteRecipes[0].name).toBe('Pancakes');
  });

  it('returns empty state when query returns null data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toEqual([]);
    expect(result.current.favoriteRecipes).toEqual([]);
  });

  it('filters out rows where the joined recipe is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({
      data: [{ recipe_id: 'deleted-id', recipes: null }],
      error: null,
    });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toEqual(['deleted-id']);
    expect(result.current.favoriteRecipes).toEqual([]);
  });

  it('addFavorite — optimistically updates state and calls insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    const recipe = makeRecipe();
    await act(async () => { result.current.toggleFavorite(recipe); });

    expect(result.current.favoriteIds).toContain('r1');
    expect(result.current.favoriteRecipes).toHaveLength(1);
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', recipe_id: 'r1' });
  });

  it('removeFavorite — optimistically removes from state and calls delete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toContain('r1');

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(result.current.favoriteIds).not.toContain('r1');
    expect(result.current.favoriteRecipes).toHaveLength(0);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('recipe_id', 'r1');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('toggleFavorite adds when not yet favorited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe({ id: 'new-id' })); });

    expect(result.current.favoriteIds).toContain('new-id');
  });

  it('toggleFavorite removes when already favorited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe({ id: 'r1' })); });

    expect(result.current.favoriteIds).not.toContain('r1');
  });

  it('handles null optional fields in joined recipe row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({
      data: [makeDbRow({ name_en: null, author_name: null, author_email: null })],
      error: null,
    });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteRecipes[0].nameEn).toBeUndefined();
    expect(result.current.favoriteRecipes[0].authorName).toBeUndefined();
  });

  it('loads multiple favorites and maps all rows correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const row1 = makeDbRow();
    const row2 = { recipe_id: 'r2', recipes: { ...makeDbRow().recipes, id: 'r2', name: 'Waffles' } };
    mockSelect.mockResolvedValue({ data: [row1, row2], error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toEqual(['r1', 'r2']);
    expect(result.current.favoriteRecipes).toHaveLength(2);
    expect(result.current.favoriteRecipes[0].name).toBe('Pancakes');
    expect(result.current.favoriteRecipes[1].name).toBe('Waffles');
  });

  it('addFavorite is a no-op when user is null — state and DB unchanged', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(result.current.favoriteIds).toEqual([]);
    expect(result.current.favoriteRecipes).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('removeFavorite is a no-op when user becomes null — state and DB unchanged', async () => {
    mockGetUser
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
      .mockResolvedValueOnce({ data: { user: null } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    expect(result.current.favoriteIds).toContain('r1');

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(result.current.favoriteIds).toEqual(['r1']);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('rapid double-toggle does not create duplicate state entries', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useFavorites());
    await act(async () => {});

    const recipe = makeRecipe();
    await act(async () => {
      result.current.toggleFavorite(recipe);
      result.current.toggleFavorite(recipe);
    });

    expect(result.current.favoriteIds).toEqual(['r1']);
    expect(result.current.favoriteRecipes).toHaveLength(1);
  });

  it('addFavorite shows success toast when insert succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });
    vi.mocked(toast.success).mockClear();

    const { result } = renderHook(() => useFavorites('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(toast.success).toHaveBeenCalledWith('Added to favorites');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('addFavorite shows error toast and does not show success toast when insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: { message: 'DB insert error' } });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    const { result } = renderHook(() => useFavorites('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(toast.error).toHaveBeenCalledWith('Failed to add to favorites');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('removeFavorite shows success toast when delete succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ error: null });
    vi.mocked(toast.success).mockClear();

    const { result } = renderHook(() => useFavorites('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(toast.success).toHaveBeenCalledWith('Removed from favorites');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('removeFavorite shows error toast and does not show success toast when delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSelect.mockResolvedValue({ data: [makeDbRow()], error: null });
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ error: { message: 'DB delete error' } });
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    const { result } = renderHook(() => useFavorites('en'));
    await act(async () => {});

    await act(async () => { result.current.toggleFavorite(makeRecipe()); });

    expect(toast.error).toHaveBeenCalledWith('Failed to remove from favorites');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
