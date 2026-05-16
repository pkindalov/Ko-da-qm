import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('RecipesScreen – openRecipeId', () => {
  it('opens the recipe detail view when openRecipeId matches a recipe', () => {
    const recipe = makeRecipe({ id: 'r1' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], openRecipeId: 'r1' })} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('calls onRecipeOpened when openRecipeId is set', () => {
    const onRecipeOpened = vi.fn();
    const recipe = makeRecipe({ id: 'r1' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], openRecipeId: 'r1', onRecipeOpened })} />);
    expect(onRecipeOpened).toHaveBeenCalledOnce();
  });

  it('does not call onRecipeOpened when openRecipeId is null', () => {
    const onRecipeOpened = vi.fn();
    render(<RecipesScreen {...makeProps({ openRecipeId: null, onRecipeOpened })} />);
    expect(onRecipeOpened).not.toHaveBeenCalled();
  });
});
