import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDetailView } from './RecipeDetailView';
import type { Recipe } from '../types';

vi.mock('../utils/openGoogleTranslate', () => ({
  openGoogleTranslate: vi.fn().mockResolvedValue({ clipboardUsed: false }),
}));

import { openGoogleTranslate } from '../utils/openGoogleTranslate';

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
  lang: 'bg' as const,
  isOwner: false,
  onBack: vi.fn(),
  ...overrides,
});

describe('RecipeDetailView – translate button visibility', () => {
  it('shows translate button when lang is bg and recipe is not AI', () => {
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
  });

  it('does not show translate button when lang is en', () => {
    render(<RecipeDetailView {...defaultProps({ lang: 'en' })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('does not show translate button when recipe is AI-generated', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeRecipe({ isAI: true }) })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('does not show translate button when nameEn is an empty string', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeRecipe({ nameEn: '' }) })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });
});

describe('RecipeDetailView – translate calls openGoogleTranslate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (openGoogleTranslate as ReturnType<typeof vi.fn>).mockResolvedValue({ clipboardUsed: false });
  });

  it('calls openGoogleTranslate with the recipe when translate button is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));

    await waitFor(() =>
      expect(openGoogleTranslate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Chicken Soup',
          nameEn: 'Chicken Soup',
          ingredients: ['1 chicken', 'salt', 'water'],
          steps: ['Boil water', 'Add chicken', 'Season'],
        }),
      ),
    );
  });
});
