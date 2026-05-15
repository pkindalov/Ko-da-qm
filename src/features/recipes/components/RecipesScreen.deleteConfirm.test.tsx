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

const openDetailView = async (user: ReturnType<typeof userEvent.setup>, recipeName: string) => {
  await user.click(screen.getByText(recipeName));
};

describe('RecipesScreen – delete card confirmation modal', () => {
  let removeRecipe: ReturnType<typeof vi.fn<(id: string) => void>>;

  beforeEach(() => {
    removeRecipe = vi.fn<(id: string) => void>();
  });

  it('does not call removeRecipe when Delete is clicked without confirming', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(removeRecipe).not.toHaveBeenCalled();
  });

  it('shows a confirmation modal when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows the recipe name in the confirmation modal', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe({ name: 'Tomato Soup' })], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(screen.getByText('Delete "Tomato Soup"?')).toBeInTheDocument();
  });

  it('does not call removeRecipe when Cancel is clicked in the modal', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(removeRecipe).not.toHaveBeenCalled();
  });

  it('closes the confirmation modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('closes the confirmation modal after confirming', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('does not open the detail view when Delete is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('shows Bulgarian confirmation text when lang is bg', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe({ name: 'Доматена Супа' })], removeRecipe, lang: 'bg' })} />);

    await user.click(screen.getByRole('button', { name: /Изтрий/i }));

    expect(screen.getByText('Потвърди изтриване')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Потвърди/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Отказ/i })).toBeInTheDocument();
  });
});

describe('RecipesScreen – delete from detail view confirmation', () => {
  let removeRecipe: ReturnType<typeof vi.fn<(id: string) => void>>;

  beforeEach(() => {
    removeRecipe = vi.fn<(id: string) => void>();
  });

  it('shows a confirmation modal when Delete is clicked from the detail view', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await openDetailView(user, 'Tomato Soup');
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('does not call removeRecipe when Cancel is clicked in the detail view modal', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await openDetailView(user, 'Tomato Soup');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(removeRecipe).not.toHaveBeenCalled();
  });

  it('stays in detail view when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await openDetailView(user, 'Tomato Soup');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
  });

  it('calls removeRecipe with the recipe id when Confirm is clicked from detail view', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'detail-recipe-id' });
    render(<RecipesScreen {...makeProps({ recipes: [recipe], removeRecipe })} />);

    await openDetailView(user, 'Tomato Soup');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(removeRecipe).toHaveBeenCalledWith('detail-recipe-id');
  });

  it('navigates back to the recipe grid after confirming delete from detail view', async () => {
    const user = userEvent.setup();
    render(<RecipesScreen {...makeProps({ recipes: [makeRecipe()], removeRecipe })} />);

    await openDetailView(user, 'Tomato Soup');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(screen.queryByRole('button', { name: /Back/i })).not.toBeInTheDocument();
  });
});
