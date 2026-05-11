import { describe, it, expect } from 'vitest';
import { isSafe, recipeRisk } from './recipeUtils';
import type { Recipe } from '../types';

const makeRecipe = (requiredIngredients: string[]): Recipe => ({
  id: '1',
  name: 'Test',
  emoji: '🍳',
  ingredients: [],
  steps: [],
  time: 10,
  tags: [],
  isAI: false,
  isPublic: false,
  requiredIngredients,
});

describe('isSafe', () => {
  it('returns true when blocked list is empty', () => {
    expect(isSafe(makeRecipe(['яйца', 'масло']), [])).toBe(true);
  });

  it('returns true when no required ingredient matches a blocked word', () => {
    expect(isSafe(makeRecipe(['яйца', 'масло']), ['ядки'])).toBe(true);
  });

  it('returns false when a required ingredient contains a blocked word', () => {
    expect(isSafe(makeRecipe(['яйца', 'масло']), ['яйца'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSafe(makeRecipe(['Яйца']), ['яйца'])).toBe(false);
  });

  it('matches partial word in ingredient', () => {
    // "пилешко месо" contains "пиле"
    expect(isSafe(makeRecipe(['пилешко месо']), ['пиле'])).toBe(false);
  });

  it('returns true when required ingredients list is empty', () => {
    expect(isSafe(makeRecipe([]), ['яйца'])).toBe(true);
  });

  it('is case-insensitive for the blocked word too — uppercase block matches lowercase ingredient', () => {
    expect(isSafe(makeRecipe(['яйца']), ['ЯЙЦА'])).toBe(false);
  });

  it('returns false when any one of multiple blocked words matches', () => {
    expect(isSafe(makeRecipe(['яйца', 'масло']), ['захар', 'яйца'])).toBe(false);
  });

  it('an empty string in the blocked list makes every recipe unsafe', () => {
    // every string includes '' — a stray empty entry would silently block everything
    expect(isSafe(makeRecipe(['яйца']), [''])).toBe(false);
  });
});

describe('recipeRisk', () => {
  it('returns "safe" when both lists are empty', () => {
    expect(recipeRisk(makeRecipe(['яйца']), [], [])).toBe('safe');
  });

  it('returns "safe" when no ingredient matches either list', () => {
    expect(recipeRisk(makeRecipe(['яйца']), ['ядки'], ['лук'])).toBe('safe');
  });

  it('returns "dislike" when an ingredient matches the dislikes list', () => {
    expect(recipeRisk(makeRecipe(['яйца', 'лук']), [], ['лук'])).toBe('dislike');
  });

  it('returns "allergy" when an ingredient matches the allergies list', () => {
    expect(recipeRisk(makeRecipe(['яйца', 'фъстъци']), ['фъстъци'], [])).toBe('allergy');
  });

  it('returns "allergy" (not "dislike") when both lists match different ingredients', () => {
    expect(recipeRisk(makeRecipe(['лук', 'фъстъци']), ['фъстъци'], ['лук'])).toBe('allergy');
  });

  it('returns "allergy" when the same ingredient matches both lists', () => {
    expect(recipeRisk(makeRecipe(['яйца']), ['яйца'], ['яйца'])).toBe('allergy');
  });

  it('is case-insensitive for allergies', () => {
    expect(recipeRisk(makeRecipe(['яйца']), ['ЯЙЦА'], [])).toBe('allergy');
  });

  it('is case-insensitive for dislikes', () => {
    expect(recipeRisk(makeRecipe(['Лук']), [], ['лук'])).toBe('dislike');
  });

  it('returns "safe" when requiredIngredients is empty', () => {
    expect(recipeRisk(makeRecipe([]), ['яйца'], ['лук'])).toBe('safe');
  });

  it('matches partial word — "пилешко месо" triggers allergy on "пиле"', () => {
    expect(recipeRisk(makeRecipe(['пилешко месо']), ['пиле'], [])).toBe('allergy');
  });
});
