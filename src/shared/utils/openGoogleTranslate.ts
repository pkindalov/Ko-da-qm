import type { Language } from '../types';

const URL_TEXT_LIMIT = 8000;

export const openGoogleTranslate = async (
  recipe: {
    name: string;
    ingredients: string[];
    steps: string[];
  },
  sourceLang: Language = 'en',
  targetLang: Language = 'bg',
): Promise<{ clipboardUsed: boolean }> => {
  const base = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&op=translate`;
  // Always translate the recipe's source content (name/ingredients/steps).
  const text = [recipe.name, ...recipe.ingredients, ...recipe.steps.map((step, i) => `${i + 1}. ${step}`)].join('\n');

  if (text.length < URL_TEXT_LIMIT) {
    window.open(`${base}&text=${encodeURIComponent(text)}`, '_blank');
    return { clipboardUsed: false };
  }

  try {
    await navigator.clipboard.writeText(text);
    window.open(base, '_blank');
    return { clipboardUsed: true };
  } catch {
    window.open(base, '_blank');
    return { clipboardUsed: false };
  }
};
