import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipesScreen } from './RecipesScreen';
import type { Recipe, Profile, Product } from '../../../shared/types';

vi.mock('../../fridge/utils/matchFromFridge', () => ({
  searchDatabase: vi.fn(),
}));

import { searchDatabase } from '../../fridge/utils/matchFromFridge';
const mockSearchDatabase = vi.mocked(searchDatabase);

const baseProfile: Profile = { name: 'Test', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: crypto.randomUUID(),
  name: 'Omelette',
  emoji: '🍳',
  ingredients: ['eggs', 'cheese'],
  steps: ['Beat eggs', 'Cook'],
  time: 10,
  tags: [],
  requiredIngredients: ['eggs'],
  isAI: false,
  isPublic: false,
  ...overrides,
});

const makeProps = (overrides: Partial<Parameters<typeof RecipesScreen>[0]> = {}) => ({
  recipes: [] as Recipe[],
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  favoriteRecipes: [] as Recipe[],
  favoriteIds: [] as string[],
  onToggleFavorite: vi.fn(),
  products: [] as Product[],
  profile: baseProfile,
  lang: 'en' as const,
  userEmail: 'test@test.com',
  ...overrides,
});

const openSearchModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /🔍 Search/i }));
};

const typeAndSearch = async (user: ReturnType<typeof userEvent.setup>, term: string) => {
  const input = screen.getByPlaceholderText(/e\.g\. eggs/i);
  await user.type(input, term);
  // Scope to the modal element to avoid matching the header "Search" button
  const modalEl = input.closest('.modal') as HTMLElement;
  await user.click(within(modalEl).getByRole('button', { name: /🔍 Search/i }));
};

beforeEach(() => {
  mockSearchDatabase.mockResolvedValue([]);
});

describe('RecipesScreen – no inline search bar', () => {
  it('does not render an inline search input on the main screen', () => {
    render(<RecipesScreen {...makeProps()} />);
    expect(screen.queryByPlaceholderText(/Search recipes/i)).not.toBeInTheDocument();
  });

  it('does not render an inline search input in Bulgarian mode', () => {
    render(<RecipesScreen {...makeProps({ lang: 'bg' })} />);
    expect(screen.queryByPlaceholderText(/Търси рецепти\.\.\./i)).not.toBeInTheDocument();
  });
});

describe('RecipesScreen – unified search modal: My Recipes section', () => {
  it('does not show My Recipes section before a search is run', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()] })} />);
    await openSearchModal(user);
    expect(screen.queryByText(/My Recipes/i)).not.toBeInTheDocument();
  });

  it('shows My Recipes section when personal recipes match the search term by name', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette', nameEn: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omel');
    expect(screen.getByRole('button', { name: /👁 View/i })).toBeInTheDocument();
  });

  it('shows My Recipes section when personal recipes match the search term by ingredient', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Scrambled Eggs', ingredients: ['eggs', 'butter'] });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'butter');
    expect(screen.getByRole('button', { name: /👁 View/i })).toBeInTheDocument();
  });

  it('does not show My Recipes section when no personal recipes match', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'pasta');
    expect(screen.queryByText(/My Recipes/i)).not.toBeInTheDocument();
  });

  it('shows a View button for each matching personal recipe', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe({ id: '1', name: 'Egg Salad', ingredients: ['eggs'] }),
      makeRecipe({ id: '2', name: 'Egg Soup', ingredients: ['eggs'] }),
    ];
    render(<RecipesScreen {...makeProps({ recipes })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'egg');
    expect(screen.getAllByRole('button', { name: /👁 View/i })).toHaveLength(2);
  });

  it('search is case-insensitive for personal recipes', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'OMELETTE' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omelette');
    expect(screen.getByText(/My Recipes/i)).toBeInTheDocument();
  });

  it('uses nameEn in English mode when filtering personal recipes', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Омлет', nameEn: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], lang: 'en' })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omelette');
    expect(screen.getByText(/My Recipes/i)).toBeInTheDocument();
  });

  it('falls back to name when nameEn is absent in English mode', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Омлет', nameEn: undefined });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], lang: 'en' })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'омлет');
    expect(screen.getByText(/My Recipes/i)).toBeInTheDocument();
  });
});

describe('RecipesScreen – unified search modal: View button', () => {
  it('renders a View button for each personal recipe result', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omel');
    expect(screen.getByRole('button', { name: /👁 View/i })).toBeInTheDocument();
  });

  it('View button closes the modal and opens the recipe detail', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omel');
    await user.click(screen.getByRole('button', { name: /👁 View/i }));
    expect(screen.queryByText(/Search Recipes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/INGREDIENTS/i)).toBeInTheDocument();
  });

  it('View button resets search state so modal opens clean next time', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omel');
    await user.click(screen.getByRole('button', { name: /👁 View/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    await openSearchModal(user);
    expect(screen.queryByText(/My Recipes/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. eggs/i)).toHaveValue('');
  });
});

describe('RecipesScreen – unified search modal: empty state', () => {
  it('shows empty state when neither personal recipes nor db results match', async () => {
    const user = userEvent.setup();
    mockSearchDatabase.mockResolvedValue([]);
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe({ name: 'Pasta' })] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'zzznomatch');
    await waitFor(() => {
      expect(screen.getByText(/No results/i)).toBeInTheDocument();
    });
  });

  it('does not show empty state while db search is loading', async () => {
    const user = userEvent.setup();
    let resolveSearch!: (val: []) => void;
    mockSearchDatabase.mockReturnValue(new Promise(res => { resolveSearch = res; }));
    render(<RecipesScreen {...makeProps()} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'zzznomatch');
    expect(screen.queryByText(/No results/i)).not.toBeInTheDocument();
    resolveSearch([]);
  });

  it('does not show empty state when there are personal recipe results', async () => {
    const user = userEvent.setup();
    mockSearchDatabase.mockResolvedValue([]);
    const recipe = makeRecipe({ name: 'Eggs Benedict' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'eggs');
    await waitFor(() => {
      expect(screen.queryByText(/No results/i)).not.toBeInTheDocument();
    });
  });

  it('does not show empty state before any search is run', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps()} />);
    await openSearchModal(user);
    expect(screen.queryByText(/No results/i)).not.toBeInTheDocument();
  });
});

