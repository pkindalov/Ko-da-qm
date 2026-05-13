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

const makeFridgeItem = (id: string): FridgeItem => ({
  id,
  name: `Item ${id}`,
  emoji: '🥦',
  category: 'veg',
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
    const fridge = [makeFridgeItem('f1'), makeFridgeItem('f2')];
    render(<HomeScreen {...makeProps({ fridge })} />);
    const card = screen.getByText('в хладилника').parentElement!;
    expect(within(card).getByText('2')).toBeInTheDocument();
  });
});

describe('HomeScreen – stat card navigation', () => {
  it('navigates to recipes tab when safe recipes stat is clicked', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(setTab).toHaveBeenCalledWith('recipes');
  });

  it('navigates to fridge tab when fridge items stat is clicked', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('в хладилника'));
    expect(setTab).toHaveBeenCalledWith('fridge');
  });

  it('navigates to profile tab when allergies stat is clicked', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('алергии'));
    expect(setTab).toHaveBeenCalledWith('profile');
  });

  it('navigates to profile tab when dislikes stat is clicked', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(setTab).toHaveBeenCalledWith('profile');
  });
});

describe('HomeScreen – active allergies section', () => {
  it('does not show active allergies section when no allergies exist', () => {
    render(<HomeScreen {...makeProps()} />);
    expect(screen.queryByText('Активни алергии')).not.toBeInTheDocument();
  });

  it('shows active allergies section when profile.allergies is set', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByText(/Активни алергии/)).toBeInTheDocument();
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('shows active allergies section when a product has allergic status', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.getByText(/Активни алергии/)).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('shows combined allergies from profile and allergic products', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    expect(screen.getByText('орехи')).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('does not show active allergies section when only disliked products exist', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.queryByText('Активни алергии')).not.toBeInTheDocument();
  });
});
