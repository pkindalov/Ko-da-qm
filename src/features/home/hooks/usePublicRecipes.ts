import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

export const usePublicRecipes = () => {
  const [publicRecipes, setPublicRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicRecipes();
  }, []);

  const loadPublicRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('recipes')
      .select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
      .eq('is_public', true)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPublicRecipes(data.map(mapRecipeRow));
    setLoading(false);
  };

  return { publicRecipes, loading };
};
