import { supabase } from '../../../lib/supabase';
import type { FridgeItem } from '../../../shared/types';

export interface MatchedRecipe {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  ingredients: string[];
  steps: string[];
  time: number;
  tags: string[];
  requiredIngredients: string[];
  isAI: boolean;
  matchScore: number;
  matchedCount: number;
}

type DbRow = {
  id: string;
  name: string;
  name_en: string | null;
  emoji: string;
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
    ingredients: row.ingredients,
    steps: row.steps,
    time: row.time,
    tags: row.tags,
    requiredIngredients: row.required_ingredients,
    isAI: row.is_ai,
    matchScore,
    matchedCount,
  };
}

export async function matchFromFridge(fridgeItems: FridgeItem[], blocked: string[]): Promise<MatchedRecipe[]> {
  const { data, error } = await supabase.from('recipe_database').select('*');
  if (error || !data) return [];

  const fridgeLow = fridgeItems.map((f) => f.name.toLowerCase());

  return (data as DbRow[])
    .map((r) => toMatched(r, fridgeLow, blocked))
    .filter((r): r is MatchedRecipe => r !== null && r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function searchDatabase(query: string, blocked: string[]): Promise<MatchedRecipe[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const { data, error } = await supabase.from('recipe_database').select('*');
  if (error || !data) return [];

  const isBlocked = (i: string) => blocked.some((b) => i.toLowerCase().includes(b.toLowerCase()));

  return (data as DbRow[])
    .filter((r) => !r.required_ingredients.some(isBlocked))
    .filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q)) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.required_ingredients.some((i) => i.toLowerCase().includes(q)),
    )
    .map((r) => ({ ...toMatched(r, [], [])!, matchScore: 1, matchedCount: 1 }));
}
