import { supabase } from '../../../lib/supabase';
import type { FridgeItem } from '../../../shared/types';

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

function toMatched(row: DbRow, fridgeLow: string[], blocked: string[]): MatchedRecipe | null {
  const isBlocked = (i: string) => blocked.some((b) => i.toLowerCase().includes(b.toLowerCase()));
  if (row.required_ingredients.some(isBlocked)) return null;

  const matchFn = (i: string) =>
    fridgeLow.some((f) => f.includes(i.toLowerCase()) || i.toLowerCase().includes(f));

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
}

export async function matchFromFridge(fridgeItems: FridgeItem[], blocked: string[], excludeIds: string[] = []): Promise<MatchedRecipe[]> {
  const { data, error } = await supabase.from('recipe_database').select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai');
  if (error || !data) return [];

  const fridgeLow = fridgeItems.map((f) => f.name.toLowerCase());

  return (data as DbRow[])
    .map((r) => toMatched(r, fridgeLow, blocked))
    .filter((r): r is MatchedRecipe => r !== null && r.matchScore > 0 && !excludeIds.includes(r.id))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function searchDatabase(query: string, blocked: string[]): Promise<MatchedRecipe[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const [dbResult, userResult] = await Promise.all([
    supabase.from('recipe_database').select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai'),
    supabase.from('recipes').select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai').eq('is_public', true),
  ]);

  const isBlocked = (i: string) => blocked.some((b) => i.toLowerCase().includes(b.toLowerCase()));
  const matchesQuery = (r: DbRow) =>
    r.name.toLowerCase().includes(q) ||
    r.ingredients.some((i) => i.toLowerCase().includes(q)) ||
    r.tags.some((t) => t.toLowerCase().includes(q)) ||
    r.required_ingredients.some((i) => i.toLowerCase().includes(q));

  const filterAndMap = (rows: DbRow[], isPublic: boolean): MatchedRecipe[] =>
    rows
      .filter((r) => !r.required_ingredients.some(isBlocked) && matchesQuery(r))
      .map((r) => ({ ...toMatched(r, [], [])!, isPublic, matchScore: 1, matchedCount: 1 }));

  return [
    ...filterAndMap((dbResult.data ?? []) as DbRow[], false),
    ...filterAndMap((userResult.data ?? []) as DbRow[], true),
  ];
}