describe('RecipesScreen – unified search modal: db results section', () => {
  it('shows From Database section header when db results exist', async () => {
    const user = userEvent.setup();
    const dbRecipe = {
      id: 'db-1',
      name: 'Pasta Carbonara',
      nameEn: 'Pasta Carbonara',
      emoji: '🍝',
      ingredients: ['pasta', 'eggs'],
      steps: ['boil pasta'],
      time: 20,
      tags: [],
      requiredIngredients: ['pasta'],
      isAI: false,
      isPublic: false,
      matchScore: 1,
      matchedCount: 1,
    };
    mockSearchDatabase.mockResolvedValue([dbRecipe]);
    render(<RecipesScreen {...makeProps()} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'pasta');
    await waitFor(() => {
      expect(screen.getByText(/From Database/i)).toBeInTheDocument();
    });
  });

  it('shows View button for personal results and heart button for db results', async () => {
    const user = userEvent.setup();
    const dbRecipe = {
      id: 'db-1',
      name: 'Pasta Carbonara',
      nameEn: 'Pasta Carbonara',
      emoji: '🍝',
      ingredients: ['pasta', 'eggs'],
      steps: ['boil'],
      time: 20,
      tags: [],
      requiredIngredients: ['pasta'],
      isAI: false,
      isPublic: false,
      matchScore: 1,
      matchedCount: 1,
    };
    mockSearchDatabase.mockResolvedValue([dbRecipe]);
    const recipe = makeRecipe({ name: 'Pasta Salad', ingredients: ['pasta'] });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'pasta');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /👁 View/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add to favorites/i })).toBeInTheDocument();
    });
  });

  it('clicking a db result card closes modal and opens its detail view', async () => {
    const user = userEvent.setup();
    const dbRecipe = {
      id: 'db-1',
      name: 'Pasta Carbonara',
      nameEn: 'Pasta Carbonara',
      emoji: '🍝',
      ingredients: ['pasta', 'eggs'],
      steps: ['boil pasta', 'mix eggs'],
      time: 20,
      tags: [],
      requiredIngredients: ['pasta'],
      isAI: false,
      isPublic: true,
      matchScore: 1,
      matchedCount: 1,
    };
    mockSearchDatabase.mockResolvedValue([dbRecipe]);
    render(<RecipesScreen {...makeProps({ recipes: [] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'pasta');
    await waitFor(() => expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument());
    await user.click(screen.getByText('Pasta Carbonara'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/e\.g\. eggs/i)).not.toBeInTheDocument();
      expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    });
  });

  it('closes modal and resets state when modal close button is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ name: 'Omelette' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe] })} />);
    await openSearchModal(user);
    await typeAndSearch(user, 'omel');
    await user.click(screen.getByRole('button', { name: '✕' }));
    await openSearchModal(user);
    expect(screen.queryByText(/My Recipes/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. eggs/i)).toHaveValue('');
  });
});

describe('RecipesScreen – Safe for me chip still works without inline search', () => {
  it('shows all recipes when Safe for me is not active', () => {
    const recipes = [
      makeRecipe({ id: '1', name: 'Safe Dish', ingredients: ['rice'] }),
      makeRecipe({ id: '2', name: 'Risky Dish', ingredients: ['peanuts'] }),
    ];
    const profile: Profile = { ...baseProfile, allergies: ['peanuts'] };
    render(<RecipesScreen {...makeProps({ recipes, profile })} />);
    expect(screen.getByText('Safe Dish')).toBeInTheDocument();
    expect(screen.getByText('Risky Dish')).toBeInTheDocument();
  });

  it('hides recipes with allergens when Safe for me chip is active', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe({ id: '1', name: 'Safe Dish', ingredients: ['rice'], requiredIngredients: ['rice'] }),
      makeRecipe({ id: '2', name: 'Risky Dish', ingredients: ['peanuts'], requiredIngredients: ['peanuts'] }),
    ];
    const profile: Profile = { ...baseProfile, allergies: ['peanuts'] };
    render(<RecipesScreen {...makeProps({ recipes, profile })} />);
    await user.click(screen.getByRole('button', { name: /Safe for me/i }));
    expect(screen.getByText('Safe Dish')).toBeInTheDocument();
    expect(screen.queryByText('Risky Dish')).not.toBeInTheDocument();
  });

  it('restores all recipes when Safe for me chip is toggled off', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe({ id: '1', name: 'Safe Dish', ingredients: ['rice'], requiredIngredients: ['rice'] }),
      makeRecipe({ id: '2', name: 'Risky Dish', ingredients: ['peanuts'], requiredIngredients: ['peanuts'] }),
    ];
    const profile: Profile = { ...baseProfile, allergies: ['peanuts'] };
    render(<RecipesScreen {...makeProps({ recipes, profile })} />);
    const chip = screen.getByRole('button', { name: /Safe for me/i });
    await user.click(chip);
    await user.click(chip);
    expect(screen.getByText('Safe Dish')).toBeInTheDocument();
    expect(screen.getByText('Risky Dish')).toBeInTheDocument();
  });
});
