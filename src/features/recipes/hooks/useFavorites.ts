import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { mapRecipeRow } from '../../../shared/utils/mapRecipeRow';
import type { Recipe } from '../../../shared/types';

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('recipe_id, recipes(*)');

    if (!data) return;

    const ids = data.map(f => f.recipe_id as string);
    const recipes = data
      .map(f => f.recipes as Record<string, unknown> | null)
      .filter((r): r is Record<string, unknown> => r !== null)
      .map(mapRecipeRow);

    setFavoriteIds(ids);
    setFavoriteRecipes(recipes);
  };

  const addFavorite = async (recipe: Recipe) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFavoriteIds(prev => [...prev, recipe.id]);
    setFavoriteRecipes(prev => [recipe, ...prev]);
    await supabase.from('favorites').insert({ user_id: user.id, recipe_id: recipe.id });
  };

  const removeFavorite = async (recipeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFavoriteIds(prev => prev.filter(id => id !== recipeId));
    setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
    await supabase.from('favorites').delete().eq('recipe_id', recipeId);
  };

  const toggleFavorite = (recipe: Recipe) => {
    if (favoriteIds.includes(recipe.id)) {
      removeFavorite(recipe.id);
    } else {
      addFavorite(recipe);
    }
  };

  return { favoriteIds, favoriteRecipes, toggleFavorite };
};
