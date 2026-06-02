import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchWithGemini } from './searchWithGemini';
import type { FridgeItem } from '../../../shared/types';

const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

const makeFridgeItem = (name: string): FridgeItem => ({
  id: name,
  name,
  emoji: '🥚',
  category: 'egg',
});

const makeGeminiRecipe = (overrides: Record<string, unknown> = {}) => ({
  name: 'Яйца с масло',
  nameEn: 'Eggs with butter',
  emoji: '🍳',
  ingredients: ['2 eggs', '1 tbsp butter'],
  requiredIngredients: ['eggs', 'butter'],
  steps: ['Crack eggs', 'Fry in butter'],
  time: 10,
  tags: ['breakfast'],
  ...overrides,
});

describe('searchWithGemini', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('returns empty array on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('fail') });
    expect(await searchWithGemini([makeFridgeItem('eggs')], [], 'en')).toEqual([]);
  });

  it('returns empty array when data is not an array', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'bad' }, error: null });
    expect(await searchWithGemini([makeFridgeItem('eggs')], [], 'en')).toEqual([]);
  });

  it('sets isAI to true on all results', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe()], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].isAI).toBe(true);
  });

  it('computes matchedCount from fridge items', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe()], error: null });
    // fridge has 'eggs' → matches 1 of 2 required ingredients ('eggs', 'butter')
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].matchedCount).toBe(1);
    expect(result[0].matchScore).toBeCloseTo(0.5);
  });

  it('gives matchScore 1 when all required ingredients are in fridge', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe()], error: null });
    const fridge = [makeFridgeItem('eggs'), makeFridgeItem('butter')];
    const result = await searchWithGemini(fridge, [], 'en');
    expect(result[0].matchScore).toBe(1);
    expect(result[0].matchedCount).toBe(2);
  });

  it('uses fallback emoji when emoji is missing', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe({ emoji: undefined })], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].emoji).toBe('🍽');
  });

  it('uses fallback time of 30 when time is missing', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe({ time: undefined })], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].time).toBe(30);
  });

  it('uses empty tags array when tags are missing', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe({ tags: undefined })], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].tags).toEqual([]);
  });

  it('passes fridgeItems, blocked, lang, and excludeNames to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: [], error: null });
    const fridge = [makeFridgeItem('eggs')];
    await searchWithGemini(fridge, ['nuts'], 'bg');
    expect(mockInvoke).toHaveBeenCalledWith('gemini-recipes', {
      body: { fridgeItems: fridge, blocked: ['nuts'], lang: 'bg', excludeNames: [], difficulty: '' },
    });
  });

  it('passes provided excludeNames to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: [], error: null });
    const fridge = [makeFridgeItem('eggs')];
    await searchWithGemini(fridge, [], 'en', ['Recipe A', 'Recipe B']);
    expect(mockInvoke).toHaveBeenCalledWith('gemini-recipes', {
      body: { fridgeItems: fridge, blocked: [], lang: 'en', excludeNames: ['Recipe A', 'Recipe B'], difficulty: '' },
    });
  });

  it('forwards a chosen difficulty preference to the edge function', async () => {
    mockInvoke.mockResolvedValue({ data: [], error: null });
    const fridge = [makeFridgeItem('eggs')];
    await searchWithGemini(fridge, [], 'en', [], 'hard');
    expect(mockInvoke).toHaveBeenCalledWith('gemini-recipes', {
      body: { fridgeItems: fridge, blocked: [], lang: 'en', excludeNames: [], difficulty: 'hard' },
    });
  });

  it('sends an empty difficulty when none is selected (null)', async () => {
    mockInvoke.mockResolvedValue({ data: [], error: null });
    const fridge = [makeFridgeItem('eggs')];
    await searchWithGemini(fridge, [], 'en', [], null);
    expect(mockInvoke).toHaveBeenCalledWith('gemini-recipes', {
      body: { fridgeItems: fridge, blocked: [], lang: 'en', excludeNames: [], difficulty: '' },
    });
  });

  it('maps the difficulty returned by Gemini onto the matched recipe', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe({ difficulty: 'medium' })], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].difficulty).toBe('medium');
  });

  it('leaves difficulty undefined when Gemini omits it', async () => {
    mockInvoke.mockResolvedValue({ data: [makeGeminiRecipe({ difficulty: undefined })], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].difficulty).toBeUndefined();
  });

  it('matches when fridge item is a substring of required ingredient', async () => {
    // fridge has 'butter'; required is 'peanut butter' — i.toLowerCase().includes(f) path
    mockInvoke.mockResolvedValue({
      data: [makeGeminiRecipe({ requiredIngredients: ['peanut butter', 'bread'] })],
      error: null,
    });
    const result = await searchWithGemini([makeFridgeItem('butter')], [], 'en');
    expect(result[0].matchedCount).toBe(1);
  });

  it('returns empty array when data is an empty array', async () => {
    mockInvoke.mockResolvedValue({ data: [], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toEqual([]);
  });

  it('handles recipe with no required ingredients without crashing', async () => {
    mockInvoke.mockResolvedValue({
      data: [makeGeminiRecipe({ requiredIngredients: [] })],
      error: null,
    });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result[0].matchScore).toBe(0);
    expect(result[0].matchedCount).toBe(0);
  });

  it('skips null elements in the data array and processes valid recipes', async () => {
    mockInvoke.mockResolvedValue({ data: [null, makeGeminiRecipe()], error: null });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Яйца с масло');
  });

  it('handles recipe with undefined requiredIngredients without crashing', async () => {
    mockInvoke.mockResolvedValue({
      data: [makeGeminiRecipe({ requiredIngredients: undefined })],
      error: null,
    });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].requiredIngredients).toEqual([]);
    expect(result[0].matchScore).toBe(0);
    expect(result[0].matchedCount).toBe(0);
  });

  it('handles recipe with undefined ingredients without crashing', async () => {
    mockInvoke.mockResolvedValue({
      data: [makeGeminiRecipe({ ingredients: undefined })],
      error: null,
    });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].ingredients).toEqual([]);
  });

  it('handles recipe with undefined steps without crashing', async () => {
    mockInvoke.mockResolvedValue({
      data: [makeGeminiRecipe({ steps: undefined })],
      error: null,
    });
    const result = await searchWithGemini([makeFridgeItem('eggs')], [], 'en');
    expect(result).toHaveLength(1);
    expect(result[0].steps).toEqual([]);
  });
});
