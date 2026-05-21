const IS_STEP_LINE = /^\d+[.)]\s+\S/;
const STEP_PREFIX = /^\d+[.)]\s+/;

export interface ParsedTranslation {
  name: string;
  ingredients: string[];
  steps: string[];
}

export const parseTranslatedRecipe = (text: string): ParsedTranslation | null => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 3) return null;

  const name = lines[0];

  const stepStartIndex = lines.findIndex((line, i) => i > 0 && IS_STEP_LINE.test(line));
  if (stepStartIndex === -1) return null;

  const ingredients = lines.slice(1, stepStartIndex);
  const steps = lines.slice(stepStartIndex).map(line => line.replace(STEP_PREFIX, ''));

  if (ingredients.length === 0 || steps.length === 0) return null;

  return { name, ingredients, steps };
};
