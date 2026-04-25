import { RECIPE_DATABASE } from '../../../shared/constants/recipeDatabase';
import type { FridgeItem } from '../../../shared/types';

export interface MatchedRecipe {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  ingredients: string[];
  steps: string[];
  time: number;
  tags: string[];
  requiredIngredients: string[];
  isAI: boolean;
  matchScore: number;
  matchedCount: number;
}

export function matchFromFridge(fridgeItems: FridgeItem[], blocked: string[]): MatchedRecipe[] {
  const fridgeLow = fridgeItems.map((f) => f.name.toLowerCase());

  const matches = (ingredient: string) =>
    fridgeLow.some((f) => f.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(f));

  const isBlocked = (ingredient: string) =>
    blocked.some((b) => ingredient.toLowerCase().includes(b.toLowerCase()));

  return RECIPE_DATABASE
    .filter((r) => !r.requiredIngredients.some(isBlocked))
    .map((r) => {
      const matchedCount = r.requiredIngredients.filter(matches).length;
      const matchScore = matchedCount / r.requiredIngredients.length;
      return { ...r, matchScore, matchedCount };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function searchDatabase(query: string, blocked: string[]) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const isBlocked = (ingredient: string) =>
    blocked.some((b) => ingredient.toLowerCase().includes(b.toLowerCase()));

  return RECIPE_DATABASE
    .filter((r) => !r.requiredIngredients.some(isBlocked))
    .filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q)) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.requiredIngredients.some((i) => i.toLowerCase().includes(q)),
    );
}
