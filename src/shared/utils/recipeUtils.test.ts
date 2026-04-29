import { describe, it, expect } from 'vitest';
import { isSafe } from './recipeUtils';
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
});
