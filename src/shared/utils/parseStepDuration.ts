// Detects a cooking duration written in a step's free text, in either Bulgarian
// or English. Longer unit spellings come first so the alternation prefers them
// (e.g. "минути" over "мин"). The trailing lookahead stops a unit from matching
// inside a longer word, so "10 mince" or "1 hot" are not read as durations.
const MINUTES_PER_HOUR = 60;
const DURATION_RE =
  /(\d+)\s*(минути|минута|мин|minutes|minute|min|часа|час|hours|hour|ч|h)(?![a-zа-я])/iu;

const HOUR_UNITS = ['hour', 'hours', 'h', 'час', 'часа', 'ч'];

export const parseStepDuration = (text: string): number | null => {
  const match = DURATION_RE.exec(text);
  if (match == null) return null;

  const amount = Number(match[1]);
  const isHours = HOUR_UNITS.includes(match[2].toLowerCase());
  return isHours ? amount * MINUTES_PER_HOUR : amount;
};

// Words shorter than this are too generic to match reliably (e.g. "a", "to").
const MIN_MATCH_WORD_LENGTH = 3;

// Returns the ingredients whose name shares a word (>= 3 chars) with the step
// text — a lightweight way to highlight "what you'll touch in this step".
export const ingredientsInStep = (ingredients: string[], stepText: string): string[] => {
  const haystack = stepText.toLowerCase();
  return ingredients.filter((ingredient) => {
    const words = ingredient.toLowerCase().split(/[^a-zа-я]+/iu);
    return words.some(
      (word) => word.length >= MIN_MATCH_WORD_LENGTH && haystack.includes(word),
    );
  });
};
