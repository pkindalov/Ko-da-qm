import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipesScreen } from './RecipesScreen';
import type { Recipe, Profile, Product } from '../../../shared/types';

const baseProfile: Profile = { name: '', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Tomato Soup',
  emoji: '🍅',
  ingredients: ['tomatoes'],
  steps: ['blend'],
  time: 20,
  tags: [],
  requiredIngredients: ['tomatoes'],
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

describe('RecipesScreen – delete button on recipe card', () => {
  let removeRecipe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    removeRecipe = vi.fn();
  });

  it('shows a Delete button on each recipe card', () => {
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls removeRecipe with the recipe id when Delete is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'recipe-abc' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(removeRecipe).toHaveBeenCalledWith('recipe-abc');
  });

  it('does not open the detail view when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('shows a Delete button for each recipe when multiple exist', () => {
    const recipes = [
      makeRecipe({ id: 'r1', name: 'Soup' }),
      makeRecipe({ id: 'r2', name: 'Salad' }),
    ];
    render(<RecipesScreen {...makeProps({ recipes, removeRecipe })} />);

    expect(screen.getAllByRole('button', { name: /Delete/i })).toHaveLength(2);
  });

  it('shows Delete button on AI recipe cards', () => {
    const recipe = makeRecipe({ id: 'ai-1', isAI: true });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], removeRecipe })} />);

    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls the correct removeRecipe when multiple cards exist and one is deleted', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe({ id: 'r1', name: 'Soup' }),
      makeRecipe({ id: 'r2', name: 'Salad' }),
    ];
    render(<RecipesScreen {...makeProps({ recipes, removeRecipe })} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    await user.click(deleteButtons[0]);

    expect(removeRecipe).toHaveBeenCalledTimes(1);
    expect(removeRecipe).toHaveBeenCalledWith('r1');
  });
});
