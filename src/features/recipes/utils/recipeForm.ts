import type { Recipe } from '../../../shared/types';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

// Fixed order so derived tags are deterministic regardless of click order.
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

// Meal tags are stored as the canonical EN ids — the same convention Gemini
// suggestions already use — so the planner's meal filter and any tag checks
// treat user recipes and AI suggestions identically.
//
// Legacy/seed recipes may instead carry the Bulgarian words, so detection
// also accepts those and normalizes them back to the EN id.
const BG_TAG_TO_MEAL: Record<string, MealType> = {
  закуска: 'breakfast',
  обяд: 'lunch',
  вечеря: 'dinner',
};

// Read the meal types back off an existing recipe's tags, recognizing both the
// EN ids and the legacy BG words, returned in canonical order.
export const mealsFromTags = (tags: string[] | undefined): MealType[] => {
  if (tags == null) return [];
  const found = new Set<MealType>();
  for (const tag of tags) {
    const normalized = tag.toLowerCase();
    if (MEAL_ORDER.includes(normalized as MealType)) {
      found.add(normalized as MealType);
    } else if (BG_TAG_TO_MEAL[normalized] != null) {
      found.add(BG_TAG_TO_MEAL[normalized]);
    }
  }
  return MEAL_ORDER.filter((meal) => found.has(meal));
};

// When editing, parseRecipeForm rebuilds tags from the meal picker alone.
// Preserve any non-meal tags the recipe already carried (e.g. a future
// "vegetarian") so an edit doesn't silently drop them. Meal tags stay first so
// the card label keeps showing the meal.
export const mergeMealTags = (newMealTags: string[], existingTags: string[] | undefined): string[] => {
  const nonMealTags = (existingTags ?? []).filter((tag) => mealsFromTags([tag]).length === 0);
  return [...newMealTags, ...nonMealTags];
};

export interface RecipeFormData {
  name: string;
  emoji: string;
  time: string;
  ingredients: string;
  steps: string;
  isPublic?: boolean;
  meals?: MealType[];
}

const DEFAULT_RECIPE_TIME_MIN = 15;

export const parseRecipeForm = (form: RecipeFormData): Omit<Recipe, 'id' | 'authorName' | 'authorEmail'> | null => {
  if (!form.name.trim()) return null;
  const ingredientLines = form.ingredients.split('\n').filter(Boolean);
  const selectedMeals = form.meals ?? [];
  return {
    name: form.name,
    emoji: form.emoji || '🍽',
    ingredients: ingredientLines,
    steps: form.steps.split('\n').filter(Boolean),
    time: parseInt(form.time) || DEFAULT_RECIPE_TIME_MIN,
    tags: MEAL_ORDER.filter((meal) => selectedMeals.includes(meal)),
    isAI: false,
    isPublic: form.isPublic ?? false,
    requiredIngredients: ingredientLines.map((i) => i.split(' ').slice(1).join(' ') || i),
  };
};
