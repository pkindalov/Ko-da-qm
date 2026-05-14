import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveGeminiRecipe } from './useSaveGeminiRecipe';
import type { MatchedRecipe } from '../utils/matchFromFridge';
import type { Recipe } from '../../../shared/types';

const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
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
  let mockAddRecipe: ReturnType<typeof vi.fn>;
  let mockRemoveRecipe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser } });
    mockAddRecipe = vi.fn();
    mockRemoveRecipe = vi.fn();
  });

  const renderSaveHook = (authorName = 'Test User') =>
    renderHook(() => useSaveGeminiRecipe(
      authorName,
      mockAddRecipe as unknown as (recipe: Recipe) => void,
      mockRemoveRecipe as unknown as (id: string) => void,
    ));

  it('returns empty savedIdMap initially', () => {
    const { result } = renderSaveHook();
    expect(result.current.savedIdMap.size).toBe(0);
    expect(result.current.savingId).toBeNull();
    expect(result.current.saveError).toBeNull();
  });

  it('saves a recipe and adds geminiId → realId mapping', async () => {
    const { result } = renderSaveHook();
    const matched = makeMatchedRecipe();

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(matched, false);
    });

    expect(success!).toBe(true);
    expect(result.current.savedIdMap.has(matched.id)).toBe(true);
    expect(result.current.saveError).toBeNull();
  });

  it('calls addRecipe with a correctly built Recipe object', async () => {
    const { result } = renderSaveHook('Chef Name');
    const matched = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(matched, true);
    });

    expect(mockAddRecipe).toHaveBeenCalledTimes(1);
    const recipe: Recipe = mockAddRecipe.mock.calls[0][0];
    expect(recipe.name).toBe(matched.name);
    expect(recipe.nameEn).toBe(matched.nameEn);
    expect(recipe.emoji).toBe(matched.emoji);
    expect(recipe.ingredients).toEqual(matched.ingredients);
    expect(recipe.steps).toEqual(matched.steps);
    expect(recipe.time).toBe(matched.time);
    expect(recipe.tags).toEqual(matched.tags);
    expect(recipe.requiredIngredients).toEqual(matched.requiredIngredients);
    expect(recipe.isAI).toBe(true);
    expect(recipe.isPublic).toBe(true);
    expect(recipe.authorName).toBe('Chef Name');
    expect(recipe.authorEmail).toBe(authenticatedUser.email);
    expect(typeof recipe.id).toBe('string');
    expect(recipe.id.length).toBeGreaterThan(0);
  });

  it('preserves isAI=false when saving a non-AI (API) recipe', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ isAI: false }), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].isAI).toBe(false);
  });

  it('calls addRecipe with isPublic false when user picks private', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].isPublic).toBe(false);
  });

  it('prevents double save: returns true and skips addRecipe on second call', async () => {
    const { result } = renderSaveHook();
    const matched = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(matched, false);
    });

    let secondResult: boolean;
    await act(async () => {
      secondResult = await result.current.saveRecipe(matched, false);
    });

    expect(secondResult!).toBe(true);
    expect(mockAddRecipe).toHaveBeenCalledTimes(1);
  });

  it('sets saveError and returns false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderSaveHook();

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(success!).toBe(false);
    expect(result.current.saveError).toBe('save_failed');
    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(result.current.savedIdMap.size).toBe(0);
  });

  it('sets saveError and returns false when getUser throws', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    const { result } = renderSaveHook();

    let success: boolean;
    await act(async () => {
      success = await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(success!).toBe(false);
    expect(result.current.saveError).toBe('save_failed');
  });

  it('clears saveError at the start of a new save attempt', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockGetUser.mockResolvedValueOnce({ data: { user: authenticatedUser } });
    const { result } = renderSaveHook();

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
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    act(() => {
      result.current.clearSaveError();
    });
    expect(result.current.saveError).toBeNull();
  });

  it('savingId is set to geminiId during save and null after', async () => {
    let capturedSavingId: string | null = null;
    mockGetUser.mockImplementationOnce(async () => {
      capturedSavingId = 'captured';
      return { data: { user: authenticatedUser } };
    });

    const { result } = renderSaveHook();
    const matched = makeMatchedRecipe();

    await act(async () => {
      await result.current.saveRecipe(matched, false);
    });

    expect(capturedSavingId).toBe('captured');
    expect(result.current.savingId).toBeNull();
  });

  it('uses null authorName when authorName is empty string', async () => {
    const { result } = renderSaveHook('');

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe(), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].authorName).toBeUndefined();
  });

  it('uses undefined for nameEn when nameEn is undefined', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ nameEn: undefined }), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].nameEn).toBeUndefined();
  });

  it('passes imageUrl through to the saved recipe', async () => {
    const { result } = renderSaveHook();
    const imageUrl = 'https://www.themealdb.com/images/media/meals/abc123.jpg';

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ imageUrl }), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].imageUrl).toBe(imageUrl);
  });

  it('saves recipe with imageUrl undefined when not provided', async () => {
    const { result } = renderSaveHook();

    await act(async () => {
      await result.current.saveRecipe(makeMatchedRecipe({ imageUrl: undefined }), false);
    });

    expect(mockAddRecipe.mock.calls[0][0].imageUrl).toBeUndefined();
  });

  describe('unsaveRecipe', () => {
    it('calls removeRecipe with the real recipe id', async () => {
      const { result } = renderSaveHook();
      const matched = makeMatchedRecipe();

      await act(async () => {
        await result.current.saveRecipe(matched, false);
      });

      const realId = mockAddRecipe.mock.calls[0][0].id as string;

      act(() => {
        result.current.unsaveRecipe(matched.id);
      });

      expect(mockRemoveRecipe).toHaveBeenCalledWith(realId);
    });

    it('removes geminiId from savedIdMap after unsave', async () => {
      const { result } = renderSaveHook();
      const matched = makeMatchedRecipe();

      await act(async () => {
        await result.current.saveRecipe(matched, false);
      });
      expect(result.current.savedIdMap.has(matched.id)).toBe(true);

      act(() => {
        result.current.unsaveRecipe(matched.id);
      });
      expect(result.current.savedIdMap.has(matched.id)).toBe(false);
    });

    it('does nothing when geminiId is not in savedIdMap', () => {
      const { result } = renderSaveHook();

      act(() => {
        result.current.unsaveRecipe('nonexistent-id');
      });

      expect(mockRemoveRecipe).not.toHaveBeenCalled();
    });
  });
});
