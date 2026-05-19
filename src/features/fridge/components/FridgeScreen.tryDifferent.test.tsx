import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
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

const tomatoFridgeItem: FridgeItem = { id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' };

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [tomatoFridgeItem] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  addProduct: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const makeMatchedRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: crypto.randomUUID(),
  name: 'Test Recipe',
  nameEn: 'Test Recipe',
  emoji: '🍽',
  ingredients: ['Домати'],
  requiredIngredients: ['Домати'],
  steps: ['Нарежи доматите'],
  time: 20,
  tags: [],
  isAI: true,
  isPublic: false,
  matchScore: 1,
  matchedCount: 1,
  ...overrides,
});

const enableGeminiMode = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('checkbox'));
};

const clickAskGemini = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Попитай Gemini/i }));
};

const clickTryDifferent = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Опитай различни/i }));
};

describe('FridgeScreen – Try different suggestions button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show the button before any search', () => {
    render(<FridgeScreen {...makeProps()} />);
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('does not show the button after non-Gemini search', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await user.click(screen.getByRole('button', { name: /Какво мога да готвя/i }));
    await waitFor(() => expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('shows the button after Gemini search returns results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMatchedRecipe({ name: 'Доматена салата' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Доматена салата')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument();
  });

  it('does not show the button when Gemini returns no results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('passes seen recipe names as excludeNames on "Try different"', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Доматена салата' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Пица с домати' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Доматена салата')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(searchWithGemini).toHaveBeenCalledTimes(2));

    const excludeNamesArg = (searchWithGemini as ReturnType<typeof vi.fn>).mock.calls[1][3];
    expect(excludeNamesArg).toContain('Доматена салата');
  });

  it('replaces current suggestions with new results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Доматена салата' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Пица с домати' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Доматена салата')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(screen.getByText('Пица с домати')).toBeInTheDocument());
    expect(screen.queryByText('Доматена салата')).not.toBeInTheDocument();
  });

  it('filters out duplicates returned by Gemini on "Try different"', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Доматена салата' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Доматена салата' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Доматена салата')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument();
  });

  it('accumulates seen names across multiple "Try different" clicks', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта А' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта Б' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта В' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Рецепта А')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Рецепта Б')).toBeInTheDocument());
    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Рецепта В')).toBeInTheDocument());

    const thirdCallExcludeNames = (searchWithGemini as ReturnType<typeof vi.fn>).mock.calls[2][3];
    expect(thirdCallExcludeNames).toContain('Рецепта А');
    expect(thirdCallExcludeNames).toContain('Рецепта Б');
  });

  it('shows loading state and disables the button while fetching', async () => {
    const user = userEvent.setup();
    let resolveSecond!: (v: MatchedRecipe[]) => void;
    const pending = new Promise<MatchedRecipe[]>((res) => { resolveSecond = res; });

    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта А' })])
      .mockReturnValueOnce(pending);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Опитай различни/i }));

    // During loading the button text changes — "Опитай различни" is gone
    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();

    resolveSecond([makeMatchedRecipe({ name: 'Рецепта Б' })]);
    await waitFor(() => expect(screen.getByText('Рецепта Б')).toBeInTheDocument());

    // After loading the button comes back (new results > 0)
    expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument();
  });

  it('clearing suggestions hides the "Try different" button', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMatchedRecipe({ name: 'Доматена салата' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Изчисти/i }));

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('filters out recipes with blocked ingredients from "Try different" results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Безопасна рецепта' })])
      .mockResolvedValueOnce([makeMatchedRecipe({
        name: 'Рецепта с алергени',
        requiredIngredients: ['nuts', 'flour'],
        ingredients: ['nuts', 'flour'],
      })]);

    render(<FridgeScreen {...makeProps({
      profile: { name: '', allergies: ['nuts'], dislikes: [], dietaryPrefs: [] },
    })} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Безопасна рецепта')).toBeInTheDocument());
    await clickTryDifferent(user);

    await waitFor(() => expect(searchWithGemini).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Рецепта с алергени')).not.toBeInTheDocument();
    expect(screen.getByText(/Няма съвпадения/i)).toBeInTheDocument();
  });

  it('disabling Gemini mode hides the "Try different" button', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMatchedRecipe({ name: 'Доматена салата' }),
    ]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByRole('button', { name: /Опитай различни/i })).toBeInTheDocument());

    // Toggle Gemini mode off
    await user.click(screen.getByRole('checkbox'));

    expect(screen.queryByRole('button', { name: /Опитай различни/i })).not.toBeInTheDocument();
  });

  it('shows English button text when lang is "en"', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeMatchedRecipe({ name: 'Tomato Salad' }),
    ]);

    render(<FridgeScreen {...makeProps({ lang: 'en' })} />);
    await user.click(screen.getByRole('checkbox')); // enable Gemini mode
    await user.click(screen.getByRole('button', { name: /Ask Gemini/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Try different/i })).toBeInTheDocument());
  });

  it('shows toast when "Try different" finds new Gemini results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта А' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта Б' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Рецепта А')).toBeInTheDocument());
    vi.mocked(toast.success).mockClear();

    await clickTryDifferent(user);
    await waitFor(() => expect(screen.getByText('Рецепта Б')).toBeInTheDocument());

    expect(toast.success).toHaveBeenCalledWith('Намерени 1 рецепти');
  });

  it('does not show toast when "Try different" returns no new Gemini results', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта А' })])
      .mockResolvedValueOnce([makeMatchedRecipe({ name: 'Рецепта А' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Рецепта А')).toBeInTheDocument());
    vi.mocked(toast.success).mockClear();

    await clickTryDifferent(user);
    await waitFor(() => expect(searchWithGemini).toHaveBeenCalledTimes(2));

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('resets seen names on fresh search so excludeNames is empty', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>)
      .mockResolvedValue([makeMatchedRecipe({ name: 'Рецепта А' })]);

    render(<FridgeScreen {...makeProps()} />);
    await enableGeminiMode(user);
    await clickAskGemini(user);

    await waitFor(() => expect(screen.getByText('Рецепта А')).toBeInTheDocument());

    // Fresh search — should reset seenGeminiNames
    await clickAskGemini(user);
    await waitFor(() => expect(searchWithGemini).toHaveBeenCalledTimes(2));

    const secondCallExcludeNames = (searchWithGemini as ReturnType<typeof vi.fn>).mock.calls[1][3];
    expect(secondCallExcludeNames ?? []).toHaveLength(0);
  });
});
