import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchFromFridge, searchDatabase } from './matchFromFridge';
import type { FridgeItem } from '../../../shared/types';

const mockDbSelect = vi.hoisted(() => vi.fn());
const mockUserEq = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) =>
      table === 'recipes'
        ? { select: () => ({ eq: mockUserEq }) }
        : { select: mockDbSelect },
  },
}));

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'Яйца с масло',
  name_en: 'Eggs with butter',
  emoji: '🍳',
  ingredients: ['2 яйца', '1 с.л. масло'],
  steps: ['Разбий яйцата', 'Запържи'],
  time: 10,
  tags: ['закуска'],
  required_ingredients: ['яйца', 'масло'],
  is_ai: false,
  ...overrides,
});

const makeFridgeItem = (name: string): FridgeItem => ({
  id: name,
  name,
  emoji: '🥚',
  category: 'egg',
});

const RECIPE_DB_FIELDS = 'id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai';

describe('matchFromFridge', () => {
  beforeEach(() => mockDbSelect.mockReset());

  it('selects only the required recipe_database fields – no wildcard', async () => {
    mockDbSelect.mockResolvedValue({ data: [], error: null });
    await matchFromFridge([], []);
    expect(mockDbSelect).toHaveBeenCalledWith(RECIPE_DB_FIELDS);
  });

  it('returns empty array on supabase error', async () => {
    mockDbSelect.mockResolvedValue({ data: null, error: new Error('db error') });
    expect(await matchFromFridge([makeFridgeItem('яйца')], [])).toEqual([]);
  });

  it('excludes recipes with no matching fridge items', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('риба')], []);
    expect(result).toHaveLength(0);
  });

  it('includes recipe and computes correct matchScore', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    // fridge has "яйца" → matches 1 of 2 required ingredients
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBe(0.5);
    expect(result[0].matchedCount).toBe(1);
  });

  it('gives matchScore of 1 when all required ingredients are in fridge', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const fridge = [makeFridgeItem('яйца'), makeFridgeItem('масло')];
    const result = await matchFromFridge(fridge, []);
    expect(result[0].matchScore).toBe(1);
  });

  it('excludes recipe when a required ingredient is blocked', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], ['яйца']);
    expect(result).toHaveLength(0);
  });

  it('block is case-insensitive', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], ['ЯЙЦА']);
    expect(result).toHaveLength(0);
  });

  it('only blocks when the blocked word appears in a required ingredient', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    // "захар" is not in required_ingredients, so it should not block
    const fridge = [makeFridgeItem('яйца'), makeFridgeItem('масло')];
    const result = await matchFromFridge(fridge, ['захар']);
    expect(result).toHaveLength(1);
  });

  it('returns empty when fridge is empty', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([], []);
    expect(result).toHaveLength(0);
  });

  it('matches when a fridge item is a substring of the required ingredient', async () => {
    // fridge has 'масло'; required is 'краве масло' — ingredient.includes(fridge) path
    mockDbSelect.mockResolvedValue({ data: [makeRow({ required_ingredients: ['краве масло'] })], error: null });
    const result = await matchFromFridge([makeFridgeItem('масло')], []);
    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBe(1);
  });

  it('excludes recipe with no required ingredients (NaN matchScore)', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow({ required_ingredients: [] })], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    expect(result).toHaveLength(0);
  });

  it('sorts by matchScore descending', async () => {
    const rows = [
      makeRow({ id: 'A', required_ingredients: ['яйца', 'масло'] }),
      makeRow({ id: 'B', required_ingredients: ['яйца'] }),
    ];
    mockDbSelect.mockResolvedValue({ data: rows, error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    // B scores 1/1 = 1.0, A scores 1/2 = 0.5
    expect(result[0].id).toBe('B');
    expect(result[1].id).toBe('A');
  });
});

