import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';

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

const sampleFridge: FridgeItem[] = [
  { id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' },
];

const sampleRecipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Салата',
    nameEn: 'Salad',
    emoji: '🥗',
    time: 10,
    requiredIngredients: ['Домати'],
    ingredients: ['Домати'],
    steps: ['Нарежи'],
    tags: [],
    isAI: false,
    isPublic: false,
  },
  {
    id: 'r2',
    name: 'Супа',
    nameEn: 'Soup',
    emoji: '🍲',
    time: 30,
    requiredIngredients: ['Домати'],
    ingredients: ['Домати'],
    steps: ['Свари'],
    tags: [],
    isAI: false,
    isPublic: false,
  },
];

describe('FridgeScreen – collapsible matching recipes', () => {
  it('hides matching recipe cards by default', () => {
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: sampleRecipes })} />);
    expect(screen.queryByText('Салата')).not.toBeInTheDocument();
    expect(screen.queryByText('Супа')).not.toBeInTheDocument();
  });

  it('shows the section toggle button with ▼ when collapsed by default', () => {
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: sampleRecipes })} />);
    expect(screen.getByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ.*▼/i })).toBeInTheDocument();
  });

  it('shows recipe cards after clicking the toggle', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: sampleRecipes })} />);
    await user.click(screen.getByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ/i }));
    expect(screen.getByText('Салата')).toBeInTheDocument();
    expect(screen.getByText('Супа')).toBeInTheDocument();
  });

  it('shows ▲ on the toggle button when expanded', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: sampleRecipes })} />);
    await user.click(screen.getByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ/i }));
    expect(screen.getByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ.*▲/i })).toBeInTheDocument();
  });

  it('hides recipe cards again after toggling twice', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: sampleRecipes })} />);
    const toggle = screen.getByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ/i });
    await user.click(toggle);
    await user.click(toggle);
    expect(screen.queryByText('Салата')).not.toBeInTheDocument();
  });

  it('does not show the toggle when there are no matching recipes', () => {
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge, recipes: [] })} />);
    expect(screen.queryByRole('button', { name: /РЕЦЕПТИ ОТ НАЛИЧНИ ПРОДУКТИ/i })).not.toBeInTheDocument();
  });
});
