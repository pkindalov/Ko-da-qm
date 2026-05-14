import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';
import type { MatchedRecipe } from '../utils/matchFromFridge';
import { matchFromFridge } from '../utils/matchFromFridge';

const mockSaveRecipe = vi.hoisted(() => vi.fn());
const mockUnsaveRecipe = vi.hoisted(() => vi.fn());
const mockClearSaveError = vi.hoisted(() => vi.fn());
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

const defaultHookState = () => ({
  savedIdMap: new Map<string, string>(),
  savingId: null as string | null,
  saveError: null as string | null,
  saveRecipe: mockSaveRecipe,
  unsaveRecipe: mockUnsaveRecipe,
  clearSaveError: mockClearSaveError,
});

describe('FridgeScreen – save Gemini recipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSaveGeminiRecipe.mockReturnValue(defaultHookState());
    mockSaveRecipe.mockResolvedValue(true);
  });

  it('shows Save recipe button on AI recipe cards', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);

    expect(screen.getByRole('button', { name: /Save recipe/i })).toBeInTheDocument();
  });

  it('shows Save recipe button on non-AI recipe cards', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeAiRecipe({ isAI: false }),
    ]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);

    expect(screen.getByRole('button', { name: /Save recipe/i })).toBeInTheDocument();
  });

  it('opens visibility modal when Save recipe is clicked', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));

    expect(screen.getByText('Who can see this recipe?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Only me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Everyone/i })).toBeInTheDocument();
  });

  it('calls saveRecipe with isPublic=false when "Only me" is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeAiRecipe();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Only me/i }));

    await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalledWith(recipe, false));
  });

  it('calls saveRecipe with isPublic=true when "Everyone" is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeAiRecipe();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Everyone/i }));

    await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalledWith(recipe, true));
  });

  it('closes the modal after a successful save', async () => {
    const user = userEvent.setup();
    mockSaveRecipe.mockResolvedValue(true);
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Only me/i }));

    await waitFor(() =>
      expect(screen.queryByText('Who can see this recipe?')).not.toBeInTheDocument(),
    );
  });

  it('keeps modal open when save fails', async () => {
    const user = userEvent.setup();
    mockSaveRecipe.mockResolvedValue(false);
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Only me/i }));

    await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalled());
    expect(screen.getByText('Who can see this recipe?')).toBeInTheDocument();
  });

  it('shows error message in modal when saveError is set', async () => {
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      saveError: 'save_failed',
    });
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));

    expect(screen.getByText('Failed to save. Please try again.')).toBeInTheDocument();
  });

  it('shows Remove button for recipes already in savedIdMap', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);

    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
  });

  it('calls unsaveRecipe with geminiId when Remove is clicked', async () => {
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

    expect(mockUnsaveRecipe).toHaveBeenCalledWith(recipe.id);
  });

  it('disables Save button while saving is in progress for that recipe', async () => {
    const recipe = makeAiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savingId: recipe.id,
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);

    const savingBtn = screen.getByRole('button', { name: /Saving\.\.\./i });
    expect(savingBtn).toBeDisabled();
  });

  it('calls clearSaveError when opening the save modal', async () => {
    const user = userEvent.setup();
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([makeAiRecipe()]);
    render(<FridgeScreen {...makeProps()} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));

    expect(mockClearSaveError).toHaveBeenCalled();
  });
});

const makeApiRecipe = (overrides: Partial<MatchedRecipe> = {}): MatchedRecipe => ({
  id: 'mealdb-52772',
  name: 'Teriyaki Chicken Casserole',
  nameEn: 'Teriyaki Chicken Casserole',
  emoji: '🍗',
  ingredients: ['chicken', 'soy sauce', 'rice'],
  requiredIngredients: ['chicken', 'soy sauce'],
  steps: ['Mix sauce', 'Bake chicken'],
  time: 30,
  tags: ['Chicken'],
  isAI: false,
  isPublic: false,
  matchScore: 1,
  matchedCount: 2,
  ...overrides,
});

const searchApiRecipes = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /What can I cook/i }));
  await waitFor(() => expect(matchFromFridge).toHaveBeenCalled());
};

