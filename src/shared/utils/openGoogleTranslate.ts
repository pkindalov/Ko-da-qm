const GOOGLE_TRANSLATE_BASE = 'https://translate.google.com/?sl=en&tl=bg&op=translate';
const URL_TEXT_LIMIT = 8000;

export const openGoogleTranslate = async (recipe: {
  name: string;
  nameEn?: string | null;
  ingredients: string[];
  steps: string[];
}): Promise<{ clipboardUsed: boolean }> => {
  const name = recipe.nameEn ?? recipe.name;
  const text = [name, ...recipe.ingredients, ...recipe.steps.map((s, i) => `${i + 1}. ${s}`)].join('\n');

  if (text.length < URL_TEXT_LIMIT) {
    window.open(`${GOOGLE_TRANSLATE_BASE}&text=${encodeURIComponent(text)}`, '_blank');
    return { clipboardUsed: false };
  }

  try {
    await navigator.clipboard.writeText(text);
    window.open(GOOGLE_TRANSLATE_BASE, '_blank');
    return { clipboardUsed: true };
  } catch {
    window.open(GOOGLE_TRANSLATE_BASE, '_blank');
    return { clipboardUsed: false };
  }
};
