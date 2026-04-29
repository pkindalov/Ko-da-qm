import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchFromFridge, searchDatabase } from './matchFromFridge';
import type { FridgeItem } from '../../../shared/types';

const mockSelect = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: mockSelect }),
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

describe('matchFromFridge', () => {
  beforeEach(() => mockSelect.mockReset());

  it('returns empty array on supabase error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: new Error('db error') });
    expect(await matchFromFridge([makeFridgeItem('яйца')], [])).toEqual([]);
  });

  it('excludes recipes with no matching fridge items', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('риба')], []);
    expect(result).toHaveLength(0);
  });

  it('includes recipe and computes correct matchScore', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    // fridge has "яйца" → matches 1 of 2 required ingredients
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBe(0.5);
    expect(result[0].matchedCount).toBe(1);
  });

  it('gives matchScore of 1 when all required ingredients are in fridge', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const fridge = [makeFridgeItem('яйца'), makeFridgeItem('масло')];
    const result = await matchFromFridge(fridge, []);
    expect(result[0].matchScore).toBe(1);
  });

  it('excludes recipe when a required ingredient is blocked', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], ['яйца']);
    expect(result).toHaveLength(0);
  });

  it('block is case-insensitive', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], ['ЯЙЦА']);
    expect(result).toHaveLength(0);
  });

  it('only blocks when the blocked word appears in a required ingredient', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    // "захар" is not in required_ingredients, so it should not block
    const fridge = [makeFridgeItem('яйца'), makeFridgeItem('масло')];
    const result = await matchFromFridge(fridge, ['захар']);
    expect(result).toHaveLength(1);
  });

  it('returns empty when fridge is empty', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await matchFromFridge([], []);
    expect(result).toHaveLength(0);
  });

  it('matches when a fridge item is a substring of the required ingredient', async () => {
    // fridge has 'масло'; required is 'краве масло' — ingredient.includes(fridge) path
    mockSelect.mockResolvedValue({ data: [makeRow({ required_ingredients: ['краве масло'] })], error: null });
    const result = await matchFromFridge([makeFridgeItem('масло')], []);
    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBe(1);
  });

  it('excludes recipe with no required ingredients (NaN matchScore)', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow({ required_ingredients: [] })], error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    expect(result).toHaveLength(0);
  });

  it('sorts by matchScore descending', async () => {
    const rows = [
      makeRow({ id: 'A', required_ingredients: ['яйца', 'масло'] }),
      makeRow({ id: 'B', required_ingredients: ['яйца'] }),
    ];
    mockSelect.mockResolvedValue({ data: rows, error: null });
    const result = await matchFromFridge([makeFridgeItem('яйца')], []);
    // B scores 1/1 = 1.0, A scores 1/2 = 0.5
    expect(result[0].id).toBe('B');
    expect(result[1].id).toBe('A');
  });
});

describe('searchDatabase', () => {
  beforeEach(() => mockSelect.mockReset());

  it('returns empty for empty query', async () => {
    expect(await searchDatabase('', [])).toEqual([]);
  });

  it('returns empty for whitespace-only query', async () => {
    expect(await searchDatabase('   ', [])).toEqual([]);
  });

  it('returns empty on supabase error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: new Error('fail') });
    expect(await searchDatabase('яйца', [])).toEqual([]);
  });

  it('matches by recipe name', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('яйца с масло', []);
    expect(result).toHaveLength(1);
  });

  it('matches by required ingredient', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('масло', []);
    expect(result).toHaveLength(1);
  });

  it('matches by tag', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('закуска', []);
    expect(result).toHaveLength(1);
  });

  it('excludes recipes with a blocked required ingredient', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('яйца', ['яйца']);
    expect(result).toHaveLength(0);
  });

  it('returns no results when query matches nothing', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('пица', []);
    expect(result).toHaveLength(0);
  });

  it('matching is case-insensitive', async () => {
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('ЗАКУСКА', []);
    expect(result).toHaveLength(1);
  });

  it('returns only unblocked recipes when the query matches multiple', async () => {
    const rows = [
      makeRow({ id: '1', required_ingredients: ['яйца', 'масло'] }),
      makeRow({ id: '2', required_ingredients: ['яйца', 'нещо'] }),
    ];
    mockSelect.mockResolvedValue({ data: rows, error: null });
    // 'нещо' blocks row 2; row 1 still matches
    const result = await searchDatabase('яйца', ['нещо']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('matches by full ingredient line including quantity prefix', async () => {
    // makeRow ingredients: ['2 яйца', '1 с.л. масло']
    // '1 с.л.' is not in name, tags, or required_ingredients — exercises the r.ingredients path
    mockSelect.mockResolvedValue({ data: [makeRow()], error: null });
    const result = await searchDatabase('1 с.л.', []);
    expect(result).toHaveLength(1);
  });
});
