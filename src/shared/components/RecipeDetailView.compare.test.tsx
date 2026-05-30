import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDetailView } from './RecipeDetailView';
import type { Recipe } from '../types';

vi.mock('./SaveTranslationModal', () => ({
  SaveTranslationModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-translation-modal" /> : null,
}));

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

const makeTranslatedRecipe = (overrides: Partial<Recipe> = {}): Recipe =>
  makeRecipe({
    nameTranslated: 'Пилешка супа',
    ingredientsTranslated: ['1 пиле', 'сол', 'вода'],
    stepsTranslated: ['Сварете водата', 'Добавете пилето', 'Подправете'],
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

  it('does not show translate button for a Bulgarian recipe that carries nameEn for matching', () => {
    const bgRecipe = makeRecipe({ name: 'Топли филийки с кашкавал', nameEn: 'Warm cheese toasts' });
    render(<RecipeDetailView {...defaultProps({ recipe: bgRecipe })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('does not show the save-translation button for a Bulgarian recipe carrying nameEn', () => {
    const onSaveTranslation = vi.fn().mockResolvedValue(undefined);
    const bgRecipe = makeRecipe({ name: 'Топли филийки с кашкавал', nameEn: 'Warm cheese toasts' });
    render(<RecipeDetailView {...defaultProps({ isOwner: true, onSaveTranslation, recipe: bgRecipe })} />);
    expect(screen.queryByRole('button', { name: /Запази превод/i })).not.toBeInTheDocument();
  });

  it('hides the translate button when a saved Bulgarian translation is shown (defaults to Превод)', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
  });

  it('shows the translate button again after switching to the English Оригинал', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Оригинал' }));
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
  });
});

describe('RecipeDetailView – save translation button', () => {
  const onSaveTranslation = vi.fn().mockResolvedValue(undefined);

  it('shows save translation button when isOwner, onSaveTranslation provided, and conditions met', () => {
    render(<RecipeDetailView {...defaultProps({ isOwner: true, onSaveTranslation })} />);
    expect(screen.getByRole('button', { name: /Запази превод/i })).toBeInTheDocument();
  });

  it('does not show save translation button when not owner', () => {
    render(<RecipeDetailView {...defaultProps({ isOwner: false, onSaveTranslation })} />);
    expect(screen.queryByRole('button', { name: /Запази превод/i })).not.toBeInTheDocument();
  });

  it('does not show save translation button when onSaveTranslation is not provided', () => {
    render(<RecipeDetailView {...defaultProps({ isOwner: true })} />);
    expect(screen.queryByRole('button', { name: /Запази превод/i })).not.toBeInTheDocument();
  });

  it('opens the save translation modal when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ isOwner: true, onSaveTranslation })} />);
    await user.click(screen.getByRole('button', { name: /Запази превод/i }));
    expect(screen.getByTestId('save-translation-modal')).toBeInTheDocument();
  });

  it('shows "Обнови превода" label when a translation already exists', () => {
    render(
      <RecipeDetailView
        {...defaultProps({ isOwner: true, onSaveTranslation, recipe: makeTranslatedRecipe() })}
      />,
    );
    expect(screen.getByRole('button', { name: /Обнови превода/i })).toBeInTheDocument();
  });
});

describe('RecipeDetailView – translation toggle', () => {
  it('shows language toggle when recipe has a translation and lang is bg', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    expect(screen.getByRole('button', { name: 'Оригинал' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Превод' })).toBeInTheDocument();
  });

  it('does not show language toggle when recipe has no translation', () => {
    render(<RecipeDetailView {...defaultProps()} />);
    expect(screen.queryByRole('button', { name: 'Оригинал' })).not.toBeInTheDocument();
  });

  it('does not show language toggle when lang is en', () => {
    render(<RecipeDetailView {...defaultProps({ lang: 'en', recipe: makeTranslatedRecipe() })} />);
    expect(screen.queryByRole('button', { name: 'Оригинал' })).not.toBeInTheDocument();
  });

  it('displays translated ingredients after clicking Превод', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    await user.click(screen.getByRole('button', { name: 'Превод' }));
    expect(screen.getByText('1 пиле')).toBeInTheDocument();
    expect(screen.queryByText('1 chicken')).not.toBeInTheDocument();
  });

  it('displays original ingredients after switching back to Оригинал', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    await user.click(screen.getByRole('button', { name: 'Превод' }));
    await user.click(screen.getByRole('button', { name: 'Оригинал' }));
    expect(screen.getByText('1 chicken')).toBeInTheDocument();
    expect(screen.queryByText('1 пиле')).not.toBeInTheDocument();
  });

  it('displays translated steps after clicking Превод', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    await user.click(screen.getByRole('button', { name: 'Превод' }));
    expect(screen.getByText('Сварете водата')).toBeInTheDocument();
  });

  it('falls back to original content when lang switches to en while translation was active', () => {
    const { rerender } = render(
      <RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe(), lang: 'bg' })} />,
    );
    expect(screen.getByText('1 пиле')).toBeInTheDocument();

    rerender(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe(), lang: 'en' })} />);
    expect(screen.queryByText('1 пиле')).not.toBeInTheDocument();
    expect(screen.getByText('1 chicken')).toBeInTheDocument();
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
