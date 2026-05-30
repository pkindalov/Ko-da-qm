import type { Language } from '../types';

export const recipeDisplayName = (
  recipe: { name: string; nameEn?: string; nameTranslated?: string },
  lang: Language,
): string => {
  if (lang === 'bg' && recipe.nameTranslated) return recipe.nameTranslated;
  if (lang === 'en' && recipe.nameEn) return recipe.nameEn;
  return recipe.name;
};

type MealType = 'breakfast' | 'lunch' | 'dinner';

// Display labels for meal tags. recipeForm.ts owns turning the meal picker into
// these EN-id tags; this owns turning a stored tag (EN id, or a legacy BG word)
// back into a language-appropriate label for the recipe cards. EN keeps the
// lowercase wording the cards already showed, so only the BG side changes.
const MEAL_LABELS: Record<MealType, { en: string; bg: string }> = {
  breakfast: { en: 'breakfast', bg: 'закуска' },
  lunch: { en: 'lunch', bg: 'обяд' },
  dinner: { en: 'dinner', bg: 'вечеря' },
};

const MEAL_TYPES = Object.keys(MEAL_LABELS) as MealType[];

// Localize a recipe's display tag: meal tags become the localized label, any
// other tag is shown unchanged, and a missing tag falls back to the caller's
// default (e.g. "recipe"/"рецепта", or an empty string in the flipbook).
export const localizeMealTag = (
  tag: string | undefined,
  isEnglish: boolean,
  fallback: string,
): string => {
  if (tag == null) return fallback;
  const normalized = tag.toLowerCase();
  const meal = MEAL_TYPES.find(
    (mealType) => mealType === normalized || MEAL_LABELS[mealType].bg === normalized,
  );
  if (meal == null) return tag;
  return isEnglish ? MEAL_LABELS[meal].en : MEAL_LABELS[meal].bg;
};
