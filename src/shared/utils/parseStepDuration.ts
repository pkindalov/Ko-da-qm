// Detects a cooking duration written in a step's free text, in either Bulgarian
// or English. The number may be fractional ("1.5 hours", "1,5 часа") — the
// decimal part is captured so we don't mistake the digits after the separator
// for a whole number. Longer unit spellings come first so the alternation
// prefers them (e.g. "минути" over "мин"). The trailing lookahead stops a unit
// from matching inside a longer word, so "10 mince" or "1 hot" aren't durations.
const MINUTES_PER_HOUR = 60;
const DURATION_RE =
  /(\d+(?:[.,]\d+)?)\s*(минути|минута|мин|minutes|minute|mins|min|часа|час|hours|hour|hrs|hr|ч|h)(?![a-zа-я])/iu;

const HOUR_UNITS = ['hour', 'hours', 'hr', 'hrs', 'h', 'час', 'часа', 'ч'];

export const parseStepDuration = (text: string): number | null => {
  const match = DURATION_RE.exec(text);
  if (match == null) return null;

  const amount = Number(match[1].replace(',', '.'));
  const isHours = HOUR_UNITS.includes(match[2].toLowerCase());
  return isHours ? amount * MINUTES_PER_HOUR : amount;
};

// Words shorter than this are too generic to match reliably (e.g. "a", "to").
const MIN_MATCH_WORD_LENGTH = 3;
const WORD_SEPARATORS = /[^a-zа-я]+/iu;

const significantWords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(WORD_SEPARATORS)
    .filter((word) => word.length >= MIN_MATCH_WORD_LENGTH);

// Two words "match" when one is a prefix of the other. This keeps plurals and
// simple inflections (onion/onions, tomato/tomatoes) while refusing a word that
// merely sits inside another (e.g. "ice" must not match "rice").
const wordsMatch = (a: string, b: string): boolean => a.startsWith(b) || b.startsWith(a);

// Returns the ingredients whose name shares a whole word (>= 3 chars) with the
// step text — a lightweight way to highlight "what you'll touch in this step".
export const ingredientsInStep = (ingredients: string[], stepText: string): string[] => {
  const stepWords = significantWords(stepText);
  return ingredients.filter((ingredient) =>
    significantWords(ingredient).some((word) =>
      stepWords.some((stepWord) => wordsMatch(stepWord, word)),
    ),
  );
};
