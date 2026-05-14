import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const sampleProducts: Product[] = [
  { id: 'p1', name: 'Домати', nameEn: 'Tomatoes', emoji: '🍅', category: 'veg', status: 'liked' },
  { id: 'p2', name: 'Яйца', nameEn: 'Eggs', emoji: '🥚', category: 'egg', status: 'liked' },
  { id: 'p3', name: 'Сирене', nameEn: 'Cheese', emoji: '🧀', category: 'dairy', status: 'liked' },
];

const openAddModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Добави/i }));
};

describe('FridgeScreen – add from products', () => {
  it('shows "My products" tab when products exist', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    expect(screen.getByText('Моите продукти')).toBeInTheDocument();
    expect(screen.getByText('Ръчно')).toBeInTheDocument();
  });

  it('defaults to select mode when products are available', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    expect(screen.getByPlaceholderText('Търси продукти…')).toBeInTheDocument();
  });

  it('defaults to manual mode when no products exist', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: [] })} />);
    await openAddModal(user);
    expect(screen.getByPlaceholderText('напр. Домати')).toBeInTheDocument();
  });

  it('lists available products in select mode', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    expect(screen.getByText('Домати')).toBeInTheDocument();
    expect(screen.getByText('Яйца')).toBeInTheDocument();
    expect(screen.getByText('Сирене')).toBeInTheDocument();
  });

  it('calls addFridgeItem with product data when a product is clicked', async () => {
    const user = userEvent.setup();
    const addFridgeItem = vi.fn().mockResolvedValue(undefined);
    render(<FridgeScreen {...makeProps({ products: sampleProducts, addFridgeItem })} />);
    await openAddModal(user);
    await user.click(screen.getByText('Домати'));
    await waitFor(() =>
      expect(addFridgeItem).toHaveBeenCalledWith({ name: 'Домати', emoji: '🍅', category: 'veg' }),
    );
  });

  it('closes the modal after adding a product from the list', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    await user.click(screen.getByText('Домати'));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Търси продукти…')).not.toBeInTheDocument(),
    );
  });

  it('hides products already present in the fridge', async () => {
    const user = userEvent.setup();
    const fridge: FridgeItem[] = [{ id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' }];
    render(<FridgeScreen {...makeProps({ products: sampleProducts, fridge })} />);
    await openAddModal(user);
    // "Домати" appears as a fridge-name span but must not appear as a selectable product button
    expect(screen.queryByRole('button', { name: /Домати/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Яйца/ })).toBeInTheDocument();
  });

  it('shows empty message when all products are already in fridge', async () => {
    const user = userEvent.setup();
    const fridge: FridgeItem[] = sampleProducts.map((p) => ({
      id: `f-${p.id}`,
      name: p.name,
      emoji: p.emoji,
      category: p.category,
    }));
    render(<FridgeScreen {...makeProps({ products: sampleProducts, fridge })} />);
    await openAddModal(user);
    expect(screen.getByText('Всички продукти вече са в хладилника')).toBeInTheDocument();
  });

  it('filters products by search query', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    await user.type(screen.getByPlaceholderText('Търси продукти…'), 'яй');
    expect(screen.getByText('Яйца')).toBeInTheDocument();
    expect(screen.queryByText('Домати')).not.toBeInTheDocument();
    expect(screen.queryByText('Сирене')).not.toBeInTheDocument();
  });

  it('shows no-match message when search yields no results', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    await user.type(screen.getByPlaceholderText('Търси продукти…'), 'xyz');
    expect(screen.getByText('Няма съвпадащи продукти')).toBeInTheDocument();
  });

  it('switches to manual mode when the Manual tab is clicked', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    await user.click(screen.getByText('Ръчно'));
    expect(screen.getByPlaceholderText('напр. Домати')).toBeInTheDocument();
  });

  it('adds item manually after switching to manual mode', async () => {
    const user = userEvent.setup();
    const addFridgeItem = vi.fn().mockResolvedValue(undefined);
    render(<FridgeScreen {...makeProps({ products: sampleProducts, addFridgeItem })} />);
    await openAddModal(user);
    await user.click(screen.getByText('Ръчно'));
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Краставица');
    await user.click(screen.getByRole('button', { name: 'Добави' }));
    await waitFor(() =>
      expect(addFridgeItem).toHaveBeenCalledWith({ name: 'Краставица', emoji: '📦', category: 'other' }),
    );
  });

  it('resets search when modal is reopened', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ products: sampleProducts })} />);
    await openAddModal(user);
    await user.type(screen.getByPlaceholderText('Търси продукти…'), 'яй');
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    await openAddModal(user);
    expect(screen.getByPlaceholderText('Търси продукти…')).toHaveValue('');
  });
});
