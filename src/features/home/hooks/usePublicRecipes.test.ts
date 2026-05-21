import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePublicRecipes } from './usePublicRecipes';
import { createQueryWrapper } from '../../../test/queryWrapper';

const { mockGetUser, mockLimit, mockOrder, mockNeq, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrder = vi.fn();
  const mockNeq = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();

  mockOrder.mockReturnValue({ limit: mockLimit });
  mockNeq.mockReturnValue({ order: mockOrder });
  mockEq.mockReturnValue({ neq: mockNeq });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });

  return { mockGetUser, mockLimit, mockOrder, mockNeq, mockEq, mockSelect, mockFrom };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}));

const makeDbRow = (overrides = {}) => ({
  id: 'r1',
  user_id: 'user-2',
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
});

describe('usePublicRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockNeq.mockReturnValue({ order: mockOrder });
    mockEq.mockReturnValue({ neq: mockNeq });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns empty array and stops loading when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => usePublicRecipes(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.publicRecipes).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches public recipes from other users and maps them to Recipe type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockLimit.mockResolvedValue({ data: [makeDbRow()], error: null });

    const { result } = renderHook(() => usePublicRecipes(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('recipes');
    expect(mockEq).toHaveBeenCalledWith('is_public', true);
    expect(mockNeq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.current.publicRecipes).toHaveLength(1);
    expect(result.current.publicRecipes[0]).toEqual({
      id: 'r1',
      name: 'Pancakes',
      nameEn: 'Pancakes',
      emoji: '🥞',
      imageUrl: undefined,
      ingredients: ['flour', 'egg'],
      steps: ['mix', 'fry'],
      time: 15,
      tags: ['breakfast'],
      requiredIngredients: ['flour'],
      isAI: false,
      isPublic: true,
      authorId: 'user-2',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
    });
    expect(result.current.loading).toBe(false);
  });

  it('selects only the required recipe fields – no wildcard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockLimit.mockResolvedValue({ data: [], error: null });

    renderHook(() => usePublicRecipes(), { wrapper: createQueryWrapper() });
    await act(async () => {});

    expect(mockSelect).toHaveBeenCalledWith(
      'id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email',
    );
  });

  it('returns empty array when query returns null data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockLimit.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePublicRecipes(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.publicRecipes).toEqual([]);
  });

  it('handles null optional fields gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockLimit.mockResolvedValue({
      data: [makeDbRow({ name_en: null, author_name: null, author_email: null })],
      error: null,
    });

    const { result } = renderHook(() => usePublicRecipes(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.publicRecipes[0].nameEn).toBeUndefined();
    expect(result.current.publicRecipes[0].authorName).toBeUndefined();
    expect(result.current.publicRecipes[0].authorEmail).toBeUndefined();
  });
});
