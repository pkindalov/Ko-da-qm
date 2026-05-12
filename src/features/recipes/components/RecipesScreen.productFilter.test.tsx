import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipesScreen } from './RecipesScreen';
import type { Product, Profile, Recipe } from '../../../shared/types';

const PROFILE: Profile = { name: 'Test', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeProduct = (id: number, name: string, nameEn?: string): Product => ({
  id: String(id),
  name,
  nameEn,
  emoji: '🥦',
  category: 'veg',
  status: 'liked',
});

const makeProducts = (count: number): Product[] =>
  Array.from({ length: count }, (_, i) => makeProduct(i, `Продукт ${i + 1}`, `Product ${i + 1}`));

const defaultProps = {
  recipes: [] as Recipe[],
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  favoriteRecipes: [] as Recipe[],
  favoriteIds: [] as string[],
  onToggleFavorite: vi.fn(),
  profile: PROFILE,
  lang: 'bg' as const,
  userEmail: 'test@test.com',
};

const renderScreen = (products: Product[], lang: 'bg' | 'en' = 'bg') =>
  render(<RecipesScreen {...defaultProps} products={products} lang={lang} />);

const openAddModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '+' }));
};

describe('RecipesScreen – product filter', () => {
  describe('visibility threshold', () => {
    it('does not render the filter input when there are 0 products', async () => {
      const user = userEvent.setup();
      renderScreen([]);
      await openAddModal(user);
      expect(screen.queryByPlaceholderText('Филтрирай продукти...')).not.toBeInTheDocument();
    });

    it('does not render the filter input when there are 9 products', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(9));
      await openAddModal(user);
      expect(screen.queryByPlaceholderText('Филтрирай продукти...')).not.toBeInTheDocument();
    });

    it('renders the filter input when there are exactly 10 products', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      expect(screen.getByPlaceholderText('Филтрирай продукти...')).toBeInTheDocument();
    });

    it('renders the filter input when there are more than 10 products', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(50));
      await openAddModal(user);
      expect(screen.getByPlaceholderText('Филтрирай продукти...')).toBeInTheDocument();
    });
  });

  describe('count display', () => {
    it('does not show a count when there are fewer than 10 products', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(5));
      await openAddModal(user);
      expect(screen.queryByText(/5 \/ 5/)).not.toBeInTheDocument();
    });

    it('shows "total / total" count when the filter is empty', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      expect(screen.getByText('10 / 10')).toBeInTheDocument();
    });

    it('updates the count as the user types in the filter', async () => {
      const user = userEvent.setup();
      const products = [
        makeProduct(1, 'Домати'),
        makeProduct(2, 'Домашна наденица'),
        ...makeProducts(8).map((_, i) => makeProduct(100 + i, `Зеленчук ${i}`)),
      ];
      renderScreen(products);
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'Дом');
      expect(screen.getByText('2 / 10')).toBeInTheDocument();
    });

    it('shows "0 / total" when filter matches nothing', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'zzznomatch');
      expect(screen.getByText('0 / 10')).toBeInTheDocument();
    });
  });

  describe('chip filtering', () => {
    it('shows all chips when the filter is empty', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      const chips = screen.getAllByRole('button', { name: /Продукт/ });
      expect(chips).toHaveLength(10);
    });

    it('filters chips by name (case-insensitive)', async () => {
      const user = userEvent.setup();
      const products = [
        makeProduct(1, 'Домати'),
        makeProduct(2, 'Домашна наденица'),
        ...makeProducts(8).map((_, i) => makeProduct(100 + i, `Зеленчук ${i}`)),
      ];
      renderScreen(products);
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'дом');
      expect(screen.getByRole('button', { name: /Домати/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Домашна наденица/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Зеленчук/ })).not.toBeInTheDocument();
    });

    it('shows no chips when filter matches nothing', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'zzznomatch');
      expect(screen.queryByRole('button', { name: /Продукт/ })).not.toBeInTheDocument();
    });
  });

  describe('filter reset on modal close', () => {
    it('clears the filter when the modal is closed via Cancel', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'Продукт 1');
      await user.click(screen.getByRole('button', { name: /Отказ/ }));
      await openAddModal(user);
      expect(screen.getByPlaceholderText('Филтрирай продукти...')).toHaveValue('');
    });

    it('shows all chips again after the modal is reopened', async () => {
      const user = userEvent.setup();
      renderScreen(makeProducts(10));
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'Продукт 1');
      await user.click(screen.getByRole('button', { name: /Отказ/ }));
      await openAddModal(user);
      expect(screen.getAllByRole('button', { name: /Продукт/ })).toHaveLength(10);
    });
  });

  describe('language support', () => {
    it('filters using nameEn in English mode', async () => {
      const user = userEvent.setup();
      const products = [
        makeProduct(1, 'Домати', 'Tomatoes'),
        makeProduct(2, 'Краставици', 'Cucumbers'),
        ...makeProducts(8).map((_, i) => makeProduct(100 + i, `Продукт ${i}`, `Product ${i}`)),
      ];
      renderScreen(products, 'en');
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Filter products...'), 'Tom');
      expect(screen.getByRole('button', { name: /Tomatoes/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cucumbers/ })).not.toBeInTheDocument();
    });

    it('falls back to name when nameEn is absent in English mode', async () => {
      const user = userEvent.setup();
      const products = [
        makeProduct(1, 'Домати'),
        ...makeProducts(9).map((_, i) => makeProduct(100 + i, `Product ${i}`, `Product ${i}`)),
      ];
      renderScreen(products, 'en');
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Filter products...'), 'Домати');
      expect(screen.getByRole('button', { name: /Домати/ })).toBeInTheDocument();
    });
  });

  describe('chip click still works after filtering', () => {
    it('appends the product name to the ingredients textarea when a filtered chip is clicked', async () => {
      const user = userEvent.setup();
      const products = [
        makeProduct(1, 'Домати'),
        makeProduct(2, 'Краставица'),
        ...makeProducts(8).map((_, i) => makeProduct(100 + i, `Зеленчук ${i}`)),
      ];
      renderScreen(products);
      await openAddModal(user);
      await user.type(screen.getByPlaceholderText('Филтрирай продукти...'), 'Домати');
      await user.click(screen.getByRole('button', { name: /Домати/ }));
      const textarea = screen.getByPlaceholderText(/кашкавал/i);
      expect(textarea).toHaveValue('Домати');
    });
  });
});
