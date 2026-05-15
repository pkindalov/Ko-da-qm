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

import { searchByFridge } from '../utils/searchTheMealDB';
import { matchFromFridge } from '../utils/matchFromFridge';

const tomatoFridgeItem: FridgeItem = { id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' };

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [tomatoFridgeItem] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const makeApiRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: crypto.randomUUID(),
  name: 'Test Recipe',
  nameEn: 'Test Recipe',
  emoji: '🍽',
  ingredients: ['Домати'],
  requiredIngredients: ['Домати'],
  steps: ['Нарежи доматите'],
  time: 20,
  tags: [],
  isAI: false,
  isPublic: false,
  matchScore: 1,
  matchedCount: 1,
  ...overrides,
});

const clickWhatCanICook = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Какво мога да готвя/i }));
};

const clickTryDifferent = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Опитай различни/i }));
};

describe('FridgeScreen – Try different for Recipe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('does not show the button before any search', () => {
    render(<FridgeScreen {...makeProps()} />);
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('shows the button after Recipe API search returns results from TheMealDB', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Доматена супа' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument();
  });

  it('shows the button after Recipe API falls back to matchFromFridge', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Домашна рецепта' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Домашна рецепта')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument();
  });

  it('does not show the button when both API sources return no results', async () => {
    const user = userEvent.setup();

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('passes seenApiIds as excludeIds to searchByFridge on "Try different"', async () => {
    const user = userEvent.setup();
    const firstId = 'meal-id-1';
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ id: firstId, name: 'Доматена супа' })])
      .mockResolvedValueOnce([makeApiRecipe({ id: 'meal-id-2', name: 'Пица с домати' })]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(searchByFridge).toHaveBeenCalledTimes(2));

    const excludeIdsArg = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[1][2] as string[];
    expect(excludeIdsArg).toContain(firstId);
  });

  it('falls back to matchFromFridge with seenApiIds when TheMealDB returns empty on "Try different"', async () => {
    const user = userEvent.setup();
    const firstId = 'meal-id-1';
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ id: firstId, name: 'Доматена супа' })])
      .mockResolvedValueOnce([]);
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ id: 'local-id-1', name: 'Домашна рецепта' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Домашна рецепта')).toBeInTheDocument());

    const excludeIdsArg = (matchFromFridge as ReturnType<typeof vi.fn>).mock.calls[0][2] as string[];
    expect(excludeIdsArg).toContain(firstId);
  });

  it('replaces current suggestions with new TheMealDB results', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ name: 'Доматена супа' })])
      .mockResolvedValueOnce([makeApiRecipe({ name: 'Пица с домати' })]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(screen.getByText('Пица с домати')).toBeInTheDocument());
    expect(screen.queryByText('Доматена супа')).not.toBeInTheDocument();
  });

  it('shows empty state when "Try different" exhausts all results', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ name: 'Доматена супа' })])
      .mockResolvedValueOnce([]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('accumulates seen IDs across multiple "Try different" clicks', async () => {
    const user = userEvent.setup();
    const idA = 'id-a';
    const idB = 'id-b';
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ id: idA, name: 'Рецепта А' })])
      .mockResolvedValueOnce([makeApiRecipe({ id: idB, name: 'Рецепта Б' })])
      .mockResolvedValueOnce([makeApiRecipe({ id: 'id-c', name: 'Рецепта В' })]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Рецепта А')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Рецепта Б')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Рецепта В')).toBeInTheDocument());

    const thirdCallExcludeIds = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[2][2] as string[];
    expect(thirdCallExcludeIds).toContain(idA);
    expect(thirdCallExcludeIds).toContain(idB);
  });

  it('shows loading state and disables button during fetch', async () => {
    const user = userEvent.setup();
    let resolveSecond!: (v: MatchedRecipe[]) => void;
    const pending = new Promise<MatchedRecipe[]>((res) => { resolveSecond = res; });

    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ name: 'Рецепта А' })])
      .mockReturnValueOnce(pending);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Опитай различни/i }));

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();

    resolveSecond([makeApiRecipe({ name: 'Рецепта Б' })]);
    await waitFor(() => expect(screen.getByText('Рецепта Б')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument();
  });

  it('clearing suggestions hides the button', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Доматена супа' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Изчисти/i }));

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('enabling Gemini mode hides the Recipe API "Try different" button', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Доматена супа' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox'));

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('resets seenApiIds on fresh search so excludeIds is empty', async () => {
    const user = userEvent.setup();
    const firstId = 'meal-id-1';
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValue([makeApiRecipe({ id: firstId, name: 'Доматена супа' })]);

    render(<FridgeScreen {...makeProps()} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Доматена супа')).toBeInTheDocument());

    await clickWhatCanICook(user);
    await waitFor(() => expect(searchByFridge).toHaveBeenCalledTimes(2));

    const secondCallExcludeIds = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[1][2] as string[];
    expect(secondCallExcludeIds ?? []).toHaveLength(0);
  });

  it('filters out recipes with blocked ingredients from "Try different" results', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe({ name: 'Безопасна рецепта' })])
      .mockResolvedValueOnce([makeApiRecipe({
        name: 'Рецепта с алергени',
        requiredIngredients: ['nuts', 'flour'],
        ingredients: ['nuts', 'flour'],
      })]);

    render(<FridgeScreen {...makeProps({
      profile: { name: '', allergies: ['nuts'], dislikes: [], dietaryPrefs: [] },
    })} />);
    await clickWhatCanICook(user);

    await waitFor(() => expect(screen.getByText('Безопасна рецепта')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Рецепта с алергени')).not.toBeInTheDocument();
    expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument();
  });

  it('shows English button text when lang is "en"', async () => {
    const user = userEvent.setup();
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Tomato Soup' }),
    ]);

    render(<FridgeScreen {...makeProps({ lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: /What can I cook/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Try different/i })).toBeInTheDocument());
  });
});
