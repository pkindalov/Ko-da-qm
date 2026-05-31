import { describe, it, expect } from 'vitest';
import { localizeMealTag, recipeSourceLang, recipeDisplayName } from './recipeDisplayName';

describe('recipeSourceLang', () => {
  it('infers Bulgarian from a Cyrillic name', () => {
    expect(recipeSourceLang({ name: 'Пилешка супа' })).toBe('bg');
  });

  it('infers English from a Latin name', () => {
    expect(recipeSourceLang({ name: 'Chicken Soup' })).toBe('en');
  });

  it('treats a mixed name with any Cyrillic as Bulgarian', () => {
    expect(recipeSourceLang({ name: 'Pizza Маргарита' })).toBe('bg');
  });

  it('prefers the stored sourceLang over the name-script guess', () => {
    // A Bulgarian recipe deliberately titled with a Latin word — the heuristic
    // alone would wrongly say English, but the stored value wins.
    expect(recipeSourceLang({ name: 'Pizza', sourceLang: 'bg' })).toBe('bg');
  });
});

describe('recipeDisplayName', () => {
  it('shows the Bulgarian translation of an English recipe to a Bulgarian reader', () => {
    const recipe = { name: 'Chicken Soup', nameEn: 'Chicken Soup', nameTranslated: 'Пилешка супа' };
    expect(recipeDisplayName(recipe, 'bg')).toBe('Пилешка супа');
  });

  it('shows the English translation of a Bulgarian recipe to an English reader', () => {
    const recipe = { name: 'Пилешка супа', nameTranslated: 'Chicken Soup' };
    expect(recipeDisplayName(recipe, 'en')).toBe('Chicken Soup');
  });

  it('keeps the source name for a reader in the source language', () => {
    const recipe = { name: 'Пилешка супа', nameTranslated: 'Chicken Soup' };
    expect(recipeDisplayName(recipe, 'bg')).toBe('Пилешка супа');
  });

  it('falls back to nameEn for an English reader when no translation exists', () => {
    const recipe = { name: 'Пилешка супа', nameEn: 'Chicken Soup' };
    expect(recipeDisplayName(recipe, 'en')).toBe('Chicken Soup');
  });

  it('falls back to the original name when nothing better is available', () => {
    expect(recipeDisplayName({ name: 'Пилешка супа' }, 'en')).toBe('Пилешка супа');
  });
});

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
