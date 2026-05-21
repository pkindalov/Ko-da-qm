import type { Recipe } from '../../../shared/types';

export interface RecipeFormData {
  name: string;
  emoji: string;
  time: string;
  ingredients: string;
  steps: string;
  isPublic?: boolean;
}

const DEFAULT_RECIPE_TIME_MIN = 15;

export const parseRecipeForm = (form: RecipeFormData): Omit<Recipe, 'id' | 'authorName' | 'authorEmail'> | null => {
  if (!form.name.trim()) return null;
  const ingredientLines = form.ingredients.split('\n').filter(Boolean);
  return {
    name: form.name,
    emoji: form.emoji || '🍽',
    ingredients: ingredientLines,
    steps: form.steps.split('\n').filter(Boolean),
    time: parseInt(form.time) || DEFAULT_RECIPE_TIME_MIN,
    tags: [],
    isAI: false,
    isPublic: form.isPublic ?? false,
    requiredIngredients: ingredientLines.map((i) => i.split(' ').slice(1).join(' ') || i),
  };
};
