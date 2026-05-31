import { supabase } from '../../lib/supabase';
import type { Language } from '../types';

export interface RecipeTranslation {
  name: string;
  ingredients: string[];
  steps: string[];
}

// Asks the translate-recipe edge function for a recipe's translation in the
// target language. The function serves a shared cache first and only calls the
// model on a miss. Returns null on any failure so the caller can fall back.
export const fetchRecipeTranslation = async (
  recipeId: string,
  targetLang: Language,
): Promise<RecipeTranslation | null> => {
  const { data, error } = await supabase.functions.invoke('translate-recipe', {
    body: { recipeId, targetLang },
  });

  if (error != null || data == null || typeof data !== 'object') return null;

  const result = data as Partial<RecipeTranslation> & { error?: string };
  if (result.error != null) return null;
  if (typeof result.name !== 'string' || !Array.isArray(result.ingredients) || !Array.isArray(result.steps)) {
    return null;
  }

  return { name: result.name, ingredients: result.ingredients, steps: result.steps };
};
