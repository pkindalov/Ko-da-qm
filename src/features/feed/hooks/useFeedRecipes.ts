import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

const FEED_RECIPE_LIMIT = 30;

export const useFeedRecipes = (followingIds: string[]) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (followingIds.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const loadFeedRecipes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, name_en, emoji, image_url, ingredients, steps, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
        .in('user_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(FEED_RECIPE_LIMIT);

      if (error) {
        console.error('useFeedRecipes load error:', error);
        setLoading(false);
        return;
      }

      if (data) setRecipes(data.map(mapRecipeRow));
      setLoading(false);
    };

    loadFeedRecipes();
  }, [followingIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { recipes, loading };
};
