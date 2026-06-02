import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import type { Recipe, Language } from '../../../shared/types';
import type { MatchedRecipe } from '../utils/matchFromFridge';

export const useSaveGeminiRecipe = (
  authorName: string,
  addRecipe: (recipe: Recipe) => void,
  removeRecipe: (id: string) => void,
  lang: Language = 'bg',
) => {
  const [savedIdMap, setSavedIdMap] = useState(new Map<string, string>()); // geminiId → realId
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveRecipe = async (matched: MatchedRecipe, isPublic: boolean): Promise<boolean> => {
    if (savedIdMap.has(matched.id)) return true;

    setSavingId(matched.id);
    setSaveError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      const recipe: Recipe = {
        id: crypto.randomUUID(),
        name: matched.name,
        nameEn: matched.nameEn,
        emoji: matched.emoji,
        imageUrl: matched.imageUrl,
        ingredients: matched.ingredients,
        steps: matched.steps,
        time: matched.time,
        tags: matched.tags,
        difficulty: matched.difficulty,
        requiredIngredients: matched.requiredIngredients,
        isAI: matched.isAI,
        isPublic,
        authorName: authorName || undefined,
        authorEmail: user.email ?? undefined,
      };

      addRecipe(recipe);
      setSavedIdMap(prev => new Map([...prev, [matched.id, recipe.id]]));
      toast.success(lang === 'en' ? 'Recipe saved!' : 'Рецептата е запазена!');
      return true;
    } catch {
      setSaveError('save_failed');
      toast.error(lang === 'en' ? 'Failed to save recipe' : 'Грешка при запазване');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const unsaveRecipe = (geminiId: string) => {
    const realId = savedIdMap.get(geminiId);
    if (!realId) return;
    removeRecipe(realId);
    setSavedIdMap(prev => {
      const next = new Map(prev);
      next.delete(geminiId);
      return next;
    });
  };

  const clearSaveError = () => setSaveError(null);

  return { savedIdMap, savingId, saveError, saveRecipe, unsaveRecipe, clearSaveError };
};
