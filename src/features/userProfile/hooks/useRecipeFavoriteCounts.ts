import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

const fetchRecipeFavoriteCounts = async (recipeIds: string[]): Promise<Record<string, number>> => {
  const { data } = await supabase.rpc('get_recipe_favorite_counts', {
    recipe_ids: recipeIds,
  });
  if (!data) return {};

  const result: Record<string, number> = {};
  for (const row of data as { recipe_id: string; count: number }[]) {
    result[row.recipe_id] = Number(row.count);
  }
  return result;
};

export const useRecipeFavoriteCounts = (recipeIds: string[]): Record<string, number> => {
  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ['recipeFavoriteCounts', recipeIds],
    queryFn: () => fetchRecipeFavoriteCounts(recipeIds),
    enabled: recipeIds.length > 0,
  });

  return counts;
};
