import { incrementUsage } from './translateUsage';

const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get';
const BATCH_SEPARATOR = ' ||| ';
const MAX_CHARS_PER_REQUEST = 490;
const LANG_PAIR_EN_BG = 'en|bg';

export interface TranslatedRecipe {
  name: string;
  ingredients: string[];
  steps: string[];
}

interface MyMemoryResponse {
  responseStatus: number;
  responseData: { translatedText: string };
}

const fetchTranslation = async (text: string): Promise<string> => {
  if (!text.trim()) return text;

  const url = `${MYMEMORY_BASE}?q=${encodeURIComponent(text)}&langpair=${LANG_PAIR_EN_BG}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Translation request failed: ${response.status}`);
  }

  const data: MyMemoryResponse = await response.json();

  // Count the request after a successful HTTP call (regardless of service status)
  incrementUsage();

  if (data.responseStatus !== 200) {
    throw new Error(`Translation service returned status ${data.responseStatus}`);
  }

  return data.responseData.translatedText;
};

export const buildChunks = (items: string[]): string[][] => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const item of items) {
    const separatorLen = current.length > 0 ? BATCH_SEPARATOR.length : 0;
    if (currentLen + separatorLen + item.length > MAX_CHARS_PER_REQUEST && current.length > 0) {
      chunks.push(current);
      current = [item];
      currentLen = item.length;
    } else {
      current.push(item);
      currentLen += separatorLen + item.length;
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

const translateItems = async (items: string[]): Promise<string[]> => {
  if (items.length === 0) return [];

  const chunks = buildChunks(items);
  const translated: string[] = [];

  for (const chunk of chunks) {
    const joined = chunk.join(BATCH_SEPARATOR);
    const result = await fetchTranslation(joined);
    const parts = result.split(BATCH_SEPARATOR);
    // Fall back to originals if separator was not preserved in translation
    translated.push(...(parts.length === chunk.length ? parts : chunk));
  }

  return translated;
};

export const translateRecipe = async (recipe: {
  name: string;
  ingredients: string[];
  steps: string[];
}): Promise<TranslatedRecipe> => {
  const name = await fetchTranslation(recipe.name);
  const ingredients = await translateItems(recipe.ingredients);
  const steps = await translateItems(recipe.steps);
  return { name, ingredients, steps };
};
