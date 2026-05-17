import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';
import type { MatchedRecipe } from '../utils/matchFromFridge';
import type { TranslatedRecipe } from '../../../shared/utils/translateRecipe';

vi.mock('../../../shared/utils/translateRecipe', () => ({
  translateRecipe: vi.fn(),
}));
vi.mock('../../../shared/utils/translateUsage', () => ({
  isLimitReached: vi.fn().mockReturnValue(false),
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

import { translateRecipe } from '../../../shared/utils/translateRecipe';
import { isLimitReached } from '../../../shared/utils/translateUsage';
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

const translatedResult: TranslatedRecipe = {
  name: 'Пилешка супа',
  ingredients: ['1 пиле', 'сол', 'вода'],
  steps: ['Сварете водата', 'Добавете пилето'],
};

const clickSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole('button', { name: /Какво мога да готвя|What can I cook/i }),
  );
};

describe('FridgeScreen – translate button visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
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
    // Local DB fallback recipes may already be in Bulgarian and have no nameEn
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeApiRecipe({ name: 'Пилешка супа', nameEn: undefined }),
    ]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() => expect(screen.getByText('Пилешка супа')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('shows limit message and hides translate button when daily limit is reached', async () => {
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByText(/Преводът е недостъпен днес/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });
});

describe('FridgeScreen – translate flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (translateRecipe as ReturnType<typeof vi.fn>).mockResolvedValue(translatedResult);
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe()]);
  });

  it('disables the translate button and shows loading text while translating', async () => {
    let resolveTranslation!: (val: TranslatedRecipe) => void;
    (translateRecipe as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise<TranslatedRecipe>((res) => { resolveTranslation = res; }),
    );

    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));

    expect(screen.getByRole('button', { name: /Превежда/i })).toBeDisabled();

    resolveTranslation(translatedResult);
  });

  it('calls translateRecipe with the correct recipe data', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(translateRecipe).toHaveBeenCalledWith({
      name: 'Chicken Soup',
      ingredients: ['1 chicken', 'salt', 'water'],
      steps: ['Boil water', 'Add chicken'],
    });
  });

  it('shows translated name after successful translation', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(screen.getByText('Пилешка супа')).toBeInTheDocument());
  });

  it('shows "Оригинал" and "Сравни" buttons after successful translation', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Оригинал/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сравни/i })).toBeInTheDocument();
  });

  it('"Оригинал" button clears the translation and restores the original name', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(screen.getByText('Пилешка супа')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Оригинал/i }));

    expect(screen.queryByText('Пилешка супа')).not.toBeInTheDocument();
    expect(screen.getByText('Chicken Soup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
  });

  it('"Сравни" button shows original and translated content side by side', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));

    // Original column
    expect(screen.getByText('🔤 Оригинал')).toBeInTheDocument();
    expect(screen.getByText('1 chicken')).toBeInTheDocument();
    // Translated column
    expect(screen.getByText('🇧🇬 Превод')).toBeInTheDocument();
    expect(screen.getByText('1 пиле')).toBeInTheDocument();
  });

  it('"Затвори" button exits compare mode and hides compare grid', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));

    expect(screen.getByText('🔤 Оригинал')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Затвори/i }));

    expect(screen.queryByText('🔤 Оригинал')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сравни/i })).toBeInTheDocument();
  });

  it('"Оригинал" button while in compare mode also exits compare mode', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));
    await user.click(screen.getByRole('button', { name: /Оригинал/i }));

    expect(screen.queryByText('🔤 Оригинал')).not.toBeInTheDocument();
    expect(screen.queryByText('Пилешка супа')).not.toBeInTheDocument();
    expect(screen.getByText('Chicken Soup')).toBeInTheDocument();
  });

  it('shows error message when translation fails', async () => {
    (translateRecipe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.getByText(/Преводът не успя/i)).toBeInTheDocument();
  });

  it('does not show "Сравни" button when translation fails', async () => {
    (translateRecipe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await clickSearch(user);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /Сравни/i })).not.toBeInTheDocument();
  });
});

describe('FridgeScreen – translate race condition: multiple recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('keeps recipe A disabled while A is still translating, even after B translation starts', async () => {
    const recipeA = makeApiRecipe({ id: 'recipe-a', name: 'Chicken Soup' });
    const recipeB = makeApiRecipe({ id: 'recipe-b', name: 'Tomato Soup' });
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipeA, recipeB]);

    let resolveA!: (val: TranslatedRecipe) => void;
    let resolveB!: (val: TranslatedRecipe) => void;
    (translateRecipe as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(new Promise<TranslatedRecipe>((res) => { resolveA = res; }))
      .mockReturnValueOnce(new Promise<TranslatedRecipe>((res) => { resolveB = res; }));

    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: /Какво мога да готвя/i }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Преведи на български/i })).toHaveLength(2),
    );

    const [btnA, btnB] = screen.getAllByRole('button', { name: /Преведи на български/i });

    // Start translating A
    await user.click(btnA);
    await waitFor(() => expect(translateRecipe).toHaveBeenCalledTimes(1));

    // A's button is now loading; B's is still available — click B
    await user.click(btnB);
    await waitFor(() => expect(translateRecipe).toHaveBeenCalledTimes(2));

    // A's button must remain disabled — its translation is still in flight
    const loadingButtons = screen.getAllByRole('button', { name: /Превежда/i });
    expect(loadingButtons).toHaveLength(2);
    loadingButtons.forEach((btn) => expect(btn).toBeDisabled());

    resolveA(translatedResult);
    resolveB({ ...translatedResult, name: 'Доматена супа' });
  });
});

describe('FridgeScreen – translate state reset on "Try different"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (translateRecipe as ReturnType<typeof vi.fn>).mockResolvedValue(translatedResult);
    (searchByFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe()]);
  });

  it('clears translation state when "Try different" is clicked', async () => {
    const newRecipe = makeApiRecipe({ id: 'recipe-new', name: 'New Recipe' });
    (searchByFridge as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([makeApiRecipe()])
      .mockResolvedValueOnce([newRecipe]);

    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: /Какво мога да готвя/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument(),
    );

    // Translate the first recipe
    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Оригинал/i })).toBeInTheDocument(),
    );

    // Click "Try different" — new suggestions replace the old ones
    await user.click(screen.getByRole('button', { name: /Опитай различни/i }));
    await waitFor(() => expect(screen.getByText('New Recipe')).toBeInTheDocument());

    // Translation state should be cleared — the new recipe shows the translate button
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Оригинал/i })).not.toBeInTheDocument();
  });
});
