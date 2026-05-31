import type { Language } from '../types';

// Any Cyrillic letter. Recipes carry no explicit language field, so we infer the
// source language from the script of the (original) name: Cyrillic ⇒ Bulgarian.
const CYRILLIC_PATTERN = /[Ѐ-ӿ]/;

// The language a recipe was authored in. Prefer the stored value; fall back to
// inferring it from the script of the original name (Cyrillic ⇒ Bulgarian) for
// rows saved before source_lang existed.
export const recipeSourceLang = (recipe: { name: string; sourceLang?: Language }): Language =>
  recipe.sourceLang ?? (CYRILLIC_PATTERN.test(recipe.name) ? 'bg' : 'en');

export const recipeDisplayName = (
  recipe: { name: string; nameEn?: string; nameTranslated?: string; sourceLang?: Language },
  lang: Language,
): string => {
  // A saved translation lives in the language opposite the recipe's source, so
  // prefer it whenever the reader's language isn't the source language.
  if (lang !== recipeSourceLang(recipe) && recipe.nameTranslated) return recipe.nameTranslated;
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
