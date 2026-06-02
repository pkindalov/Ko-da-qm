import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDetailView } from './RecipeDetailView';
import type { Recipe } from '../types';

vi.mock('./cooking/CookingMode', () => ({
  CookingMode: ({ steps }: { steps: string[] }) => (
    <div data-testid="cooking-mode">{steps[0]}</div>
  ),
}));

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Chicken Soup',
  nameEn: 'Chicken Soup',
  emoji: '🍲',
  ingredients: ['1 chicken', 'salt', 'water'],
  steps: ['Boil water', 'Add chicken', 'Season'],
  time: 40,
  tags: [],
  requiredIngredients: ['chicken'],
  isAI: false,
  isPublic: false,
  ...overrides,
});

const defaultProps = (overrides: Partial<Parameters<typeof RecipeDetailView>[0]> = {}) => ({
  recipe: makeRecipe(),
  allergies: [],
  dislikes: [],
  lang: 'en' as const,
  isOwner: false,
  onBack: vi.fn(),
  ...overrides,
});

describe('RecipeDetailView – cooking mode', () => {
  it('shows the Start cooking CTA with the step count', () => {
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /Start cooking/i })).toBeInTheDocument();
    expect(screen.getByText(/3 steps/i)).toBeInTheDocument();
  });

  it('opens cooking mode when the CTA is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.queryByTestId('cooking-mode')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start cooking/i }));
    expect(screen.getByTestId('cooking-mode')).toHaveTextContent('Boil water');
  });

  it('hides the CTA when the recipe has no steps', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeRecipe({ steps: [] }) })} />);
    expect(screen.queryByRole('button', { name: /Start cooking/i })).not.toBeInTheDocument();
  });
});
