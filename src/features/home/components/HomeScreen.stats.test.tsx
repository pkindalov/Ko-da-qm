import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';
import type { Profile, Recipe, FridgeItem, Product } from '../../../shared/types';

const baseProfile: Profile = { name: '', allergies: [], dislikes: [], dietaryPrefs: [] };

let productCounter = 0;
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: `p${++productCounter}`,
  name: 'Product',
  category: 'other',
  status: 'liked',
  emoji: '🍎',
  ...overrides,
});

const makeFridgeItem = (overrides: Partial<FridgeItem> = {}): FridgeItem => ({
  id: 'f1',
  name: 'Броколи',
  emoji: '🥦',
  category: 'veg',
  ...overrides,
});

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Пиле с ориз',
  emoji: '🍗',
  ingredients: [],
  steps: [],
  time: 20,
  tags: [],
  requiredIngredients: [],
  isAI: false,
  isPublic: false,
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

describe('HomeScreen – stat card counts', () => {
  it('shows 0 allergies when no allergic products and profile.allergies is empty', () => {
    render(<HomeScreen {...makeProps()} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('0')).toBeInTheDocument();
  });

  it('shows allergy count from allergic products when profile.allergies is empty', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows combined allergy count from profile and products', () => {
    const products = [
      makeProduct({ name: 'мляко', status: 'allergic' }),
      makeProduct({ name: 'яйца', status: 'allergic' }),
    ];
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('3')).toBeInTheDocument();
  });

  it('deduplicates allergies that appear in both profile and products', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    const profile: Profile = { ...baseProfile, allergies: ['мляко'] };
    render(<HomeScreen {...makeProps({ profile, products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows 0 dislikes when no disliked products and profile.dislikes is empty', () => {
    render(<HomeScreen {...makeProps()} />);
    const card = screen.getByText('нелюбими').parentElement!;
    expect(within(card).getByText('0')).toBeInTheDocument();
  });

  it('shows dislike count from disliked products when profile.dislikes is empty', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    const card = screen.getByText('нелюбими').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows fridge item count matching fridge array length', () => {
    const fridge = [makeFridgeItem({ id: 'f1' }), makeFridgeItem({ id: 'f2' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    const card = screen.getByText('в хладилника').parentElement!;
    expect(within(card).getByText('2')).toBeInTheDocument();
  });
});

describe('HomeScreen – stat card modals', () => {
  it('opens safe recipes modal when safe recipes stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(screen.getByText('Безопасни рецепти (0)')).toBeInTheDocument();
  });

  it('opens fridge modal when fridge stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByText('Хладилник (0)')).toBeInTheDocument();
  });

  it('opens allergies modal when allergies stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByText('Алергии (0)')).toBeInTheDocument();
  });

  it('opens dislikes modal when dislikes stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByText('Нелюбими (0)')).toBeInTheDocument();
  });

  it('stat card clicks do not call setTab', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(setTab).not.toHaveBeenCalled();
  });

  it('safe recipes modal lists safe recipes by name', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    const modal = screen.getByText('Безопасни рецепти (1)').closest('.modal') as HTMLElement;
    expect(within(modal).getByText('Пиле с ориз')).toBeInTheDocument();
  });

  it('fridge modal lists fridge item names', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ name: 'Тиквички' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByText('Тиквички')).toBeInTheDocument();
  });

  it('allergies modal shows allergy badges', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('dislikes modal shows dislike badges', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByText('лук')).toBeInTheDocument();
  });
});

describe('HomeScreen – active allergies section', () => {
  it('does not show active allergies section when no allergies exist', () => {
    render(<HomeScreen {...makeProps()} />);
    expect(screen.queryByRole('button', { name: /Активни алергии/ })).not.toBeInTheDocument();
  });

  it('shows collapsed toggle button when profile.allergies is set', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByRole('button', { name: /Активни алергии/ })).toBeInTheDocument();
    expect(screen.queryByText('орехи')).not.toBeInTheDocument();
  });

  it('shows collapsed toggle button when a product has allergic status', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.getByRole('button', { name: /Активни алергии/ })).toBeInTheDocument();
    expect(screen.queryByText('мляко')).not.toBeInTheDocument();
  });

  it('reveals allergy badges after clicking the toggle button', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByRole('button', { name: /Активни алергии/ }));
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('shows combined allergies from profile and products when expanded', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByRole('button', { name: /Активни алергии/ }));
    expect(screen.getByText('орехи')).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('collapses badges again after a second click', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    const toggle = screen.getByRole('button', { name: /Активни алергии/ });
    await user.click(toggle);
    expect(screen.getByText('орехи')).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByText('орехи')).not.toBeInTheDocument();
  });

  it('does not show active allergies section when only disliked products exist', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.queryByRole('button', { name: /Активни алергии/ })).not.toBeInTheDocument();
  });
});
