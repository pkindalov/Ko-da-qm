import type { FridgeItem } from '../../../shared/types';
import type { MatchedRecipe } from './matchFromFridge';

const BASE = 'https://www.themealdb.com/api/json/v1/1';
const MEAL_DB_MAX_INGREDIENTS = 20;
const MAX_SEARCH_RESULTS = 8;
const DEFAULT_ESTIMATED_TIME_MIN = 30;

const CATEGORY_EMOJI: Record<string, string> = {
  Beef: '🥩', Chicken: '🍗', Seafood: '🐟', Vegetarian: '🥗',
  Pasta: '🍝', Dessert: '🍰', Breakfast: '🍳', Lamb: '🍖',
  Pork: '🥓', Vegan: '🥦', Miscellaneous: '🍽', Side: '🍚',
  Starter: '🥙', Goat: '🍖',
};

// Common Bulgarian food names → English (TheMealDB ingredient names)
const BG_TO_EN: Record<string, string> = {
  яйца: 'eggs', яйце: 'eggs',
  мляко: 'milk',
  масло: 'butter',
  хляб: 'bread',
  кашкавал: 'cheese',
  сирене: 'feta',
  картофи: 'potatoes', картоф: 'potato',
  пиле: 'chicken', пилешко: 'chicken',
  говеждо: 'beef',
  свинско: 'pork',
  кайма: 'minced beef',
  риба: 'fish',
  сьомга: 'salmon',
  'риба тон': 'tuna',
  скариди: 'prawns',
  домати: 'tomatoes', домат: 'tomato',
  краставица: 'cucumber',
  чушки: 'peppers', чушка: 'pepper',
  моркови: 'carrots', морков: 'carrot',
  лук: 'onion',
  чесън: 'garlic',
  гъби: 'mushrooms',
  спанак: 'spinach',
  тиквички: 'courgettes',
  броколи: 'broccoli',
  зеле: 'cabbage',
  патладжан: 'aubergine',
  боб: 'beans',
  леща: 'lentils',
  нахут: 'chickpeas',
  царевица: 'sweetcorn',
  брашно: 'flour',
  захар: 'sugar',
  ориз: 'rice',
  макарони: 'pasta',
  олио: 'oil',
  зехтин: 'olive oil',
  'доматено пюре': 'tomato puree',
  'доматен сос': 'passata',
  бекон: 'bacon',
  шунка: 'ham',
  кренвирши: 'sausages',
  'кисело мляко': 'yogurt', кефир: 'yogurt',
  сметана: 'cream',
  банан: 'banana',
  ябълка: 'apple',
  лимон: 'lemon',
  портокал: 'orange',
  мед: 'honey',
  ванилия: 'vanilla',
  канела: 'cinnamon',
  сол: 'salt',
  'черен пипер': 'pepper',
};

export const toEnglish = (name: string): string => {
  const lower = name.toLowerCase().trim();
  return BG_TO_EN[lower] ?? lower;
};

interface FilterMeal { idMeal: string; strMeal: string }
interface DetailMeal { idMeal: string; strMeal: string; strCategory: string; strArea: string; strInstructions: string; strTags: string | null; strMealThumb: string | null; [key: string]: string | null }

const filterByIngredient = async (ingredient: string): Promise<string[]> => {
  try {
    const res = await fetch(`${BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
    const data = await res.json() as { meals: FilterMeal[] | null };
    return data.meals?.map((m) => m.idMeal) ?? [];
  } catch {
    return [];
  }
};

const fetchDetail = async (id: string): Promise<DetailMeal | null> => {
  try {
    const res = await fetch(`${BASE}/lookup.php?i=${id}`);
    const data = await res.json() as { meals: DetailMeal[] | null };
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
};

const mealToMatchedRecipe = (meal: DetailMeal, matchedCount: number, totalFridgeItems: number): MatchedRecipe => {
  const ingredients: string[] = [];
  const requiredIngredients: string[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= MEAL_DB_MAX_INGREDIENTS; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (!ing?.trim()) break;
    const ingTrimmed = ing.trim();
    if (seen.has(ingTrimmed.toLowerCase())) continue;
    seen.add(ingTrimmed.toLowerCase());
    ingredients.push(`${measure?.trim() ?? ''} ${ingTrimmed}`.trim());
    requiredIngredients.push(ingTrimmed);
  }

  const steps = meal.strInstructions
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tags = [meal.strCategory, meal.strArea].filter(Boolean);

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    nameEn: meal.strMeal,
    emoji: CATEGORY_EMOJI[meal.strCategory] ?? '🍽',
    imageUrl: meal.strMealThumb ?? undefined,
    ingredients,
    steps,
    time: DEFAULT_ESTIMATED_TIME_MIN,
    tags,
    requiredIngredients,
    isAI: false,
    isPublic: false,
    matchedCount,
    matchScore: matchedCount / totalFridgeItems,
  };
};

export const searchByFridge = async (fridgeItems: FridgeItem[], blocked: string[], excludeIds: string[] = []): Promise<MatchedRecipe[]> => {
  if (fridgeItems.length === 0) return [];

  const englishNames = fridgeItems.map((f) => toEnglish(f.name));

  // Query TheMealDB for each fridge item in parallel
  const idLists = await Promise.all(englishNames.map(filterByIngredient));

  // Count how many fridge items each meal ID appears for
  const idCount: Record<string, number> = {};
  for (const ids of idLists) {
    for (const id of ids) {
      idCount[id] = (idCount[id] ?? 0) + 1;
    }
  }

  // Take top results by match count, skipping already-seen IDs
  const topIds = Object.entries(idCount)
    .sort((a, b) => b[1] - a[1])
    .filter(([id]) => !excludeIds.includes(id))
    .slice(0, MAX_SEARCH_RESULTS)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const details = await Promise.all(topIds.map(fetchDetail));

  const isBlocked = (ing: string) =>
    blocked.some((b) => ing.toLowerCase().includes(b.toLowerCase()));

  return details
    .filter((m): m is DetailMeal => m !== null)
    .map((m) => mealToMatchedRecipe(m, idCount[m.idMeal], fridgeItems.length))
    .filter((r) => !r.requiredIngredients.some(isBlocked))
    .sort((a, b) => b.matchedCount - a.matchedCount);
};
