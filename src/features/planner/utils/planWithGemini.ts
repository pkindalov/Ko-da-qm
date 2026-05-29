import { supabase } from '../../../lib/supabase';
import type { Recipe, FridgeItem, Product, Language } from '../../../shared/types';

interface GeminiPlanRecipe {
  name: string;
  nameEn?: string;
  emoji?: string;
  tags?: string[];
  ingredients?: string[];
  requiredIngredients?: string[];
  steps?: string[];
  time?: number;
}

interface GeminiPlanResponse {
  recipes: GeminiPlanRecipe[];
  plan: Record<string, number>;
}

export const planWithGemini = async (
  existingRecipes: Recipe[],
  fridge: FridgeItem[],
  products: Product[],
  blocked: string[],
  liked: string[],
  dietaryPrefs: string[],
  lang: Language,
  scheduledNames: string[] = [],
): Promise<{ plan: Record<string, string>; newRecipes: Recipe[] }> => {
  const blockedLower = blocked.map(b => b.toLowerCase());
  const availableIngredients = [
    ...fridge.map(f => f.name),
    ...products.filter(p => p.status !== 'allergic' && p.status !== 'disliked').map(p => p.name),
  ].filter((name, i, arr) => arr.indexOf(name) === i && !blockedLower.includes(name.toLowerCase()));

  const existingNames = existingRecipes.map(r => r.name);

  const { data, error } = await supabase.functions.invoke('gemini-planner', {
    body: { availableIngredients, existingRecipes: existingNames, blocked, liked, dietaryPrefs, lang, scheduledNames },
  });

  if (error != null || typeof data !== 'object' || data === null || Array.isArray(data)) return { plan: {}, newRecipes: [] };

  const { recipes: generated, plan } = data as GeminiPlanResponse;
  if (!Array.isArray(generated) || typeof plan !== 'object' || plan === null) return { plan: {}, newRecipes: [] };

  // Map generated recipe index → final recipe ID
  const indexToId = new Map<number, string>();
  const newRecipes: Recipe[] = [];

  for (let i = 0; i < generated.length; i++) {
    const gen = generated[i];
    if (!gen?.name) continue;

    // Reuse an existing recipe if the name matches (case-insensitive)
    const match = existingRecipes.find(r =>
      r.name.toLowerCase() === gen.name.toLowerCase() ||
      (r.nameEn != null && r.nameEn !== '' && gen.nameEn != null && gen.nameEn !== '' && r.nameEn.toLowerCase() === gen.nameEn.toLowerCase()),
    );

    if (match != null) {
      indexToId.set(i, match.id);
    } else {
      const newRecipe: Recipe = {
        id: crypto.randomUUID(),
        name: gen.name,
        nameEn: gen.nameEn,
        emoji: gen.emoji ?? '🍽',
        ingredients: gen.ingredients ?? [],
        requiredIngredients: gen.requiredIngredients ?? [],
        steps: gen.steps ?? [],
        time: gen.time ?? 30,
        tags: gen.tags ?? [],
        isAI: true,
        isPublic: false,
      };
      newRecipes.push(newRecipe);
      indexToId.set(i, newRecipe.id);
    }
  }

  const result: Record<string, string> = {};
  for (const [slot, idx] of Object.entries(plan)) {
    const index = typeof idx === 'number' ? Math.floor(idx) : Math.floor(Number(idx));
    const id = indexToId.get(index);
    if (id != null) {
      result[slot] = id;
    }
  }
  return { plan: result, newRecipes };
};
