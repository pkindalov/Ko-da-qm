import { describe, it, expect } from 'vitest';
import { parseRecipeForm, mealsFromTags, mergeMealTags } from './recipeForm';

describe('parseRecipeForm', () => {
  it('returns null for empty name', () => {
    expect(parseRecipeForm({ name: '', emoji: '🍳', time: '10', ingredients: 'яйца', steps: 'стъпка' })).toBeNull();
  });

  it('returns null for whitespace-only name', () => {
    expect(parseRecipeForm({ name: '   ', emoji: '🍳', time: '10', ingredients: '', steps: '' })).toBeNull();
  });

  it('splits ingredients by newline', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '2 яйца\n50г сирене', steps: '' });
    expect(result?.ingredients).toEqual(['2 яйца', '50г сирене']);
  });

  it('splits steps by newline', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: 'Загрей тигана\nДобави яйцата' });
    expect(result?.steps).toEqual(['Загрей тигана', 'Добави яйцата']);
  });

  it('strips quantity prefix to derive requiredIngredients', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '2 яйца\n50г сирене', steps: '' });
    expect(result?.requiredIngredients).toEqual(['яйца', 'сирене']);
  });

  it('uses the whole line as requiredIngredient when there is no space', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: 'яйца', steps: '' });
    expect(result?.requiredIngredients).toEqual(['яйца']);
  });

  it('parses time as integer', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '25', ingredients: '', steps: '' });
    expect(result?.time).toBe(25);
  });

  it('defaults time to 15 when value is not a number', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '', ingredients: '', steps: '' });
    expect(result?.time).toBe(15);
  });

  it('defaults emoji to 🍽 when empty', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '', time: '10', ingredients: '', steps: '' });
    expect(result?.emoji).toBe('🍽');
  });

  it('filters out blank lines from ingredients and steps', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: 'яйца\n\nмасло', steps: 'стъпка\n\n' });
    expect(result?.ingredients).toEqual(['яйца', 'масло']);
    expect(result?.steps).toEqual(['стъпка']);
  });

  it('defaults time to 15 when value is 0 (JS falsy coercion: 0 || 15)', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '0', ingredients: '', steps: '' });
    expect(result?.time).toBe(15);
  });

  it('stores name with surrounding whitespace unchanged', () => {
    // trim() is only used for the null-guard, not applied to the output
    const result = parseRecipeForm({ name: '  Тест  ', emoji: '🍳', time: '10', ingredients: '', steps: '' });
    expect(result?.name).toBe('  Тест  ');
  });

  it('strips only the first token — multi-word quantities leave a prefix in requiredIngredient', () => {
    // "2 с.л. масло".split(' ').slice(1).join(' ') → "с.л. масло", not "масло"
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '2 с.л. масло', steps: '' });
    expect(result?.requiredIngredients).toEqual(['с.л. масло']);
  });

  it('sets isPublic to true when form flag is true', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', isPublic: true });
    expect(result?.isPublic).toBe(true);
  });

  it('sets isPublic to false when form flag is false', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', isPublic: false });
    expect(result?.isPublic).toBe(false);
  });

  it('defaults tags to an empty array when meals are omitted (back-compat)', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '' });
    expect(result?.tags).toEqual([]);
  });

  it('maps a single selected meal to its EN id tag', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: ['breakfast'] });
    expect(result?.tags).toEqual(['breakfast']);
  });

  it('maps multiple selected meals to their EN id tags', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: ['breakfast', 'dinner'] });
    expect(result?.tags).toEqual(['breakfast', 'dinner']);
  });

  it('emits tags in canonical order regardless of selection order', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: ['dinner', 'breakfast', 'lunch'] });
    expect(result?.tags).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('deduplicates repeated meal selections', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: ['lunch', 'lunch'] });
    expect(result?.tags).toEqual(['lunch']);
  });

  it('produces an empty tags array for an empty meals array', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: [] });
    expect(result?.tags).toEqual([]);
  });

  it('stores the same tag vocabulary Gemini uses (EN ids)', () => {
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: ['breakfast', 'lunch', 'dinner'] });
    expect(result?.tags).toEqual(['breakfast', 'lunch', 'dinner']);
  });
});

describe('mealsFromTags', () => {
  it('returns an empty array for undefined tags', () => {
    expect(mealsFromTags(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty tag list', () => {
    expect(mealsFromTags([])).toEqual([]);
  });

  it('recognizes EN meal ids (the format Gemini and the form both store)', () => {
    expect(mealsFromTags(['breakfast', 'dinner'])).toEqual(['breakfast', 'dinner']);
  });

  it('recognizes legacy BG meal words', () => {
    expect(mealsFromTags(['закуска', 'вечеря'])).toEqual(['breakfast', 'dinner']);
  });

  it('is case-insensitive for both id and BG forms', () => {
    expect(mealsFromTags(['Закуска', 'DINNER'])).toEqual(['breakfast', 'dinner']);
  });

  it('ignores non-meal tags', () => {
    expect(mealsFromTags(['vegetarian', 'quick'])).toEqual([]);
  });

  it('returns meals in canonical order regardless of tag order', () => {
    expect(mealsFromTags(['вечеря', 'закуска'])).toEqual(['breakfast', 'dinner']);
  });

  it('deduplicates when a recipe carries both the EN id and its BG word', () => {
    expect(mealsFromTags(['breakfast', 'закуска'])).toEqual(['breakfast']);
  });

  it('round-trips with parseRecipeForm', () => {
    const meals = ['breakfast', 'dinner'] as const;
    const result = parseRecipeForm({ name: 'Тест', emoji: '🍳', time: '10', ingredients: '', steps: '', meals: [...meals] });
    expect(mealsFromTags(result?.tags)).toEqual([...meals]);
  });
});

describe('mergeMealTags', () => {
  it('keeps non-meal tags an edit would otherwise drop', () => {
    expect(mergeMealTags(['breakfast'], ['lunch', 'vegetarian'])).toEqual(['breakfast', 'vegetarian']);
  });

  it('drops the old meal tags in favor of the new selection', () => {
    expect(mergeMealTags(['dinner'], ['breakfast', 'lunch'])).toEqual(['dinner']);
  });

  it('puts the new meal tags first so the card label still shows the meal', () => {
    expect(mergeMealTags(['breakfast'], ['quick', 'lunch'])).toEqual(['breakfast', 'quick']);
  });

  it('also recognizes legacy BG meal words as meal tags (so they are not kept as "other")', () => {
    expect(mergeMealTags(['breakfast'], ['закуска', 'vegan'])).toEqual(['breakfast', 'vegan']);
  });

  it('returns just the new meal tags when the recipe had no extra tags', () => {
    expect(mergeMealTags(['breakfast', 'dinner'], ['lunch'])).toEqual(['breakfast', 'dinner']);
  });

  it('handles an undefined existing tag list', () => {
    expect(mergeMealTags(['lunch'], undefined)).toEqual(['lunch']);
  });

  it('keeps an empty result when nothing is selected and there were no other tags', () => {
    expect(mergeMealTags([], ['breakfast'])).toEqual([]);
  });
});
