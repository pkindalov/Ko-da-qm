import { describe, it, expect } from 'vitest';
import { suggestDifficulty, localizeDifficulty, DIFFICULTY_OPTIONS } from './recipeDifficulty';

describe('suggestDifficulty', () => {
  it('rates a short, simple recipe as easy', () => {
    expect(suggestDifficulty({ steps: ['a', 'b'], ingredients: ['eggs', 'salt'], time: 10 })).toBe('easy');
  });

  it('rates a recipe with many steps as hard', () => {
    const steps = Array.from({ length: 9 }, (_, i) => `step ${i}`);
    expect(suggestDifficulty({ steps, ingredients: ['eggs'], time: 10 })).toBe('hard');
  });

  it('rates a recipe with many ingredients as hard', () => {
    const ingredients = Array.from({ length: 12 }, (_, i) => `ing ${i}`);
    expect(suggestDifficulty({ steps: ['a'], ingredients, time: 10 })).toBe('hard');
  });

  it('rates a long recipe as hard regardless of step/ingredient count', () => {
    expect(suggestDifficulty({ steps: ['a'], ingredients: ['eggs'], time: 60 })).toBe('hard');
  });

  it('rates a moderate recipe as medium', () => {
    expect(suggestDifficulty({ steps: ['a', 'b', 'c', 'd', 'e'], ingredients: ['1', '2', '3'], time: 35 })).toBe('medium');
  });

  it('stays easy at the upper edge of the easy thresholds', () => {
    expect(suggestDifficulty({ steps: ['1', '2', '3', '4'], ingredients: ['1', '2', '3', '4', '5', '6'], time: 20 })).toBe('easy');
  });

  it('tips to medium when one easy threshold is exceeded but no hard threshold is reached', () => {
    // 5 steps > easy max (4), but below every hard threshold → medium
    expect(suggestDifficulty({ steps: ['1', '2', '3', '4', '5'], ingredients: ['1'], time: 10 })).toBe('medium');
  });
});

describe('localizeDifficulty', () => {
  it('returns the English label', () => {
    expect(localizeDifficulty('easy', true)).toBe('Easy');
    expect(localizeDifficulty('medium', true)).toBe('Medium');
    expect(localizeDifficulty('hard', true)).toBe('Hard');
  });

  it('returns the Bulgarian label', () => {
    expect(localizeDifficulty('easy', false)).toBe('Лесно');
    expect(localizeDifficulty('medium', false)).toBe('Средно');
    expect(localizeDifficulty('hard', false)).toBe('Трудно');
  });
});

describe('DIFFICULTY_OPTIONS', () => {
  it('lists the three levels in easy→hard order', () => {
    expect(DIFFICULTY_OPTIONS.map((option) => option.id)).toEqual(['easy', 'medium', 'hard']);
  });
});
