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
  const matchFn = (i: string) => {
    const ingLow = i.toLowerCase();
    return fridgeItems.some((f) => {
      const fLow = f.name.toLowerCase();
      const fEn = toEnglish(f.name).toLowerCase();
      return fLow.includes(ingLow) || ingLow.includes(fLow) || fEn.includes(ingLow) || ingLow.includes(fEn);
    });
  };
  const matchedCount = recipe.requiredIngredients.filter(matchFn).length;

  return {
    id: `gemini-${Date.now()}-${index}`,
    name: recipe.name,
    nameEn: recipe.nameEn,
    emoji: recipe.emoji ?? '🍽',
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    time: recipe.time ?? 30,
    tags: recipe.tags ?? [],
    requiredIngredients: recipe.requiredIngredients,
    isAI: true,
    isPublic: false,
    matchScore: matchedCount / Math.max(recipe.requiredIngredients.length, 1),
    matchedCount,
  };
};

export const searchWithGemini = async (
  fridgeItems: FridgeItem[],
  blocked: string[],
  lang: Language,
): Promise<MatchedRecipe[]> => {
  const { data, error } = await supabase.functions.invoke('gemini-recipes', {
    body: { fridgeItems, blocked, lang },
  });

  if (error || !Array.isArray(data)) return [];

  return (data as GeminiRecipe[]).map((r, i) => toMatchedRecipe(r, i, fridgeItems));
};
