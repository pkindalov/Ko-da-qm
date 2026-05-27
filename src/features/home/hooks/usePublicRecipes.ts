import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

const PUBLIC_RECIPES_LIMIT = 20;

const fetchPublicRecipes = async (userId: string): Promise<Recipe[]> => {
  const { data } = await supabase
    .from('recipes')
    .select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
    .eq('is_public', true)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(PUBLIC_RECIPES_LIMIT);

  return data?.map(mapRecipeRow) ?? [];
};

export const usePublicRecipes = (options: { enabled?: boolean; userId?: string } = {}) => {
  const { enabled = true, userId } = options;
  const { data: publicRecipes = [], isPending } = useQuery<Recipe[]>({
    queryKey: ['publicRecipes', userId],
    queryFn: () => fetchPublicRecipes(userId!),
    enabled: enabled && !!userId,
  });

  return { publicRecipes, loading: enabled && !!userId && isPending };
};
