import { supabase } from '../../../lib/supabase';
import type { FridgeItem, Difficulty } from '../../../shared/types';

export interface MatchedRecipe {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
  time: number;
  tags: string[];
  difficulty?: Difficulty;
  requiredIngredients: string[];
  isAI: boolean;
  isPublic: boolean;
  matchScore: number;
  matchedCount: number;
}

type DbRow = {
  id: string;
  name: string;
  name_en: string | null;
  emoji: string;
  image_url?: string | null;
  ingredients: string[];
  steps: string[];
  time: number;
  tags: string[];
  required_ingredients: string[];
  is_ai: boolean;
};

const toMatched = (row: DbRow, fridgeLow: string[], blocked: string[]): MatchedRecipe | null => {
  const isBlocked = (ingredient: string) => blocked.some((blockedEntry) => ingredient.toLowerCase().includes(blockedEntry.toLowerCase()));
  if (row.required_ingredients.some(isBlocked)) return null;

  const matchFn = (ingredient: string) =>
    fridgeLow.some((fridgeName) => fridgeName.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(fridgeName));

  const matchedCount = row.required_ingredients.filter(matchFn).length;
  const matchScore = matchedCount / row.required_ingredients.length;

  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    emoji: row.emoji,
    imageUrl: row.image_url ?? undefined,
    ingredients: row.ingredients,
    steps: row.steps,
    time: row.time,
    tags: row.tags,
    requiredIngredients: row.required_ingredients,
    isAI: row.is_ai,
    isPublic: false,
    matchScore,
    matchedCount,
  };
};

export const matchFromFridge = async (fridgeItems: FridgeItem[], blocked: string[], excludeIds: string[] = []): Promise<MatchedRecipe[]> => {
  const { data, error } = await supabase.from('recipe_database').select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai');
  if (error || !data) return [];

  const fridgeLow = fridgeItems.map((item) => item.name.toLowerCase());

  return (data as DbRow[])
    .map((row) => toMatched(row, fridgeLow, blocked))
    .filter((result): result is MatchedRecipe => result !== null && result.matchScore > 0 && !excludeIds.includes(result.id))
    .sort((a, b) => b.matchScore - a.matchScore);
};

export const searchDatabase = async (query: string, blocked: string[]): Promise<MatchedRecipe[]> => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const [dbResult, userResult] = await Promise.all([
    supabase.from('recipe_database').select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai'),
    supabase.from('recipes').select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai').eq('is_public', true),
  ]);

  const isBlocked = (ingredient: string) => blocked.some((blockedEntry) => ingredient.toLowerCase().includes(blockedEntry.toLowerCase()));
  const matchesQuery = (row: DbRow) =>
    row.name.toLowerCase().includes(normalizedQuery) ||
    row.ingredients.some((ingredient) => ingredient.toLowerCase().includes(normalizedQuery)) ||
    row.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
    row.required_ingredients.some((ingredient) => ingredient.toLowerCase().includes(normalizedQuery));

  const filterAndMap = (rows: DbRow[], isPublic: boolean): MatchedRecipe[] =>
    rows
      .filter((row) => !row.required_ingredients.some(isBlocked) && matchesQuery(row))
      .map((row) => ({ ...toMatched(row, [], [])!, isPublic, matchScore: 1, matchedCount: 1 }));

  return [
    ...filterAndMap((dbResult.data ?? []) as DbRow[], false),
    ...filterAndMap((userResult.data ?? []) as DbRow[], true),
  ];
};
