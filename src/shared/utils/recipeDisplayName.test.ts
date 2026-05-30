import { describe, it, expect } from 'vitest';
import { localizeMealTag } from './recipeDisplayName';

describe('localizeMealTag', () => {
  it('localizes an EN meal id to its BG label', () => {
    expect(localizeMealTag('breakfast', false, 'рецепта')).toBe('закуска');
  });

  it('keeps the lowercase EN wording for an EN meal id (cards looked the same before)', () => {
    expect(localizeMealTag('breakfast', true, 'recipe')).toBe('breakfast');
  });

  it('localizes a legacy BG meal word when the UI is in English', () => {
    expect(localizeMealTag('закуска', true, 'recipe')).toBe('breakfast');
  });

  it('keeps a legacy BG meal word as its BG label in the BG UI', () => {
    expect(localizeMealTag('вечеря', false, 'рецепта')).toBe('вечеря');
  });

  it('is case-insensitive for the meal id', () => {
    expect(localizeMealTag('DINNER', false, 'рецепта')).toBe('вечеря');
  });

  it('returns a non-meal tag unchanged', () => {
    expect(localizeMealTag('vegetarian', false, 'рецепта')).toBe('vegetarian');
  });

  it('falls back to the provided default when the tag is missing', () => {
    expect(localizeMealTag(undefined, true, 'recipe')).toBe('recipe');
    expect(localizeMealTag(undefined, false, 'рецепта')).toBe('рецепта');
  });

  it('uses an empty fallback when one is provided (flipbook)', () => {
    expect(localizeMealTag(undefined, true, '')).toBe('');
  });
});
