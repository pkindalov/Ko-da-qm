import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';

vi.mock('../utils/searchWithGemini', () => ({
  searchWithGemini: vi.fn().mockResolvedValue([]),
}));
vi.mock('../utils/searchTheMealDB', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/searchTheMealDB')>();
  return { ...actual, searchByFridge: vi.fn().mockResolvedValue([]) };
});
vi.mock('../utils/matchFromFridge', () => ({
  matchFromFridge: vi.fn().mockResolvedValue([]),
}));

import { searchByFridge } from '../utils/searchTheMealDB';

const tomatoItem: FridgeItem = { id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' };
const eggItem: FridgeItem = { id: 'f2', name: 'Яйца', emoji: '🥚', category: 'egg' };
const allergyItem: FridgeItem = { id: 'f3', name: 'Мед', emoji: '🍯', category: 'other' };

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  addProduct: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  addRecipe: vi.fn(),
  removeRecipe: vi.fn(),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const getProductByName = (container: HTMLElement, name: string): HTMLElement => {
  const product = Array.from(container.querySelectorAll('.product')).find(
    (el) => el.querySelector('.p-lbl')?.textContent === name,
  );
  if (!product) throw new Error(`Product "${name}" not found in fridge`);
  return product as HTMLElement;
};

const clickSearch = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /Какво мога да готвя/i }));

describe('FridgeScreen – pin selection filters search', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('passes only the pinned item to search when one item is selected', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />,
    );

    await user.click(getProductByName(container, 'Домати'));
    await clickSearch(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());
    const [passed] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (passed as FridgeItem[]).map((i: FridgeItem) => i.name);
    expect(names).toContain('Домати');
    expect(names).not.toContain('Яйца');
  });

  it('passes all safe items when no items are pinned', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />);

    await clickSearch(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());
    const [passed] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (passed as FridgeItem[]).map((i: FridgeItem) => i.name);
    expect(names).toContain('Домати');
    expect(names).toContain('Яйца');
  });

  it('excludes a pinned item that is also allergic from search', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen
        {...makeProps({
          fridge: [tomatoItem, allergyItem],
          profile: { name: '', allergies: ['Мед'], dislikes: [], dietaryPrefs: [] },
        })}
      />,
    );

    await user.click(getProductByName(container, 'Мед'));
    await clickSearch(user);

    await waitFor(() => expect(searchByFridge).toHaveBeenCalled());
    const [passed] = (searchByFridge as ReturnType<typeof vi.fn>).mock.calls[0];
    const names = (passed as FridgeItem[]).map((i: FridgeItem) => i.name);
    expect(names).not.toContain('Мед');
  });

  it('shows singular pin hint when one item is selected', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />,
    );

    await user.click(getProductByName(container, 'Домати'));
    expect(screen.getByText(/Търсене само по 1 избран продукт\./)).toBeInTheDocument();
  });

  it('shows plural pin hint when multiple items are selected', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />,
    );

    await user.click(getProductByName(container, 'Домати'));
    await user.click(getProductByName(container, 'Яйца'));
    expect(screen.getByText(/Търсене само по 2 избрани продукта\./)).toBeInTheDocument();
  });

  it('shows no pin hint when nothing is selected', () => {
    render(<FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />);
    expect(screen.queryByText(/Търсене само по/)).not.toBeInTheDocument();
  });

  it('clears the selection when the clear button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />,
    );

    await user.click(getProductByName(container, 'Домати'));
    expect(screen.getByText(/Търсене само по 1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Изчисти избора/ }));
    expect(screen.queryByText(/Търсене само по/)).not.toBeInTheDocument();
  });

  it('deselects an item when it is clicked a second time', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FridgeScreen {...makeProps({ fridge: [tomatoItem, eggItem] })} />,
    );

    await user.click(getProductByName(container, 'Домати'));
    expect(screen.getByText(/Търсене само по 1/)).toBeInTheDocument();

    await user.click(getProductByName(container, 'Домати')); // click again to deselect
    expect(screen.queryByText(/Търсене само по/)).not.toBeInTheDocument();
  });
});
