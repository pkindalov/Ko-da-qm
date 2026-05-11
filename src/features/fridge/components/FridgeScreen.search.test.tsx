import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';
import type { MatchedRecipe } from '../utils/matchFromFridge';

vi.mock('../utils/searchWithGemini', () => ({
  searchWithGemini: vi.fn().mockResolvedValue([]),
}));
vi.mock('../utils/searchTheMealDB', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/searchTheMealDB')>();
  return { ...actual, searchByFridge: vi.fn().mockResolvedValue([]) };
});
vi.mock('../utils/matchFromFridge', () => ({
  matchFromFridge: vi.fn().mockResolvedValue([]),
}));

import { searchWithGemini } from '../utils/searchWithGemini';
import { searchByFridge } from '../utils/searchTheMealDB';

const honeyFridgeItem: FridgeItem = { id: 'f1', name: 'Мед', emoji: '🍯', category: 'other' };
const tomatoFridgeItem: FridgeItem = { id: 'f2', name: 'Домати', emoji: '🍅', category: 'veg' };

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const honeyProduct: Product = { id: 'p1', name: 'Мед', nameEn: 'honey', category: 'other', status: 'allergic', emoji: '🍯' };
const dislikedProduct: Product = { id: 'p2', name: 'Гъби', nameEn: 'mushrooms', category: 'veg', status: 'disliked', emoji: '🍄' };

const clickWhatCanICook = async (user: ReturnType<typeof userEvent.setup>, gemini = false) => {
  const name = gemini ? /Попитай Gemini/i : /Какво мога да готвя/i;
  await user.click(screen.getByRole('button', { name }));
};

describe('FridgeScreen – allergic items excluded from search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not pass allergic fridge items to Gemini search', async () => {
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [honeyFridgeItem, tomatoFridgeItem],
          profile: { name: '', allergies: ['Мед'], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await user.click(screen.getByRole('checkbox')); // enable Gemini mode
    await clickWhatCanICook(user, true);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalled());

    const [ingredientsArg] = (searchWithGemini as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).not.toContain('Мед');
    expect(names).toContain('Домати');
  });

  it('does not pass disliked fridge items to Gemini search', async () => {
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [honeyFridgeItem, tomatoFridgeItem],
          profile: { name: '', allergies: [], dislikes: ['Мед'], dietaryPrefs: [] },
        })}
      />,
    );

    await user.click(screen.getByRole('checkbox')); // enable Gemini mode
    await clickWhatCanICook(user, true);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalled());

    const [ingredientsArg] = (searchWithGemini as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).not.toContain('Мед');
  });

  it('does not pass allergic fridge items to API search', async () => {
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [honeyFridgeItem, tomatoFridgeItem],
          profile: { name: '', allergies: ['Мед'], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await clickWhatCanICook(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());

    const [ingredientsArg] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).not.toContain('Мед');
    expect(names).toContain('Домати');
  });

  it('passes all fridge items when none are blocked', async () => {
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [honeyFridgeItem, tomatoFridgeItem],
          profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await clickWhatCanICook(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());

    const [ingredientsArg] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).toContain('Мед');
    expect(names).toContain('Домати');
  });
});

const makeMatchedRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: 'r1',
  name: 'Test Recipe',
  nameEn: 'Test Recipe',
  emoji: '🍽',
  ingredients: [],
  requiredIngredients: [],
  steps: [],
  time: 20,
  tags: [],
  isAI: true,
  isPublic: false,
  matchScore: 1,
  matchedCount: 1,
  ...overrides,
});

describe('FridgeScreen – product-level allergies/dislikes excluded from search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not pass a product-allergic fridge item to API search', async () => {
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [honeyFridgeItem, tomatoFridgeItem],
          products: [honeyProduct],
        })}
      />,
    );

    await clickWhatCanICook(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());

    const [ingredientsArg] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).not.toContain('Мед');
    expect(names).toContain('Домати');
  });

  it('does not pass a product-disliked fridge item to API search', async () => {
    const mushromFridgeItem: FridgeItem = { id: 'f3', name: 'Гъби', emoji: '🍄', category: 'veg' };
    const user = userEvent.setup();
    render(
      <FridgeScreen
        {...makeProps({
          fridge: [mushromFridgeItem, tomatoFridgeItem],
          products: [dislikedProduct],
        })}
      />,
    );

    await clickWhatCanICook(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());

    const [ingredientsArg] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (ingredientsArg as FridgeItem[]).map((i) => i.name);
    expect(names).not.toContain('Гъби');
    expect(names).toContain('Домати');
  });

  it('hides a recipe whose English ingredient matches a product-allergic nameEn', async () => {
    const user = userEvent.setup();
    const honeyRecipe = makeMatchedRecipe({
      id: 'honey-recipe',
      name: 'Honey Cake',
      requiredIngredients: ['flour', 'honey'],
      ingredients: ['flour', 'honey'],
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([honeyRecipe]);

    render(
      <FridgeScreen
        {...makeProps({
          fridge: [tomatoFridgeItem],
          products: [honeyProduct],
        })}
      />,
    );

    await user.click(screen.getByRole('checkbox'));
    await clickWhatCanICook(user, true);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalled());
    expect(screen.queryByText('Honey Cake')).not.toBeInTheDocument();
  });
});

describe('FridgeScreen – post-filter blocks allergic recipes from results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides a Gemini recipe that contains an allergic ingredient', async () => {
    const user = userEvent.setup();
    const honeyRecipe = makeMatchedRecipe({
      id: 'honey-recipe',
      name: 'Honey Omelette',
      requiredIngredients: ['eggs', 'honey'],
      ingredients: ['eggs', 'honey'],
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([honeyRecipe]);

    render(
      <FridgeScreen
        {...makeProps({
          fridge: [tomatoFridgeItem],
          profile: { name: '', allergies: ['honey'], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await user.click(screen.getByRole('checkbox')); // enable Gemini mode
    await clickWhatCanICook(user, true);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalled());
    expect(screen.queryByText('Honey Omelette')).not.toBeInTheDocument();
  });

  it('shows a Gemini recipe that contains no allergic ingredients', async () => {
    const user = userEvent.setup();
    const safeRecipe = makeMatchedRecipe({
      id: 'safe-recipe',
      name: 'Tomato Salad',
      requiredIngredients: ['Домати'],
      ingredients: ['Домати'],
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([safeRecipe]);

    render(
      <FridgeScreen
        {...makeProps({
          fridge: [tomatoFridgeItem],
          profile: { name: '', allergies: ['honey'], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await user.click(screen.getByRole('checkbox')); // enable Gemini mode
    await clickWhatCanICook(user, true);

    await waitFor(() => expect(screen.getByText('Tomato Salad')).toBeInTheDocument());
  });
});
