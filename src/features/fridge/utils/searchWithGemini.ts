import { supabase } from '../../../lib/supabase';
import type { FridgeItem, Language } from '../../../shared/types';
import type { MatchedRecipe } from './matchFromFridge';
import { toEnglish } from './searchTheMealDB';

interface GeminiRecipe {
  name: string;
  nameEn?: string;
  emoji?: string;
  ingredients: string[];
  requiredIngredients: string[];
  steps: string[];
  time?: number;
  tags?: string[];
}

const toMatchedRecipe = (recipe: GeminiRecipe, index: number, fridgeItems: FridgeItem[]): MatchedRecipe => {
  const requiredIngredients = recipe.requiredIngredients ?? [];
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];

  const matchFn = (ingredient: string) => {
    const ingLow = ingredient.toLowerCase();
    return fridgeItems.some((fridgeItem) => {
      const fLow = fridgeItem.name.toLowerCase();
      const fEn = toEnglish(fridgeItem.name).toLowerCase();
      return fLow.includes(ingLow) || ingLow.includes(fLow) || fEn.includes(ingLow) || ingLow.includes(fEn);
    });
  };
  const matchedCount = requiredIngredients.filter(matchFn).length;

  return {
    id: `gemini-${Date.now()}-${index}`,
    name: recipe.name,
    nameEn: recipe.nameEn,
    emoji: recipe.emoji ?? '🍽',
    ingredients,
    steps,
    time: recipe.time ?? 30,
    tags: recipe.tags ?? [],
    requiredIngredients,
    isAI: true,
    isPublic: false,
    matchScore: matchedCount / Math.max(requiredIngredients.length, 1),
    matchedCount,
  };
};

export const searchWithGemini = async (
  fridgeItems: FridgeItem[],
  blocked: string[],
  lang: Language,
  excludeNames: string[] = [],
): Promise<MatchedRecipe[]> => {
  const { data, error } = await supabase.functions.invoke('gemini-recipes', {
    body: { fridgeItems, blocked, lang, excludeNames },
  });

  if (error || !Array.isArray(data)) return [];

  return (data as GeminiRecipe[])
    .filter((geminiRecipe): geminiRecipe is GeminiRecipe => geminiRecipe != null && typeof geminiRecipe === 'object')
    .map((geminiRecipe, index) => toMatchedRecipe(geminiRecipe, index, fridgeItems));
};
