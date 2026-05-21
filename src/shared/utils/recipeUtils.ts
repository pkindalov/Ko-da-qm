import type { Recipe } from '../types';

export type RecipeRisk = 'safe' | 'dislike' | 'allergy';

const matchesAny = (ingredient: string, list: string[]) =>
  list.some(b => ingredient.toLowerCase().includes(b.toLowerCase()));

export const recipeRisk = (recipe: Recipe, allergies: string[], dislikes: string[]): RecipeRisk => {
  if (recipe.requiredIngredients?.some(i => matchesAny(i, allergies))) return 'allergy';
  if (recipe.requiredIngredients?.some(i => matchesAny(i, dislikes))) return 'dislike';
  return 'safe';
};

export const isSafe = (recipe: Recipe, blocked: string[]): boolean =>
  !recipe.requiredIngredients?.some((i) => matchesAny(i, blocked));
