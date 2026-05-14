import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { MatchedRecipe } from '../utils/matchFromFridge';

export const useSaveGeminiRecipe = (authorName: string) => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveRecipe = async (recipe: MatchedRecipe, isPublic: boolean): Promise<boolean> => {
    if (savedIds.has(recipe.id)) return true;

    setSavingId(recipe.id);
    setSaveError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newId = crypto.randomUUID();
      const { error } = await supabase.from('recipes').insert({
        id: newId,
        user_id: user.id,
        name: recipe.name,
        name_en: recipe.nameEn ?? null,
        emoji: recipe.emoji,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        time: recipe.time,
        tags: recipe.tags,
        required_ingredients: recipe.requiredIngredients,
        is_ai: true,
        is_public: isPublic,
        author_name: authorName || null,
        author_email: user.email ?? null,
      });

      if (error) throw error;

      setSavedIds(prev => new Set([...prev, recipe.id]));
      return true;
    } catch {
      setSaveError('save_failed');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const clearSaveError = () => setSaveError(null);

  return { savedIds, savingId, saveError, saveRecipe, clearSaveError };
};
