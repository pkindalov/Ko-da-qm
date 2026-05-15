import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export const useRecipeFavoriteCounts = (recipeIds: string[]): Record<string, number> => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const recipeIdsKey = recipeIds.join(',');

  useEffect(() => {
    if (recipeIds.length === 0) return;
    loadCounts();
  }, [recipeIdsKey]);

  const loadCounts = async () => {
    const { data } = await supabase.rpc('get_recipe_favorite_counts', {
      recipe_ids: recipeIds,
    });
    if (!data) return;

    const result: Record<string, number> = {};
    for (const row of data as { recipe_id: string; count: number }[]) {
      result[row.recipe_id] = Number(row.count);
    }
    setCounts(result);
  };

  return counts;
};
