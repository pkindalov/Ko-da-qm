import { describe, it, expect } from 'vitest';
import { parseTranslatedRecipe } from './parseTranslatedRecipe';

const VALID_TEXT = `Пилешка супа
1 пиле
сол
вода
1. Сварете водата
2. Добавете пилето
3. Подправете`;

describe('parseTranslatedRecipe', () => {
  it('parses a standard translated recipe correctly', () => {
    const result = parseTranslatedRecipe(VALID_TEXT);
    expect(result).toEqual({
      name: 'Пилешка супа',
      ingredients: ['1 пиле', 'сол', 'вода'],
      steps: ['Сварете водата', 'Добавете пилето', 'Подправете'],
    });
  });

  it('strips the step number prefix', () => {
    const result = parseTranslatedRecipe(VALID_TEXT);
    expect(result?.steps[0]).toBe('Сварете водата');
    expect(result?.steps[0]).not.toMatch(/^\d/);
  });

  it('accepts "1) step" format as well as "1. step"', () => {
    const text = `Name\ningredient\n1) Step one\n2) Step two`;
    const result = parseTranslatedRecipe(text);
    expect(result?.steps).toEqual(['Step one', 'Step two']);
  });

  it('ignores blank lines between sections', () => {
    const text = `Name\n\ningredient\n\n1. Step one\n\n2. Step two`;
    const result = parseTranslatedRecipe(text);
    expect(result).toEqual({
      name: 'Name',
      ingredients: ['ingredient'],
      steps: ['Step one', 'Step two'],
    });
  });

  it('returns null for empty text', () => {
    expect(parseTranslatedRecipe('')).toBeNull();
  });

  it('returns null when text has fewer than 3 non-empty lines', () => {
    expect(parseTranslatedRecipe('Name\ningredient')).toBeNull();
  });

  it('returns null when no numbered step lines are found', () => {
    const text = `Name\ningredient one\ningredient two\nno steps here`;
    expect(parseTranslatedRecipe(text)).toBeNull();
  });

  it('does not confuse decimal quantities like "3.5 cups" with step lines', () => {
    const text = `Name\n3.5 cups flour\n200g butter\n1. Mix everything\n2. Bake`;
    const result = parseTranslatedRecipe(text);
    expect(result?.ingredients).toEqual(['3.5 cups flour', '200g butter']);
    expect(result?.steps).toEqual(['Mix everything', 'Bake']);
  });

  it('returns null when there are no ingredients (step line immediately after name)', () => {
    const text = `Name\n1. Only a step`;
    expect(parseTranslatedRecipe(text)).toBeNull();
  });

  it('trims whitespace from each line', () => {
    const text = `  Name  \n  ingredient  \n  1. Step  `;
    const result = parseTranslatedRecipe(text);
    expect(result?.name).toBe('Name');
    expect(result?.ingredients[0]).toBe('ingredient');
    expect(result?.steps[0]).toBe('Step');
  });
});
