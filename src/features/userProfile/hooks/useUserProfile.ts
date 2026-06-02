import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

interface UserProfileData {
  userName: string;
  recipes: Recipe[];
}

interface UserProfile {
  userName: string;
  recipes: Recipe[];
  loading: boolean;
}

const fetchUserProfile = async (userId: string): Promise<UserProfileData> => {
  const [recipesResult, userResult] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, name, name_en, name_translated, source_lang, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, difficulty, required_ingredients, is_ai, is_public, user_id, author_name, author_email')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single(),
  ]);

  const recipes = recipesResult.data?.map(mapRecipeRow) ?? [];
  const userName = userResult.data?.name || (recipesResult.data?.[0]?.author_name as string) || '';

  return { userName, recipes };
};

export const useUserProfile = (userId: string): UserProfile => {
  const { data, isPending } = useQuery<UserProfileData>({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: userId !== '',
  });

  return {
    userName: data?.userName ?? '',
    recipes: data?.recipes ?? [],
    loading: userId !== '' && isPending,
  };
};
