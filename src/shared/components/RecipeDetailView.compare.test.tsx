import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDetailView } from './RecipeDetailView';
import type { Recipe } from '../types';

vi.mock('../utils/translateRecipe', () => ({
  translateRecipe: vi.fn(),
}));
vi.mock('../utils/translateUsage', () => ({
  isLimitReached: vi.fn().mockReturnValue(false),
}));

import { translateRecipe } from '../utils/translateRecipe';
import { isLimitReached } from '../utils/translateUsage';

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

const translatedResult = {
  name: 'Пилешка супа',
  ingredients: ['1 пиле', 'сол', 'вода'],
  steps: ['Сварете водата', 'Добавете пилето', 'Подправете'],
};

describe('RecipeDetailView – translate button visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

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

  it('shows limit message instead of button when daily limit is reached', () => {
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(true);
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.queryByRole('button', { name: /Преведи/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Преводът е недостъпен днес/i)).toBeInTheDocument();
  });
});

describe('RecipeDetailView – compare button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isLimitReached as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (translateRecipe as ReturnType<typeof vi.fn>).mockResolvedValue(translatedResult);
  });

  it('does not show compare button before translation', () => {
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.queryByRole('button', { name: /Сравни/i })).not.toBeInTheDocument();
  });

  it('shows compare button after successful translation', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Сравни/i })).toBeInTheDocument();
  });

  it('shows original-return button and compare button after translation', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: /Оригинал/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сравни/i })).toBeInTheDocument();
  });

  it('entering compare mode shows original and translated content side by side', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));

    // original text visible (ingredients exact, steps use prefix "1. …")
    expect(screen.getByText('1 chicken')).toBeInTheDocument();
    expect(screen.getByText(/Boil water/)).toBeInTheDocument();
    // translated text visible
    expect(screen.getByText('1 пиле')).toBeInTheDocument();
    expect(screen.getByText(/Сварете водата/)).toBeInTheDocument();
  });

  it('compare button label changes to "Затвори" when compare mode is active', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));

    expect(screen.getByRole('button', { name: /Затвори/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^⇄ Сравни$/i })).not.toBeInTheDocument();
  });

  it('clicking "Затвори" exits compare mode and hides compare grid', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));
    await user.click(screen.getByRole('button', { name: /Затвори/i }));

    // original text should not be visible in compare grid (back to single view with translated)
    expect(screen.queryByText(/Boil water/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сравни/i })).toBeInTheDocument();
  });

  it('clicking "Оригинал" clears translation and hides compare button', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Оригинал/i }));

    expect(screen.queryByRole('button', { name: /Сравни/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
  });

  it('clicking "Оригинал" while in compare mode also exits compare mode', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Сравни/i }));
    await user.click(screen.getByRole('button', { name: /Оригинал/i }));

    // compare grid gone, original steps visible again
    expect(screen.queryByText('1 пиле')).not.toBeInTheDocument();
    expect(screen.getByText(/Boil water/)).toBeInTheDocument();
  });

  it('does not show compare button when translation fails', async () => {
    (translateRecipe as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(translateRecipe).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /Сравни/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Преводът не успя/i)).toBeInTheDocument();
  });
});
