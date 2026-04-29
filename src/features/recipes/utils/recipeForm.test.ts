import { describe, it, expect } from 'vitest';
import { parseRecipeForm } from './recipeForm';

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
});
