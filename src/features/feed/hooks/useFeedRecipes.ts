import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

const FEED_RECIPE_LIMIT = 30;

export const useFeedRecipes = (followingIds: string[], enabled = true) => {
  const { data: recipes = [], isPending } = useQuery<Recipe[]>({
    queryKey: ['feedRecipes', followingIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, name_en, name_translated, source_lang, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
        .in('user_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(FEED_RECIPE_LIMIT);

      if (error) {
        console.error('useFeedRecipes load error:', error);
        return [];
      }
      return data?.map(mapRecipeRow) ?? [];
    },
    enabled: enabled && followingIds.length > 0,
  });

  // When disabled due to empty followingIds → not loading.
  // When disabled by caller (enabled=false) but ids are present → keep loading=true
  // to match the original useEffect behaviour where the effect guard prevented completion.
  const loading = followingIds.length > 0 && (enabled ? isPending : true);

  return { recipes, loading };
};
