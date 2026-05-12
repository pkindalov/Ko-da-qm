import type { Recipe } from '../types';

export const mapRecipeRow = (r: Record<string, unknown>): Recipe => ({
  id: r.id as string,
  name: r.name as string,
  nameEn: (r.name_en as string | null) ?? undefined,
  emoji: r.emoji as string,
  ingredients: (r.ingredients as string[]) ?? [],
  steps: (r.steps as string[]) ?? [],
  time: r.time as number,
  tags: (r.tags as string[]) ?? [],
  requiredIngredients: (r.required_ingredients as string[]) ?? [],
  isAI: r.is_ai as boolean,
  isPublic: (r.is_public as boolean) ?? false,
  authorName: (r.author_name as string | null) ?? undefined,
  authorEmail: (r.author_email as string | null) ?? undefined,
});
