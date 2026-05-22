import type { Recipe } from '../types';

export type RecipeRisk = 'safe' | 'dislike' | 'allergy';

const matchesAny = (ingredient: string, list: string[]) =>
  list.some(listItem => ingredient.toLowerCase().includes(listItem.toLowerCase()));

export const recipeRisk = (recipe: Recipe, allergies: string[], dislikes: string[]): RecipeRisk => {
  if (recipe.requiredIngredients?.some(ingredient => matchesAny(ingredient, allergies))) return 'allergy';
  if (recipe.requiredIngredients?.some(ingredient => matchesAny(ingredient, dislikes))) return 'dislike';
  return 'safe';
};

export const isSafe = (recipe: Recipe, blocked: string[]): boolean =>
  !recipe.requiredIngredients?.some((ingredient) => matchesAny(ingredient, blocked));
