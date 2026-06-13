import type { Recipe, Language, Difficulty } from '../types';

export const mapRecipeRow = (row: Record<string, unknown>): Recipe => ({
  id: row.id as string,
  name: row.name as string,
  nameEn: (row.name_en as string | null) ?? undefined,
  sourceLang: (row.source_lang as Language | null) ?? undefined,
  emoji: row.emoji as string,
  imageUrl: (row.image_url as string | null) ?? undefined,
  imageUrls: ((row.image_urls as string[] | null)?.length ?? 0) > 0 ? (row.image_urls as string[]) : undefined,
  ingredients: (row.ingredients as string[]) ?? [],
  steps: (row.steps as string[]) ?? [],
  nameTranslated: (row.name_translated as string | null) ?? undefined,
  ingredientsTranslated: ((row.ingredients_translated as string[] | null)?.length ?? 0) > 0
    ? (row.ingredients_translated as string[])
    : undefined,
  stepsTranslated: ((row.steps_translated as string[] | null)?.length ?? 0) > 0
    ? (row.steps_translated as string[])
    : undefined,
  time: row.time as number,
  tags: (row.tags as string[]) ?? [],
  difficulty: (row.difficulty as Difficulty | null) ?? undefined,
  requiredIngredients: (row.required_ingredients as string[]) ?? [],
  isAI: row.is_ai as boolean,
  isPublic: (row.is_public as boolean) ?? false,
  authorId: (row.user_id as string | null) ?? undefined,
  authorName: (row.author_name as string | null) ?? undefined,
  authorEmail: (row.author_email as string | null) ?? undefined,
});
