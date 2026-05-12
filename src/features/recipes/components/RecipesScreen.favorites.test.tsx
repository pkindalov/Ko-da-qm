import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipesScreen } from './RecipesScreen';
import type { Recipe, Profile, Product } from '../../../shared/types';

const baseProfile: Profile = { name: '', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeFavorite = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'fav-1',
  name: 'Community Pancakes',
  emoji: '🥞',
  ingredients: ['flour'],
  steps: ['mix'],
  time: 15,
  tags: [],
  requiredIngredients: ['flour'],
  isAI: false,
  isPublic: true,
  authorName: 'Alice',
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

describe('RecipesScreen – favorites section', () => {
  it('does not render the favorites section when favoriteRecipes is empty', () => {
    render(<RecipesScreen {...makeProps()} />);
    expect(screen.queryByText(/♥ FAVORITES/i)).not.toBeInTheDocument();
  });

  it('renders the FAVORITES toggle when there are favorite recipes', () => {
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()] })} />);
    expect(screen.getByRole('button', { name: /♥ FAVORITES/i })).toBeInTheDocument();
  });

  it('shows favorite recipe cards by default (expanded)', () => {
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()] })} />);
    expect(screen.getByText('Community Pancakes')).toBeInTheDocument();
  });

  it('hides favorite cards after clicking the toggle', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()] })} />);
    await user.click(screen.getByRole('button', { name: /♥ FAVORITES/i }));
    expect(screen.queryByText('Community Pancakes')).not.toBeInTheDocument();
  });

  it('shows favorite cards again after toggling twice', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()] })} />);
    const toggle = screen.getByRole('button', { name: /♥ FAVORITES/i });
    await user.click(toggle);
    await user.click(toggle);
    expect(screen.getByText('Community Pancakes')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when the heart button on a favorite card is clicked', async () => {
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()], favoriteIds: ['fav-1'], onToggleFavorite })} />);
    await user.click(screen.getByRole('button', { name: /Remove from favorites/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'fav-1' }));
  });

  it('shows the allergy badge on a favorite card that contains an allergen', () => {
    const profile: Profile = { ...baseProfile, allergies: ['flour'] };
    const recipe = makeFavorite({ ingredients: ['flour'], requiredIngredients: ['flour'] });
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [recipe], profile })} />);
    expect(screen.getByText(/Allergy risk!/i)).toBeInTheDocument();
  });

  it('opens the favorite recipe detail view when a favorite card is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()], favoriteIds: ['fav-1'] })} />);
    await user.click(screen.getByText('Community Pancakes'));
    expect(screen.getByText(/INGREDIENTS/i)).toBeInTheDocument();
  });

  it('does not show edit/delete buttons in the favorite detail view', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()], favoriteIds: ['fav-1'] })} />);
    await user.click(screen.getByText('Community Pancakes'));
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument();
  });

  it('shows the Save to favorites button in the favorite detail view', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ favoriteRecipes: [makeFavorite()], favoriteIds: ['fav-1'] })} />);
    await user.click(screen.getByText('Community Pancakes'));
    expect(screen.getByRole('button', { name: /Saved/i })).toBeInTheDocument();
  });
});
