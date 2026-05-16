import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedRecipes } from './useFeedRecipes';

const { mockFrom, mockSelect, mockIn, mockEq, mockOrder, mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockIn = vi.fn().mockReturnValue({ eq: mockEq });
  const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return { mockFrom, mockSelect, mockIn, mockEq, mockOrder, mockLimit };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

const makeDbRow = (overrides = {}) => ({
  id: 'r1',
  user_id: 'u2',
  name: 'Pasta',
  name_en: 'Pasta',
  emoji: '🍝',
  ingredients: ['pasta', 'sauce'],
  steps: ['boil', 'mix'],
  time: 20,
  tags: ['italian'],
  required_ingredients: ['pasta'],
  is_ai: false,
  is_public: true,
  image_url: null,
  author_name: 'Alice',
  author_email: 'alice@example.com',
  ...overrides,
});

describe('useFeedRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockReturnValue(undefined);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockEq.mockReturnValue({ order: mockOrder });
    mockIn.mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns empty recipes and stops loading when followingIds is empty', async () => {
    const { result } = renderHook(() => useFeedRecipes([]));
    await act(async () => {});

    expect(result.current.recipes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches public recipes from followed users and maps them', async () => {
    mockLimit.mockResolvedValue({ data: [makeDbRow()], error: null });

    const { result } = renderHook(() => useFeedRecipes(['u2']));
    await act(async () => {});

    expect(mockFrom).toHaveBeenCalledWith('recipes');
    expect(mockIn).toHaveBeenCalledWith('user_id', ['u2']);
    expect(mockEq).toHaveBeenCalledWith('is_public', true);
    expect(result.current.recipes).toHaveLength(1);
    expect(result.current.recipes[0]).toMatchObject({
      id: 'r1',
      name: 'Pasta',
      authorId: 'u2',
    });
    expect(result.current.loading).toBe(false);
  });

  it('selects only required fields – no wildcard', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    renderHook(() => useFeedRecipes(['u2']));
    await act(async () => {});

    expect(mockSelect).toHaveBeenCalledWith(
      'id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email',
    );
  });

  it('orders by created_at descending', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    renderHook(() => useFeedRecipes(['u2']));
    await act(async () => {});

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when query returns null data', async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useFeedRecipes(['u2']));
    await act(async () => {});

    expect(result.current.recipes).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('logs error and stops loading on DB error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFeedRecipes(['u2']));
    await act(async () => {});

    expect(result.current.recipes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('useFeedRecipes load error:', { message: 'DB error' });
    consoleSpy.mockRestore();
  });

  it('passes multiple following IDs to the query', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    renderHook(() => useFeedRecipes(['u2', 'u3', 'u4']));
    await act(async () => {});

    expect(mockIn).toHaveBeenCalledWith('user_id', ['u2', 'u3', 'u4']);
  });

  it('stays loading and does not query when enabled is false', async () => {
    const { result } = renderHook(() => useFeedRecipes(['u2'], false));
    await act(async () => {});

    expect(result.current.loading).toBe(true);
    expect(result.current.recipes).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not query when followingIds transitions from non-empty to empty', async () => {
    mockLimit.mockResolvedValue({ data: [makeDbRow()], error: null });

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useFeedRecipes(ids),
      { initialProps: { ids: ['u2'] } },
    );
    await act(async () => {});
    expect(result.current.recipes).toHaveLength(1);

    mockFrom.mockClear();
    rerender({ ids: [] });
    await act(async () => {});

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.recipes).toEqual([]);
  });
});
