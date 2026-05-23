import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

const PUBLIC_RECIPES_LIMIT = 20;

const fetchPublicRecipes = async (): Promise<Recipe[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];

  const { data } = await supabase
    .from('recipes')
    .select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
    .eq('is_public', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(PUBLIC_RECIPES_LIMIT);

  return data?.map(mapRecipeRow) ?? [];
};

export const usePublicRecipes = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const { data: publicRecipes = [], isPending } = useQuery<Recipe[]>({
    queryKey: ['publicRecipes'],
    queryFn: fetchPublicRecipes,
    enabled,
  });

  return { publicRecipes, loading: enabled && isPending };
};
