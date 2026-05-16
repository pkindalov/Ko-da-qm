import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateRecipe, buildChunks } from './translateRecipe';

const makeResponse = (responseStatus: number, translatedText: string, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve({ responseStatus, responseData: { translatedText } }),
  });

describe('buildChunks', () => {
  it('returns a single chunk when all items fit within the limit', () => {
    const items = ['chicken', 'salt', 'pepper'];
    const chunks = buildChunks(items);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(items);
  });

  it('returns empty array for empty input', () => {
    expect(buildChunks([])).toEqual([]);
  });

  it('keeps a single item that exceeds the limit alone in its own chunk', () => {
    const longItem = 'a'.repeat(500);
    const chunks = buildChunks([longItem, 'short']);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual([longItem]);
    expect(chunks[1]).toEqual(['short']);
  });

  it('splits items into multiple chunks when combined length exceeds the limit', () => {
    // Each item is 200 chars; two fit (200 + 5 separator + 200 = 405 < 490), three do not
    const item = 'a'.repeat(200);
    const chunks = buildChunks([item, item, item]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
  });

  it('returns one chunk per item when every item is near the limit', () => {
    const item = 'a'.repeat(489);
    const chunks = buildChunks([item, item]);
    expect(chunks).toHaveLength(2);
  });
});

describe('translateRecipe', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('translates name, ingredients, and steps', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, 'Пилешка супа'))            // name
      .mockReturnValueOnce(makeResponse(200, '1 пиле ||| сол'))          // ingredients chunk
      .mockReturnValueOnce(makeResponse(200, 'Стъпка 1 ||| Стъпка 2')); // steps chunk

    const result = await translateRecipe({
      name: 'Chicken soup',
      ingredients: ['1 chicken', 'salt'],
      steps: ['Step 1', 'Step 2'],
    });

    expect(result.name).toBe('Пилешка супа');
    expect(result.ingredients).toEqual(['1 пиле', 'сол']);
    expect(result.steps).toEqual(['Стъпка 1', 'Стъпка 2']);
  });

  it('returns empty arrays when ingredients and steps are empty', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, 'Пилешка супа'));

    const result = await translateRecipe({ name: 'Chicken soup', ingredients: [], steps: [] });

    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns original text unchanged when name is blank', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, ' ||| item'))
      .mockReturnValueOnce(makeResponse(200, 'Стъпка'));

    const result = await translateRecipe({ name: '', ingredients: ['item'], steps: ['Step'] });

    // fetch must NOT be called for the empty name
    expect(result.name).toBe('');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to original items when separator is not preserved in response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, 'Пиле'))                 // name
      .mockReturnValueOnce(makeResponse(200, 'no separator here'))    // ingredients — separator missing
      .mockReturnValueOnce(makeResponse(200, 'Стъпка'));              // steps

    const result = await translateRecipe({
      name: 'Chicken',
      ingredients: ['chicken', 'salt'],
      steps: ['Step 1'],
    });

    // Falls back to originals because split count doesn't match
    expect(result.ingredients).toEqual(['chicken', 'salt']);
    expect(result.steps).toEqual(['Стъпка']);
  });

  it('makes multiple fetch calls when items are split into chunks', async () => {
    const longItem = 'a'.repeat(400);

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, 'Пиле'))  // name
      .mockReturnValueOnce(makeResponse(200, 'б'.repeat(400)))  // ingredients chunk 1
      .mockReturnValueOnce(makeResponse(200, 'в'.repeat(400)))  // ingredients chunk 2
      .mockReturnValueOnce(makeResponse(200, 'Стъпка'));        // steps

    const result = await translateRecipe({
      name: 'Chicken',
      ingredients: [longItem, longItem],
      steps: ['Step 1'],
    });

    // 1 name + 2 ingredient chunks + 1 step chunk = 4 calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(result.ingredients).toHaveLength(2);
  });

  it('increments usage once per fetch call', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, 'Пиле'))
      .mockReturnValueOnce(makeResponse(200, 'сол'))
      .mockReturnValueOnce(makeResponse(200, 'Стъпка'));

    await translateRecipe({ name: 'Chicken', ingredients: ['salt'], steps: ['Step 1'] });

    const stored = JSON.parse(localStorage.getItem('kdq_translate_usage') ?? '{}');
    expect(stored.count).toBe(3);
  });

  it('throws when the HTTP response is not ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(200, '', false));

    await expect(
      translateRecipe({ name: 'Chicken', ingredients: [], steps: [] })
    ).rejects.toThrow('Translation request failed');
  });

  it('throws when MyMemory returns a non-200 responseStatus', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(429, ''));

    await expect(
      translateRecipe({ name: 'Chicken', ingredients: [], steps: [] })
    ).rejects.toThrow('Translation service returned status 429');
  });

  it('still increments usage when MyMemory returns non-200 responseStatus (HTTP was ok)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResponse(429, ''));

    await expect(
      translateRecipe({ name: 'Chicken', ingredients: [], steps: [] })
    ).rejects.toThrow();

    const stored = JSON.parse(localStorage.getItem('kdq_translate_usage') ?? '{}');
    expect(stored.count).toBe(1);
  });
});
