import { supabase } from '../../../lib/supabase';
import type { Recipe, Language } from '../../../shared/types';

export const planWithGemini = async (
  recipes: Recipe[],
  blocked: string[],
  dietaryPrefs: string[],
  lang: Language,
): Promise<Record<string, string>> => {
  if (recipes.length === 0) return {};

  const recipeInput = recipes.map(r => ({
    name: r.name,
    nameEn: r.nameEn,
    tags: r.tags ?? [],
  }));

  const { data, error } = await supabase.functions.invoke('gemini-planner', {
    body: { recipes: recipeInput, blocked, dietaryPrefs, lang },
  });

  if (error != null || typeof data !== 'object' || data === null || Array.isArray(data)) return {};

  const plan: Record<string, string> = {};
  for (const [slot, idx] of Object.entries(data as Record<string, unknown>)) {
    const index = typeof idx === 'number' ? Math.floor(idx) : Math.floor(Number(idx));
    if (Number.isInteger(index) && index >= 0 && index < recipes.length) {
      plan[slot] = recipes[index].id;
    }
  }
  return plan;
};
