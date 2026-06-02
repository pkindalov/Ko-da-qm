import { describe, it, expect } from 'vitest';
import { parseStepDuration, ingredientsInStep } from './parseStepDuration';

describe('parseStepDuration', () => {
  it('reads English minutes', () => {
    expect(parseStepDuration('Simmer for 10 minutes')).toBe(10);
    expect(parseStepDuration('5 min')).toBe(5);
    expect(parseStepDuration('Bake 1 minute')).toBe(1);
  });

  it('reads Bulgarian minutes', () => {
    expect(parseStepDuration('Запечете 20 минути')).toBe(20);
    expect(parseStepDuration('Вари 1 минута')).toBe(1);
    expect(parseStepDuration('Остави за 8 мин')).toBe(8);
  });

  it('converts hours to minutes', () => {
    expect(parseStepDuration('Cook 1 hour')).toBe(60);
    expect(parseStepDuration('Бавно 2 часа')).toBe(120);
    expect(parseStepDuration('Rest 1 h')).toBe(60);
  });

  it('takes the first duration when several appear', () => {
    expect(parseStepDuration('Boil 10 min, then simmer 25 minutes')).toBe(10);
  });

  it('returns null when there is no duration', () => {
    expect(parseStepDuration('Stir well')).toBeNull();
    expect(parseStepDuration('Add salt to taste')).toBeNull();
    expect(parseStepDuration('')).toBeNull();
  });

  it('does not treat a bare number as a duration', () => {
    expect(parseStepDuration('Add 3 eggs')).toBeNull();
  });
});

describe('ingredientsInStep', () => {
  const ingredients = ['2 onions', 'olive oil', 'salt', 'chicken breast'];

  it('returns ingredients whose words appear in the step text', () => {
    const used = ingredientsInStep(ingredients, 'Fry the onions in olive oil');
    expect(used).toContain('2 onions');
    expect(used).toContain('olive oil');
    expect(used).not.toContain('chicken breast');
  });

  it('matches case-insensitively', () => {
    expect(ingredientsInStep(ingredients, 'Season with SALT')).toContain('salt');
  });

  it('ignores short words to avoid false matches', () => {
    // "oil" (3 chars) matches, but a 2-char token would not.
    expect(ingredientsInStep(['a', 'olive oil'], 'brush with oil')).toEqual(['olive oil']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(ingredientsInStep(ingredients, 'Preheat the oven')).toEqual([]);
  });
});