describe('FridgeScreen – save API recipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSaveGeminiRecipe.mockReturnValue(defaultHookState());
    mockSaveRecipe.mockResolvedValue(true);
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([makeApiRecipe()]);
  });

  it('shows Save recipe button on API recipe cards', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);

    expect(screen.getByRole('button', { name: /Save recipe/i })).toBeInTheDocument();
  });

  it('opens visibility modal when Save recipe is clicked on an API recipe', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));

    expect(screen.getByText('Who can see this recipe?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Only me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Everyone/i })).toBeInTheDocument();
  });

  it('calls saveRecipe with the API recipe and isPublic=false', async () => {
    const user = userEvent.setup();
    const recipe = makeApiRecipe();
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Only me/i }));

    await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalledWith(recipe, false));
  });

  it('calls saveRecipe with the API recipe and isPublic=true', async () => {
    const user = userEvent.setup();
    const recipe = makeApiRecipe();
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Everyone/i }));

    await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalledWith(recipe, true));
  });

  it('shows Remove button for an API recipe already in savedIdMap', async () => {
    const recipe = makeApiRecipe();
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-api-1']]),
    });
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);

    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
  });

  it('closes the modal after a successful API recipe save', async () => {
    const user = userEvent.setup();
    mockSaveRecipe.mockResolvedValue(true);
    render(<FridgeScreen {...makeProps()} />);

    await searchApiRecipes(user);
    await user.click(screen.getByRole('button', { name: /Save recipe/i }));
    await user.click(screen.getByRole('button', { name: /Only me/i }));

    await waitFor(() =>
      expect(screen.queryByText('Who can see this recipe?')).not.toBeInTheDocument(),
    );
  });
});

const makeExistingRecipe = (name: string, id = 'existing-uuid-1'): Recipe => ({
  id,
  name,
  emoji: '🍳',
  ingredients: [],
  steps: [],
  time: 10,
  tags: [],
  requiredIngredients: [],
  isAI: false,
  isPublic: false,
});

describe('FridgeScreen – duplicate recipe prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSaveGeminiRecipe.mockReturnValue(defaultHookState());
    mockSaveRecipe.mockResolvedValue(true);
  });

  it('shows Remove instead of Save when suggestion name matches an already-saved recipe', async () => {
    const user = userEvent.setup();
    const recipe = makeAiRecipe({ name: 'Scrambled Eggs' });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps({ recipes: [makeExistingRecipe('Scrambled Eggs')] })} />);

    await enableGeminiAndSearch(user);

    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
  });

  it('calls removeRecipe (not unsaveRecipe) with the existing recipe id on Remove click', async () => {
    const user = userEvent.setup();
    const existingId = 'existing-uuid-abc';
    const recipe = makeAiRecipe({ name: 'Scrambled Eggs' });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const removeRecipe = vi.fn();
    render(<FridgeScreen {...makeProps({ recipes: [makeExistingRecipe('Scrambled Eggs', existingId)], removeRecipe })} />);

    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(removeRecipe).toHaveBeenCalledWith(existingId);
    expect(mockUnsaveRecipe).not.toHaveBeenCalled();
  });

  it('shows Remove for an API recipe whose name already exists in saved recipes', async () => {
    const user = userEvent.setup();
    const recipe = makeApiRecipe();
    (matchFromFridge as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    render(<FridgeScreen {...makeProps({ recipes: [makeExistingRecipe(recipe.name)] })} />);

    await searchApiRecipes(user);

    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
  });

  it('calls unsaveRecipe (not removeRecipe) when recipe is in savedIdMap and recipes both', async () => {
    const recipe = makeAiRecipe({ name: 'Scrambled Eggs' });
    mockUseSaveGeminiRecipe.mockReturnValue({
      ...defaultHookState(),
      savedIdMap: new Map([[recipe.id, 'real-uuid-1']]),
    });
    (searchWithGemini as ReturnType<typeof vi.fn>).mockResolvedValue([recipe]);
    const removeRecipe = vi.fn();
    render(<FridgeScreen {...makeProps({ recipes: [makeExistingRecipe('Scrambled Eggs')], removeRecipe })} />);

    const user = userEvent.setup();
    await enableGeminiAndSearch(user);
    await user.click(screen.getByRole('button', { name: /Remove/i }));

    expect(mockUnsaveRecipe).toHaveBeenCalledWith(recipe.id);
    expect(removeRecipe).not.toHaveBeenCalled();
  });
});
