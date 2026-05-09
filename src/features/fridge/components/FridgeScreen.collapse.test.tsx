import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FridgeScreen } from './FridgeScreen';
import type { FridgeItem, Product, Profile, Recipe } from '../../../shared/types';

const makeProps = (overrides: Partial<Parameters<typeof FridgeScreen>[0]> = {}) => ({
  fridge: [] as FridgeItem[],
  addFridgeItem: vi.fn().mockResolvedValue(undefined),
  removeFridgeItem: vi.fn().mockResolvedValue(undefined),
  profile: { name: '', allergies: [], dislikes: [], dietaryPrefs: [] } as Profile,
  recipes: [] as Recipe[],
  products: [] as Product[],
  lang: 'bg' as const,
  ...overrides,
});

const sampleFridge: FridgeItem[] = [
  { id: 'f1', name: 'Домати', emoji: '🍅', category: 'veg' },
  { id: 'f2', name: 'Яйца', emoji: '🥚', category: 'egg' },
];

describe('FridgeScreen – collapsible list', () => {
  it('shows fridge items by default when fridge has items', () => {
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge })} />);
    expect(screen.getByText('Домати')).toBeInTheDocument();
    expect(screen.getByText('Яйца')).toBeInTheDocument();
  });

  it('shows the toggle button with ▲ when expanded', () => {
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge })} />);
    expect(screen.getByRole('button', { name: /2 продукта ▲/ })).toBeInTheDocument();
  });

  it('hides fridge items after clicking the toggle', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge })} />);
    await user.click(screen.getByRole('button', { name: /2 продукта ▲/ }));
    expect(screen.queryByText('Домати')).not.toBeInTheDocument();
    expect(screen.queryByText('Яйца')).not.toBeInTheDocument();
  });

  it('shows ▼ on the toggle button when collapsed', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge })} />);
    await user.click(screen.getByRole('button', { name: /2 продукта ▲/ }));
    expect(screen.getByRole('button', { name: /2 продукта ▼/ })).toBeInTheDocument();
  });

  it('shows fridge items again after toggling twice', async () => {
    const user = userEvent.setup();
    render(<FridgeScreen {...makeProps({ fridge: sampleFridge })} />);
    const toggle = screen.getByRole('button', { name: /2 продукта ▲/ });
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: /2 продукта ▼/ }));
    expect(screen.getByText('Домати')).toBeInTheDocument();
  });

  it('does not show the toggle button when fridge is empty', () => {
    render(<FridgeScreen {...makeProps({ fridge: [] })} />);
    expect(screen.queryByRole('button', { name: /продукта/ })).not.toBeInTheDocument();
  });
});