describe('searchDatabase', () => {
  beforeEach(() => {
    mockDbSelect.mockReset();
    mockUserEq.mockReset();
    mockUserEq.mockResolvedValue({ data: [], error: null });
  });

  it('selects only the required recipe_database fields – no wildcard', async () => {
    mockDbSelect.mockResolvedValue({ data: [], error: null });
    await searchDatabase('яйца', []);
    expect(mockDbSelect).toHaveBeenCalledWith(RECIPE_DB_FIELDS);
  });

  it('returns empty for empty query', async () => {
    expect(await searchDatabase('', [])).toEqual([]);
  });

  it('returns empty for whitespace-only query', async () => {
    expect(await searchDatabase('   ', [])).toEqual([]);
  });

  it('returns empty on supabase error', async () => {
    mockDbSelect.mockResolvedValue({ data: null, error: new Error('fail') });
    expect(await searchDatabase('яйца', [])).toEqual([]);
  });

  it('matches by recipe name', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('яйца с масло', []);
    expect(result).toHaveLength(1);
  });

  it('matches by required ingredient', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('масло', []);
    expect(result).toHaveLength(1);
  });

  it('matches by tag', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('закуска', []);
    expect(result).toHaveLength(1);
  });

  it('excludes recipes with a blocked required ingredient', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('яйца', ['яйца']);
    expect(result).toHaveLength(0);
  });

  it('returns no results when query matches nothing', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('пица', []);
    expect(result).toHaveLength(0);
  });

  it('matching is case-insensitive', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('ЗАКУСКА', []);
    expect(result).toHaveLength(1);
  });

  it('returns only unblocked recipes when the query matches multiple', async () => {
    const rows = [
      makeRow({ id: '1', required_ingredients: ['яйца', 'масло'] }),
      makeRow({ id: '2', required_ingredients: ['яйца', 'нещо'] }),
    ];
    mockDbSelect.mockResolvedValue({ data: rows, error: null });
    // 'нещо' blocks row 2; row 1 still matches
    const result = await searchDatabase('яйца', ['нещо']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('matches by full ingredient line including quantity prefix', async () => {
    // makeRow ingredients: ['2 яйца', '1 с.л. масло']
    // '1 с.л.' is not in name, tags, or required_ingredients — exercises the r.ingredients path
    mockDbSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('1 с.л.', []);
    expect(result).toHaveLength(1);
  });

  // — user-recipe (public) search —

  it('returns results from both recipe_database and user recipes', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow({ id: 'db-1' })], error: null });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1' })], error: null });
    const result = await searchDatabase('яйца', []);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(expect.arrayContaining(['db-1', 'user-1']));
  });

  it('db recipes have isPublic false, user recipes have isPublic true', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow({ id: 'db-1' })], error: null });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1' })], error: null });
    const result = await searchDatabase('яйца', []);
    const db = result.find((r) => r.id === 'db-1')!;
    const user = result.find((r) => r.id === 'user-1')!;
    expect(db.isPublic).toBe(false);
    expect(user.isPublic).toBe(true);
  });

  it('returns only user recipe when db has no match', async () => {
    const noMatchRow = makeRow({ id: 'db-1', name: 'Пица', ingredients: ['домати'], tags: ['обяд'], required_ingredients: ['домати'] });
    mockDbSelect.mockResolvedValue({ data: [noMatchRow], error: null });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1' })], error: null });
    const result = await searchDatabase('яйца', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user-1');
  });

  it('returns only db recipe when user table has no match', async () => {
    const noMatchRow = makeRow({ id: 'user-1', name: 'Пица', ingredients: ['домати'], tags: ['обяд'], required_ingredients: ['домати'] });
    mockDbSelect.mockResolvedValue({ data: [makeRow({ id: 'db-1' })], error: null });
    mockUserEq.mockResolvedValue({ data: [noMatchRow], error: null });
    const result = await searchDatabase('яйца', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('db-1');
  });

  it('excludes user recipe whose required ingredient is blocked', async () => {
    mockDbSelect.mockResolvedValue({ data: [], error: null });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1' })], error: null });
    const result = await searchDatabase('яйца', ['яйца']);
    expect(result).toHaveLength(0);
  });

  it('still returns db results when user query errors', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow({ id: 'db-1' })], error: null });
    mockUserEq.mockResolvedValue({ data: null, error: new Error('user db error') });
    const result = await searchDatabase('яйца', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('db-1');
  });

  it('still returns user results when recipe_database errors', async () => {
    mockDbSelect.mockResolvedValue({ data: null, error: new Error('db error') });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1' })], error: null });
    const result = await searchDatabase('яйца', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user-1');
    expect(result[0].isPublic).toBe(true);
  });

  it('returns empty when both sources error', async () => {
    mockDbSelect.mockResolvedValue({ data: null, error: new Error('fail') });
    mockUserEq.mockResolvedValue({ data: null, error: new Error('fail') });
    const result = await searchDatabase('яйца', []);
    expect(result).toEqual([]);
  });

  it('user recipe blocked by ingredient still lets unblocked db recipe through', async () => {
    mockDbSelect.mockResolvedValue({ data: [makeRow({ id: 'db-1', required_ingredients: ['масло'] })], error: null });
    mockUserEq.mockResolvedValue({ data: [makeRow({ id: 'user-1', required_ingredients: ['яйца'] })], error: null });
    // block 'яйца' — user recipe excluded, db recipe (needs 'масло') passes
    const result = await searchDatabase('масло', ['яйца']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('db-1');
  });
});
