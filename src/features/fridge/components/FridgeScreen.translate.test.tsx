import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';
import type { MatchedRecipe } from '../utils/matchFromFridge';

vi.mock('../../../shared/utils/openGoogleTranslate', () => ({
  openGoogleTranslate: vi.fn().mockResolvedValue({ clipboardUsed: false }),
}));
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

import { openGoogleTranslate } from '../../../shared/utils/openGoogleTranslate';
import { searchByFridge } from '../utils/searchTheMealDB';

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [{ id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' }] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: 'Test User', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const makeApiRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: 'recipe-api-1',
  name: 'Chicken Soup',
  nameEn: 'Chicken Soup',
  emoji: '🍲',
  ingredients: ['1 chicken', 'salt', 'water'],
  requiredIngredients: ['chicken'],
  steps: ['Boil water', 'Add chicken'],
  time: 40,
  tags: [],
  isAI: false,
  isPublic: false,
  matchScore: 1,
  matchedCount: 1,
  ...overrides,
});

const clickSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole('button', { name: /Какво мога да готвя|What can I cook/i }),
  );
};

describe('FridgeScreen – translate button visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe()]);
  });

  it('shows translate button when lang is bg and recipe is not AI', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );
  });

  it('does not show translate button when lang is en', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ lang: 'en' })} />);
    await clickSearch(user);
    await waitFor(() => expect(screen.getByText('Chicken Soup')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('does not show translate button for AI-generated recipes', async () => {
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe({ isAI: true })]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() => expect(screen.getByText('Chicken Soup')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('does not show translate button for local database recipes without an English name', async () => {
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Пилешка супа', nameEn: undefined }),
    ]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() => expect(screen.getByText('Пилешка супа')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });
});

describe('FridgeScreen – translate calls openGoogleTranslate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (openGoogleTranslate as ReturnType<typeof vi.fn>).mockResolvedValue({ clipboardUsed: false });
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe()]);
  });

  it('calls openGoogleTranslate with the recipe when translate button is clicked', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));

    await waitFor(() =>
      expect(openGoogleTranslate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Chicken Soup',
          nameEn: 'Chicken Soup',
          ingredients: ['1 chicken', 'salt', 'water'],
          steps: ['Boil water', 'Add chicken'],
        }),
      ),
    );
  });
});
