import type { Language } from '../types';

export const recipeDisplayName = (
  recipe: { name: string; nameEn?: string; nameTranslated?: string },
  lang: Language,
): string => {
  if (lang === 'bg' && recipe.nameTranslated) return recipe.nameTranslated;
  if (lang === 'en' && recipe.nameEn) return recipe.nameEn;
  return recipe.name;
};
