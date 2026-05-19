import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

interface UserProfile {
  userName: string;
  recipes: Recipe[];
  loading: boolean;
}

export const useUserProfile = (userId: string): UserProfile => {
  const [userName, setUserName] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    const [recipesResult, userResult] = await Promise.all([
      supabase
        .from('recipes')
        .select('id, name, name_en, name_translated, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single(),
    ]);

    if (recipesResult.data) {
      setRecipes(recipesResult.data.map(mapRecipeRow));
    }

    if (userResult.data?.name) {
      setUserName(userResult.data.name);
    } else if (recipesResult.data?.[0]?.author_name) {
      setUserName(recipesResult.data[0].author_name as string);
    }

    setLoading(false);
  };

  return { userName, recipes, loading };
};
