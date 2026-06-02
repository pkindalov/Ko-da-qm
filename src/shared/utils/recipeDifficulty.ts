import type { Difficulty } from '../types';

// Heuristic thresholds for the auto-suggested difficulty. A recipe is "easy" only
// when it stays at or below every easy ceiling; it is "hard" as soon as any single
// hard floor is reached (a recipe can be long, ingredient-heavy, OR many-stepped and
// still be hard). Everything in between is "medium".
const EASY_MAX_STEPS = 4;
const EASY_MAX_INGREDIENTS = 6;
const EASY_MAX_TIME_MIN = 20;

const HARD_MIN_STEPS = 9;
const HARD_MIN_INGREDIENTS = 12;
const HARD_MIN_TIME_MIN = 60;

interface DifficultyInput {
  steps: string[];
  ingredients: string[];
  time: number;
}

export const suggestDifficulty = ({ steps, ingredients, time }: DifficultyInput): Difficulty => {
  const stepCount = steps.length;
  const ingredientCount = ingredients.length;

  if (stepCount <= EASY_MAX_STEPS && ingredientCount <= EASY_MAX_INGREDIENTS && time <= EASY_MAX_TIME_MIN) {
    return 'easy';
  }
  if (stepCount >= HARD_MIN_STEPS || ingredientCount >= HARD_MIN_INGREDIENTS || time >= HARD_MIN_TIME_MIN) {
    return 'hard';
  }
  return 'medium';
};

// Display labels. Stored value is always the canonical EN id; this turns it into a
// language-appropriate label, mirroring localizeMealTag in recipeDisplayName.ts.
export const DIFFICULTY_OPTIONS: { id: Difficulty; en: string; bg: string }[] = [
  { id: 'easy', en: 'Easy', bg: 'Лесно' },
  { id: 'medium', en: 'Medium', bg: 'Средно' },
  { id: 'hard', en: 'Hard', bg: 'Трудно' },
];

export const localizeDifficulty = (difficulty: Difficulty, isEnglish: boolean): string => {
  const option = DIFFICULTY_OPTIONS.find((entry) => entry.id === difficulty);
  if (option == null) return difficulty;
  return isEnglish ? option.en : option.bg;
};
