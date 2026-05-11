import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Recipe } from '../../../shared/types';

const mapRow = (r: Record<string, unknown>): Recipe => ({
  id: r.id as string,
  name: r.name as string,
  nameEn: (r.name_en as string | null) ?? undefined,
  emoji: r.emoji as string,
  ingredients: (r.ingredients as string[]) ?? [],
  steps: (r.steps as string[]) ?? [],
  time: r.time as number,
  tags: (r.tags as string[]) ?? [],
  requiredIngredients: (r.required_ingredients as string[]) ?? [],
  isAI: r.is_ai as boolean,
  isPublic: (r.is_public as boolean) ?? false,
  authorName: (r.author_name as string | null) ?? undefined,
  authorEmail: (r.author_email as string | null) ?? undefined,
});

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
      .select('*')
      .eq('is_public', true)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPublicRecipes(data.map(mapRow));
    setLoading(false);
  };

  return { publicRecipes, loading };
};
