import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';
import type { Profile, Recipe, FridgeItem, Product } from '../../../shared/types';

const baseProfile: Profile = { name: '', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Рецепта',
  emoji: '🍲',
  ingredients: ['пилешко'],
  steps: ['Свари'],
  time: 20,
  tags: [],
  requiredIngredients: ['пилешко'],
  isAI: false,
  isPublic: true,
  authorName: 'Иван',
  ...overrides,
});

const makeProps = (overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) => ({
  profile: baseProfile,
  recipes: [] as Recipe[],
  fridge: [] as FridgeItem[],
  publicRecipes: [] as Recipe[],
  favoriteIds: [] as string[],
  onToggleFavorite: vi.fn(),
  products: [] as Product[],
  setTab: vi.fn(),
  lang: 'bg' as const,
  ...overrides,
});

describe('HomeScreen – community recipe risk badges', () => {
  it('shows safe badge on a community recipe with no blocked ingredients', () => {
    const recipe = makeRecipe({ ingredients: ['пилешко'], requiredIngredients: ['пилешко'] });
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe] })} />);
    expect(screen.getByText('Безопасно')).toBeInTheDocument();
  });

  it('shows allergy badge when a community recipe contains an allergen from the profile', () => {
    const profile: Profile = { ...baseProfile, allergies: ['пилешко'] };
    const recipe = makeRecipe({ ingredients: ['пилешко'], requiredIngredients: ['пилешко'] });
    render(<HomeScreen {...makeProps({ profile, publicRecipes: [recipe] })} />);
    expect(screen.getByText(/Алергия!/i)).toBeInTheDocument();
  });

  it('shows dislike badge when a community recipe contains a disliked ingredient', () => {
    const profile: Profile = { ...baseProfile, dislikes: ['лук'] };
    const recipe = makeRecipe({ ingredients: ['лук'], requiredIngredients: ['лук'] });
    render(<HomeScreen {...makeProps({ profile, publicRecipes: [recipe] })} />);
    expect(screen.getByText('Провери!')).toBeInTheDocument();
  });

  it('adds allergy CSS class to the card when the recipe contains an allergen', () => {
    const profile: Profile = { ...baseProfile, allergies: ['пилешко'] };
    const recipe = makeRecipe({ name: 'Алергенна рецепта', ingredients: ['пилешко'], requiredIngredients: ['пилешко'] });
    const { container } = render(<HomeScreen {...makeProps({ profile, publicRecipes: [recipe] })} />);
    const card = container.querySelector('.recipe-card.allergy');
    expect(card).not.toBeNull();
  });

  it('does not render the community section when publicRecipes is empty', () => {
    render(<HomeScreen {...makeProps({ publicRecipes: [] })} />);
    expect(screen.queryByText('ОТ ОБЩНОСТТА')).not.toBeInTheDocument();
  });

  it('shows allergy badge for allergen coming from a product (allergic status)', () => {
    const product: Product = { id: 'p1', name: 'пилешко', category: 'protein', status: 'allergic', emoji: '🍗' };
    const recipe = makeRecipe({ ingredients: ['пилешко'], requiredIngredients: ['пилешко'] });
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe], products: [product] })} />);
    expect(screen.getByText(/Алергия!/i)).toBeInTheDocument();
  });
});

describe('HomeScreen – community recipe heart button', () => {
  it('renders an unfilled heart when the recipe is not favorited', () => {
    const recipe = makeRecipe();
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe], favoriteIds: [] })} />);
    expect(screen.getByRole('button', { name: /Add to favorites/i })).toBeInTheDocument();
  });

  it('renders a filled heart when the recipe is already favorited', () => {
    const recipe = makeRecipe({ id: 'r1' });
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe], favoriteIds: ['r1'] })} />);
    expect(screen.getByRole('button', { name: /Remove from favorites/i })).toBeInTheDocument();
  });

  it('calls onToggleFavorite with the recipe when the heart button is clicked', async () => {
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();
    const recipe = makeRecipe();
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe], onToggleFavorite })} />);
    await user.click(screen.getByRole('button', { name: /Add to favorites/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('does not open the recipe detail when the heart button is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe();
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe] })} />);
    await user.click(screen.getByRole('button', { name: /Add to favorites/i }));
    expect(screen.queryByText(/INGREDIENTS/i)).not.toBeInTheDocument();
  });

  it('opens recipe detail modal with ingredients when card is clicked', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe();
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe] })} />);
    await user.click(screen.getByText('Рецепта'));
    expect(screen.getByText(/СЪСТАВКИ/i)).toBeInTheDocument();
  });
});

describe('HomeScreen – community recipe list rendering', () => {
  it('renders all public recipes up to 4', () => {
    const recipes = Array.from({ length: 4 }, (_, i) =>
      makeRecipe({ id: `r${i}`, name: `Рецепта ${i + 1}` })
    );
    render(<HomeScreen {...makeProps({ publicRecipes: recipes })} />);
    recipes.forEach(r => expect(screen.getByText(r.name)).toBeInTheDocument());
  });

  it('only shows the first 4 public recipes when more than 4 are provided', () => {
    const recipes = Array.from({ length: 5 }, (_, i) =>
      makeRecipe({ id: `r${i}`, name: `Рецепта ${i + 1}` })
    );
    render(<HomeScreen {...makeProps({ publicRecipes: recipes })} />);
    expect(screen.getByText('Рецепта 1')).toBeInTheDocument();
    expect(screen.getByText('Рецепта 4')).toBeInTheDocument();
    expect(screen.queryByText('Рецепта 5')).not.toBeInTheDocument();
  });

  it('does not render author meta when recipe has no authorName', () => {
    const recipe = makeRecipe({ authorName: undefined });
    render(<HomeScreen {...makeProps({ publicRecipes: [recipe] })} />);
    expect(screen.queryByText(/👤/)).not.toBeInTheDocument();
  });
});
