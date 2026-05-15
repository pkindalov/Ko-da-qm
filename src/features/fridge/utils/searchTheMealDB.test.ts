import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchByFridge } from './searchTheMealDB';
import type { FridgeItem } from '../../../shared/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const makeFridgeItem = (name: string): FridgeItem => ({
  id: name,
  name,
  emoji: '🥚',
  category: 'egg',
});

const makeFilterResponse = (ids: string[]) =>
  Promise.resolve({
    json: () => Promise.resolve({ meals: ids.map((idMeal) => ({ idMeal, strMeal: 'Meal' })) }),
  });

const makeDetailResponse = (overrides: Record<string, unknown> = {}) =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        meals: [
          {
            idMeal: '52772',
            strMeal: 'Teriyaki Chicken Casserole',
            strCategory: 'Chicken',
            strArea: 'Japanese',
            strInstructions: 'Mix. Bake.',
            strTags: null,
            strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
            strIngredient1: 'chicken',
            strMeasure1: '500g',
            strIngredient2: '',
            strMeasure2: '',
            ...overrides,
          },
        ],
      }),
  });

describe('searchByFridge – imageUrl from strMealThumb', () => {
  beforeEach(() => mockFetch.mockReset());

  it('populates imageUrl from strMealThumb', async () => {
    mockFetch
      .mockResolvedValueOnce(await makeFilterResponse(['52772']))
      .mockResolvedValueOnce(await makeDetailResponse());

    const results = await searchByFridge([makeFridgeItem('chicken')], []);

    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe(
      'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    );
  });

  it('sets imageUrl to undefined when strMealThumb is null', async () => {
    mockFetch
      .mockResolvedValueOnce(await makeFilterResponse(['52772']))
      .mockResolvedValueOnce(await makeDetailResponse({ strMealThumb: null }));

    const results = await searchByFridge([makeFridgeItem('chicken')], []);

    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBeUndefined();
  });

  it('returns empty array when fridge is empty', async () => {
    const results = await searchByFridge([], []);
    expect(results).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty array when TheMealDB finds no meals for ingredient', async () => {
    mockFetch.mockResolvedValueOnce(
      Promise.resolve({ json: () => Promise.resolve({ meals: null }) }),
    );

    const results = await searchByFridge([makeFridgeItem('chicken')], []);
    expect(results).toHaveLength(0);
  });

  it('does not fetch detail for meal IDs listed in excludeIds', async () => {
    mockFetch
      .mockResolvedValueOnce(await makeFilterResponse(['52772', '99999']))
      .mockResolvedValueOnce(
        Promise.resolve({ json: () => Promise.resolve({ meals: null }) }),
      );

    // '52772' is excluded → only '99999' detail is fetched (returns null → no results)
    const results = await searchByFridge([makeFridgeItem('chicken')], [], ['52772']);

    expect(results).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0] as string).toContain('99999');
    expect(mockFetch.mock.calls[1][0] as string).not.toContain('52772');
  });

  it('returns results normally when excludeIds is empty', async () => {
    mockFetch
      .mockResolvedValueOnce(await makeFilterResponse(['52772']))
      .mockResolvedValueOnce(await makeDetailResponse());

    const results = await searchByFridge([makeFridgeItem('chicken')], [], []);
    expect(results).toHaveLength(1);
  });
});
