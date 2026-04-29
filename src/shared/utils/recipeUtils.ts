import type { Recipe } from '../types';

export function isSafe(recipe: Recipe, blocked: string[]): boolean {
  return !recipe.requiredIngredients?.some((i) =>
    blocked.some((b) => i.toLowerCase().includes(b)),
  );
}
