import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveGeminiRecipe } from './useSaveGeminiRecipe';
import type { MatchedRecipe } from '../utils/matchFromFridge';

const mockGetUser = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  },
}));

const makeMatchedRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: 'gemini-1-0',
  name: 'Яйца с масло',
  nameEn: 'Eggs with butter',
  emoji: '🍳',
  ingredients: ['2 eggs', '1 tbsp butter'],
  requiredIngredients: ['eggs', 'butter'],
  steps: ['Crack eggs', 'Fry in butter'],
  time: 10,
  tags: ['breakfast'],
  isAI: true,
  isPublic: false,
  matchScore: 1,
  matchedCount: 2,
  ...overrides,
});

const authenticatedUser = { id: 'user-1', email: 'test@example.com' };

describe('useSaveGeminiRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('returns empty savedIds initially', () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));
    expect(result.current.savedIds.size).toBe(0);
    expect(result.current.savingId).toBeNull();
    expect(result.current.saveError).toBeNull();
  });

  it('saves a recipe successfully and adds id to savedIds', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));
    const recipe = makeMatchedRecipe();

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(recipe, false);
    });

    expect(success!).toBe(true);
    expect(result.current.savedIds.has(recipe.id)).toBe(true);
    expect(result.current.saveError).toBeNull();
  });

  it('inserts correct fields into the recipes table', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Chef Name'));
    const recipe = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(recipe, true);
    });

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.name).toBe(recipe.name);
    expect(insertArg.name_en).toBe(recipe.nameEn);
    expect(insertArg.emoji).toBe(recipe.emoji);
    expect(insertArg.ingredients).toEqual(recipe.ingredients);
    expect(insertArg.steps).toEqual(recipe.steps);
    expect(insertArg.time).toBe(recipe.time);
    expect(insertArg.tags).toEqual(recipe.tags);
    expect(insertArg.required_ingredients).toEqual(recipe.requiredIngredients);
    expect(insertArg.is_ai).toBe(true);
    expect(insertArg.is_public).toBe(true);
    expect(insertArg.user_id).toBe(authenticatedUser.id);
    expect(insertArg.author_name).toBe('Chef Name');
    expect(insertArg.author_email).toBe(authenticatedUser.email);
    expect(typeof insertArg.id).toBe('string');
    expect(insertArg.id.length).toBeGreaterThan(0);
  });

  it('inserts with is_public false when user picks private', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(mockInsert.mock.calls[0][0].is_public).toBe(false);
  });

  it('prevents double save: returns true and skips insert on second call', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));
    const recipe = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(recipe, false);
    });

    let secondResult: boolean;
    await act(async () => {
      secondResult = await result.current.saveRecipe(recipe, false);
    });

    expect(secondResult!).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('sets saveError and returns false on DB error', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') });
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(success!).toBe(false);
    expect(result.current.saveError).toBe('save_failed');
    expect(result.current.savedIds.size).toBe(0);
  });

  it('sets saveError and returns false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(success!).toBe(false);
    expect(result.current.saveError).toBe('save_failed');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('clears saveError at the start of a new save attempt', async () => {
    mockInsert.mockResolvedValueOnce({ error: new Error('DB error') });
    mockInsert.mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ id: 'r1' }), false);
    });
    expect(result.current.saveError).toBe('save_failed');

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ id: 'r2' }), false);
    });
    expect(result.current.saveError).toBeNull();
  });

  it('clearSaveError removes the error', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') });
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });
    expect(result.current.saveError).toBe('save_failed');

    act(() => {
      result.current.clearSaveError();
    });
    expect(result.current.saveError).toBeNull();
  });

  it('savingId is set during save and null after', async () => {
    let savingIdDuringSave: string | null = null;

    mockInsert.mockImplementationOnce(async () => {
      savingIdDuringSave = 'captured-during-save';
      return { error: null };
    });

    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));
    const recipe = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(recipe, false);
    });

    expect(savingIdDuringSave).toBe('captured-during-save');
    expect(result.current.savingId).toBeNull();
  });

  it('uses null for author_name when authorName is empty string', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe(''));

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(mockInsert.mock.calls[0][0].author_name).toBeNull();
  });

  it('uses null for name_en when nameEn is undefined', async () => {
    const { result } = renderHook(() => useSaveGeminiRecipe('Test User'));
    const recipe = makeMatchedRecipe({ nameEn: undefined });

    await act(async () => {
      await result.current.saveRecipe(recipe, false);
    });

    expect(mockInsert.mock.calls[0][0].name_en).toBeNull();
  });
});
