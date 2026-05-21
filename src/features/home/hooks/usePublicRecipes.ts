import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

const fetchPublicRecipes = async (): Promise<Recipe[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('recipes')
    .select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
    .eq('is_public', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return data?.map(mapRecipeRow) ?? [];
};

export const usePublicRecipes = () => {
  const { data: publicRecipes = [], isPending: loading } = useQuery<Recipe[]>({
    queryKey: ['publicRecipes'],
    queryFn: fetchPublicRecipes,
  });

  return { publicRecipes, loading };
};
