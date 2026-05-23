import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe, Language } from '../../../shared/types';

interface FavoritesData {
  favoriteIds: string[];
  favoriteRecipes: Recipe[];
}

const EMPTY_FAVORITES: FavoritesData = { favoriteIds: [], favoriteRecipes: [] };

const fetchFavorites = async (): Promise<FavoritesData> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return EMPTY_FAVORITES;

  const { data } = await supabase.from('favorites').select('recipe_id, recipes(*)');
  if (!data) return EMPTY_FAVORITES;

  const favoriteIds = data.map(favorite => favorite.recipe_id as string);
  const favoriteRecipes = data
    .map(favorite => favorite.recipes as unknown as Record<string, unknown> | null)
    .filter((recipeRecord): recipeRecord is Record<string, unknown> => recipeRecord !== null)
    .map(mapRecipeRow);

  return { favoriteIds, favoriteRecipes };
};

export const useFavorites = (lang: Language = 'bg') => {
  const queryClient = useQueryClient();

  const { data } = useQuery<FavoritesData>({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
  });

  const favoriteIds = data?.favoriteIds ?? [];
  const favoriteRecipes = data?.favoriteRecipes ?? [];

  const addMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipe.id });
      if (error) throw error;
    },
    onMutate: async (recipe) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData<FavoritesData>(['favorites']);
      queryClient.setQueryData<FavoritesData>(['favorites'], (old) => {
        const prev = old ?? EMPTY_FAVORITES;
        if (prev.favoriteIds.includes(recipe.id)) return prev;
        return {
          favoriteIds: [...prev.favoriteIds, recipe.id],
          favoriteRecipes: [recipe, ...prev.favoriteRecipes],
        };
      });
      return { previous };
    },
    onError: (_err, _recipe, context) => {
      queryClient.setQueryData(['favorites'], context?.previous);
      toast.error(lang === 'en' ? 'Failed to add to favorites' : 'Грешка при добавяне в любими');
    },
    onSuccess: () => {
      toast.success(lang === 'en' ? 'Added to favorites' : 'Добавено в любими');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('favorites').delete().eq('recipe_id', recipeId).eq('user_id', user.id);
      if (error) throw error;
    },
    onMutate: async (recipeId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData<FavoritesData>(['favorites']);
      queryClient.setQueryData<FavoritesData>(['favorites'], (old) => {
        const prev = old ?? EMPTY_FAVORITES;
        return {
          favoriteIds: prev.favoriteIds.filter(id => id !== recipeId),
          favoriteRecipes: prev.favoriteRecipes.filter(recipe => recipe.id !== recipeId),
        };
      });
      return { previous };
    },
    onError: (_err, _recipeId, context) => {
      queryClient.setQueryData(['favorites'], context?.previous);
      toast.error(lang === 'en' ? 'Failed to remove from favorites' : 'Грешка при премахване от любими');
    },
    onSuccess: () => {
      toast.success(lang === 'en' ? 'Removed from favorites' : 'Премахнато от любими');
    },
  });

  const toggleFavorite = (recipe: Recipe) => {
    const latestIds = queryClient.getQueryData<FavoritesData>(['favorites'])?.favoriteIds ?? [];
    if (latestIds.includes(recipe.id)) {
      removeMutation.mutate(recipe.id);
    } else {
      addMutation.mutate(recipe);
    }
  };

  return { favoriteIds, favoriteRecipes, toggleFavorite };
};
