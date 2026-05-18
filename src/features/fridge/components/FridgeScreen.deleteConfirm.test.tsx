import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';
import { matchFromFridge } from '../utils/matchFromFridge';
import type { MatchedRecipe } from '../utils/matchFromFridge';

const mockUnsaveRecipe = vi.hoisted(() => vi.fn());
const mockUseSaveGeminiRecipe = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useSaveGeminiRecipe', () => ({
  useSaveGeminiRecipe: mockUseSaveGeminiRecipe,
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

import { searchWithGemini } from '../utils/searchWithGemini';

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [{ id: 'f1', name: 'Eggs', emoji: '🥚', category: 'egg' }] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: 'Test User', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'en' as const,
  ...overrides,
});

const defaultHookState = () => ({
  savedIdMap: new Map<string, string>(),
  savingId: null as string | null,
  saveError: null as string | null,
  saveRecipe: vi.fn().mockResolvedValue(true),
  unsaveRecipe: mockUnsaveRecipe,
  clearSaveError: vi.fn(),
});

const makeAiRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: 'gemini-1-0',
  name: 'Scrambled Eggs',
  nameEn: 'Scrambled Eggs',
  emoji: '🍳',
  ingredients: ['eggs', 'butter'],
  requiredIngredients: ['eggs'],
  steps: ['Crack eggs', 'Cook'],
  time: 10,
  tags: [],
  isAI: true,
  isPublic: false,
  matchScore: 1,
  matchedCount: 1,
  ...overrides,
});

const enableGeminiAndSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /Ask Gemini/i }));
  await waitFor(() => expect(searchWithGemini).toHaveBeenCalled());
};

const searchApiRecipes = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /What can I cook/i }));
  await waitFor(() => expect(matchFromFridge).toHaveBeenCalled());
};

describe('FridgeScreen – fridge item delete confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSaveGeminiRecipe.mockReturnValue(defaultHookState());
  });

  it('does not remove the fridge item when the X button is clicked without confirming', async () => {
    const user = userEvent.setup();
    const removeFridgeItem = vi.fn().mockResolvedValue(undefined);
    render(<FridgeScreen {...makeProps({ removeFridgeItem })} />);

    await user.click(screen.getByRole('button', { name: '✕' }));

    expect(removeFridgeItem).not.toHaveBeenCalled();
  });

  it('shows a confirmation modal when the X button is clicked', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await user.click(screen.getByRole('button', { name: '✕' }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows the fridge item name in the confirmation modal', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: [{ id: 'f1', name: 'Milk', emoji: '🥛', category: 'dairy' }] })} />);

    await user.click(screen.getByRole('button', { name: '✕' }));

    expect(screen.getByText('Delete "Milk"?')).toBeInTheDocument();
  });

  it('calls removeFridgeItem when X is clicked and confirmed', async () => {
    const user = userEvent.setup();
    const removeFridgeItem = vi.fn().mockResolvedValue(undefined);
    render(<FridgeScreen {...makeProps({ removeFridgeItem })} />);

    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(removeFridgeItem).toHaveBeenCalledWith('f1');
  });

  it('does not call removeFridgeItem when Cancel is clicked in the modal', async () => {
    const user = userEvent.setup();
    const removeFridgeItem = vi.fn().mockResolvedValue(undefined);
    render(<FridgeScreen {...makeProps({ removeFridgeItem })} />);

    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(removeFridgeItem).not.toHaveBeenCalled();
  });

  it('closes the confirmation modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('closes the confirmation modal after confirming', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('calls removeFridgeItem for the correct item when multiple exist', async () => {
    const user = userEvent.setup();
    const removeFridgeItem = vi.fn().mockResolvedValue(undefined);
    const fridge: FridgeItem[] = [
      { id: 'f1', name: 'Eggs', emoji: '🥚', category: 'egg' },
      { id: 'f2', name: 'Milk', emoji: '🥛', category: 'dairy' },
    ];
    render(<FridgeScreen {...makeProps({ fridge, removeFridgeItem })} />);

    const removeButtons = screen.getAllByRole('button', { name: '✕' });
    // InteractiveFridge shelves by SHELF_ORDER: dairy before egg,
    // so Milk(f2/dairy) is at index 0 and Eggs(f1/egg) at index 1.
    await user.click(removeButtons[0]);
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(removeFridgeItem).toHaveBeenCalledWith('f2');
    expect(removeFridgeItem).not.toHaveBeenCalledWith('f1');
  });

  it('shows the correct item name after canceling and clicking a different item', async () => {
    const user = userEvent.setup();
    const fridge: FridgeItem[] = [
      { id: 'f1', name: 'Eggs', emoji: '🥚', category: 'egg' },
      { id: 'f2', name: 'Milk', emoji: '🥛', category: 'dairy' },
    ];
    render(<FridgeScreen {...makeProps({ fridge })} />);

    const removeButtons = screen.getAllByRole('button', { name: '✕' });
    // InteractiveFridge shelves by SHELF_ORDER: dairy before egg,
    // so Milk(f2/dairy) is at index 0 and Eggs(f1/egg) at index 1.
    await user.click(removeButtons[0]);
    expect(screen.getByText('Delete "Milk"?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    await user.click(removeButtons[1]);
    expect(screen.getByText('Delete "Eggs"?')).toBeInTheDocument();
  });
});

describe('FridgeScreen – suggestion Remove confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSaveGeminiRecipe.mockReturnValue(defaultHookState());
  });

  it('does not call unsaveRecipe when Remove is clicked without confirming', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(mockUnsaveRecipe).not.toHaveBeenCalled();
  });

  it('shows a confirmation modal when Remove is clicked on a suggestion', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('shows the recipe name in the Remove confirmation modal', async () => {
    const recipe = makeAiRecipe({ name: 'Scrambled Eggs' });
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(screen.getByText('Delete "Scrambled Eggs"?')).toBeInTheDocument();
  });

  it('does not call unsaveRecipe when Cancel is clicked in the Remove modal', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockUnsaveRecipe).not.toHaveBeenCalled();
  });

  it('closes the Remove confirmation modal after Cancel', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('calls removeRecipe with the existing recipe id when Remove is confirmed (name-match path)', async () => {
    const recipe = makeAiRecipe({ name: 'Scrambled Eggs' });
    const existingRecipe: Recipe = {
      id: 'existing-id-1',
      name: 'Scrambled Eggs',
      emoji: '🍳',
      ingredients: [],
      steps: [],
      time: 10,
      tags: [],
      requiredIngredients: [],
      isAI: false,
      isPublic: false,
    };
    const removeRecipe = vi.fn();
    render(<FridgeScreen {...makeProps({ recipes: [existingRecipe], removeRecipe })} />);
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);

    const user = userEvent.setup();
    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(removeRecipe).toHaveBeenCalledWith('existing-id-1');
  });

  it('closes the Remove confirmation modal after confirming via API recipe', async () => {
    const recipe = makeAiRecipe();
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });
});
