import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeedScreen } from './FeedScreen';
import type { Recipe } from '../../../shared/types';

const mockFollowingIds: string[] = [];
const mockRecipes: Recipe[] = [];
const mockFavoriteIds: string[] = [];
let mockFollowsLoading = false;

vi.mock('../hooks/useFollows', () => ({
  useFollows: () => ({
    followingIds: mockFollowingIds,
    currentUserId: 'u1',
    loading: mockFollowsLoading,
    toggleFollow: vi.fn(),
  }),
}));

vi.mock('../hooks/useFeedRecipes', () => ({
  useFeedRecipes: () => ({
    recipes: mockRecipes,
    loading: false,
  }),
}));

vi.mock('../../recipes/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favoriteIds: mockFavoriteIds,
    toggleFavorite: vi.fn(),
  }),
}));

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Pasta',
  nameEn: 'Pasta',
  emoji: '🍝',
  ingredients: ['pasta'],
  steps: ['boil'],
  time: 20,
  tags: [],
  requiredIngredients: ['pasta'],
  isAI: false,
  isPublic: true,
  authorId: 'u2',
  authorName: 'Alice',
  ...overrides,
});

const renderFeed = (lang: 'bg' | 'en' = 'en', allergies: string[] = [], dislikes: string[] = []) =>
  render(
    <MemoryRouter>
      <FeedScreen lang={lang} allergies={allergies} dislikes={dislikes} />
    </MemoryRouter>,
  );

describe('FeedScreen – not following anyone', () => {
  beforeEach(() => {
    mockFollowingIds.length = 0;
    mockRecipes.length = 0;
  });

  it('shows empty state with correct english text when not following anyone', () => {
    renderFeed('en');
    expect(screen.getByText('You are not following anyone yet')).toBeInTheDocument();
  });

  it('shows empty state with bulgarian text when not following anyone', () => {
    renderFeed('bg');
    expect(screen.getByText('Все още не следвате никого')).toBeInTheDocument();
  });

  it('shows "Discover users" button', () => {
    renderFeed('en');
    expect(screen.getByRole('button', { name: /Discover users/i })).toBeInTheDocument();
  });
});

describe('FeedScreen – following users but no recipes', () => {
  beforeEach(() => {
    mockFollowingIds.length = 0;
    mockFollowingIds.push('u2');
    mockRecipes.length = 0;
  });

  it('shows empty state when followed users have no recipes', () => {
    renderFeed('en');
    expect(screen.getByText("The people you follow haven't shared any recipes yet")).toBeInTheDocument();
  });

  it('shows bulgarian empty state when followed users have no recipes', () => {
    renderFeed('bg');
    expect(screen.getByText(/Потребителите, които следвате/i)).toBeInTheDocument();
  });
});

describe('FeedScreen – recipe display', () => {
  beforeEach(() => {
    mockFollowingIds.length = 0;
    mockFollowingIds.push('u2');
    mockRecipes.length = 0;
    mockRecipes.push(makeRecipe());
    mockFavoriteIds.length = 0;
  });

  it('renders the feed breadcrumb', () => {
    renderFeed('en');
    expect(screen.getByText(/Feed/)).toBeInTheDocument();
  });

  it('renders the bulgarian feed breadcrumb', () => {
    renderFeed('bg');
    expect(screen.getByText(/Лента/)).toBeInTheDocument();
  });

  it('renders recipe cards for followed users', () => {
    renderFeed('en');
    expect(screen.getByText('Pasta')).toBeInTheDocument();
  });

  it('shows recipe count summary', () => {
    renderFeed('en');
    expect(screen.getByText(/1 recipe from people you follow/i)).toBeInTheDocument();
  });

  it('renders unfilled heart when recipe is not favorited', () => {
    renderFeed('en');
    expect(screen.getByRole('button', { name: /Add to favorites/i })).toBeInTheDocument();
  });

  it('renders filled heart when recipe is already favorited', () => {
    mockFavoriteIds.push('r1');
    renderFeed('en');
    expect(screen.getByRole('button', { name: /Remove from favorites/i })).toBeInTheDocument();
  });

  it('heart button click does not propagate to card (no modal opens)', async () => {
    const user = userEvent.setup();
    renderFeed('en');
    await user.click(screen.getByRole('button', { name: /Add to favorites/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows AI badge for AI recipes', () => {
    mockRecipes.length = 0;
    mockRecipes.push(makeRecipe({ isAI: true }));
    renderFeed('en');
    expect(screen.getByText('✨ AI')).toBeInTheDocument();
  });

  it('shows author name link for recipes with authorName', () => {
    renderFeed('en');
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
  });

  it('does not show author section when recipe has no authorName', () => {
    mockRecipes.length = 0;
    mockRecipes.push(makeRecipe({ authorName: undefined }));
    renderFeed('en');
    expect(screen.queryByText(/👤/)).not.toBeInTheDocument();
  });

  it('opens recipe detail modal when card is clicked', async () => {
    const user = userEvent.setup();
    renderFeed('en');
    await user.click(screen.getByText('Pasta'));
    expect(screen.getByText(/INGREDIENTS/i)).toBeInTheDocument();
  });

  it('does not open modal when heart button is clicked', async () => {
    const user = userEvent.setup();
    renderFeed('en');
    await user.click(screen.getByRole('button', { name: /Add to favorites/i }));
    expect(screen.queryByText(/INGREDIENTS/i)).not.toBeInTheDocument();
  });

  it('shows plural recipe count correctly', () => {
    mockRecipes.push(makeRecipe({ id: 'r2', name: 'Pizza' }));
    renderFeed('en');
    expect(screen.getByText(/2 recipes from people you follow/i)).toBeInTheDocument();
  });

  it('applies allergy class to card when recipe contains a user allergen', () => {
    const { container } = renderFeed('en', ['pasta']);
    expect(container.querySelector('.recipe-card.allergy')).toBeInTheDocument();
  });

  it('does not apply allergy class when user has no matching allergen', () => {
    const { container } = renderFeed('en', ['nuts']);
    expect(container.querySelector('.recipe-card.allergy')).not.toBeInTheDocument();
  });
});

describe('FeedScreen – loading state', () => {
  beforeEach(() => { mockFollowsLoading = true; });
  afterEach(() => { mockFollowsLoading = false; });

  it('shows english loading text while hooks are loading', () => {
    renderFeed('en');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows bulgarian loading text while hooks are loading', () => {
    renderFeed('bg');
    expect(screen.getByText('Зареждане…')).toBeInTheDocument();
  });
});
