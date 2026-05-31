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

vi.mock('../utils/fetchRecipeTranslation', () => ({
  fetchRecipeTranslation: vi.fn(),
}));

import { openGoogleTranslate } from '../utils/openGoogleTranslate';
import { fetchRecipeTranslation } from '../utils/fetchRecipeTranslation';

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

  it('shows translate button for AI recipes too — translation depends on language, not origin', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeRecipe({ isAI: true }) })} />);
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
  });

  it('shows translate button even without nameEn — language comes from the content, not nameEn', () => {
    render(<RecipeDetailView {...defaultProps({ recipe: makeRecipe({ nameEn: '' }) })} />);
    expect(screen.getByRole('button', { name: /Преведи на български/i })).toBeInTheDocument();
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

  it('once a translation exists, the toggle replaces the translate button (even on the Original tab)', async () => {
    const user = userEvent.setup();
    render(<RecipeDetailView {...defaultProps({ recipe: makeTranslatedRecipe() })} />);
    await user.click(screen.getByRole('button', { name: 'Оригинал' }));
    expect(screen.queryByRole('button', { name: /Преведи на български/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Превод' })).toBeInTheDocument();
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

describe('RecipeDetailView – inline auto-translation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (openGoogleTranslate as ReturnType<typeof vi.fn>).mockResolvedValue({ clipboardUsed: false });
  });

  it('asks the function for the recipe id + target language and renders the result inline', async () => {
    const user = userEvent.setup();
    (fetchRecipeTranslation as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Пилешка супа',
      ingredients: ['1 пиле', 'сол', 'вода'],
      steps: ['Сварете водата'],
    });
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));

    expect(fetchRecipeTranslation).toHaveBeenCalledWith('r1', 'bg');
    await waitFor(() => expect(screen.getByText('1 пиле')).toBeInTheDocument());
    // The original is no longer shown, and the toggle has appeared.
    expect(screen.queryByText('1 chicken')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Оригинал' })).toBeInTheDocument();
    // No external Google Translate tab on the happy path.
    expect(openGoogleTranslate).not.toHaveBeenCalled();
  });

  it('falls back to Google Translate when the function is unavailable', async () => {
    const user = userEvent.setup();
    (fetchRecipeTranslation as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    render(<RecipeDetailView {...defaultProps()} />);

    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));

    await waitFor(() =>
      expect(openGoogleTranslate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Chicken Soup' }),
        'en',
        'bg',
      ),
    );
  });

  it('lets the owner save the auto-translation in one click, without the paste modal', async () => {
    const user = userEvent.setup();
    const onSaveTranslation = vi.fn().mockResolvedValue(undefined);
    (fetchRecipeTranslation as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Пилешка супа',
      ingredients: ['1 пиле', 'сол'],
      steps: ['Сварете водата'],
    });
    render(<RecipeDetailView {...defaultProps({ isOwner: true, onSaveTranslation })} />);

    // Owner auto-translates, then the save button offers a one-click save.
    await user.click(screen.getByRole('button', { name: /Преведи на български/i }));
    await waitFor(() => expect(screen.getByText('1 пиле')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Запази този превод/i }));

    expect(onSaveTranslation).toHaveBeenCalledWith('Пилешка супа', ['1 пиле', 'сол'], ['Сварете водата']);
    expect(screen.queryByTestId('save-translation-modal')).not.toBeInTheDocument();
  });
});

describe('RecipeDetailView – Bulgarian recipe for an English reader', () => {
  const makeBgRecipe = (overrides: Partial<Recipe> = {}): Recipe =>
    makeRecipe({
      name: 'Пилешка супа',
      ingredients: ['1 пиле', 'сол', 'вода'],
      steps: ['Сварете водата', 'Добавете пилето'],
      ...overrides,
    });

  it('offers "Translate to English" for a Bulgarian recipe in the English UI', () => {
    render(<RecipeDetailView {...defaultProps({ lang: 'en', recipe: makeBgRecipe() })} />);
    expect(screen.getByRole('button', { name: /Translate to English/i })).toBeInTheDocument();
  });

  it('does not offer translation to a Bulgarian reader (it is already their language)', () => {
    render(<RecipeDetailView {...defaultProps({ lang: 'bg', recipe: makeBgRecipe() })} />);
    expect(screen.queryByRole('button', { name: /Преведи|Translate/i })).not.toBeInTheDocument();
  });

  it('shows an Original/Translation toggle once an English translation is saved', () => {
    const translated = makeBgRecipe({
      nameTranslated: 'Chicken soup',
      ingredientsTranslated: ['1 chicken', 'salt', 'water'],
      stepsTranslated: ['Boil the water', 'Add the chicken'],
    });
    render(<RecipeDetailView {...defaultProps({ lang: 'en', recipe: translated })} />);
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Translation' })).toBeInTheDocument();
    // Defaults to showing the English translation for the English reader.
    expect(screen.getByText('1 chicken')).toBeInTheDocument();
  });

  it('lets the English reader switch back to the Bulgarian original', async () => {
    const user = userEvent.setup();
    const translated = makeBgRecipe({
      nameTranslated: 'Chicken soup',
      ingredientsTranslated: ['1 chicken', 'salt', 'water'],
      stepsTranslated: ['Boil the water', 'Add the chicken'],
    });
    render(<RecipeDetailView {...defaultProps({ lang: 'en', recipe: translated })} />);
    await user.click(screen.getByRole('button', { name: 'Original' }));
    expect(screen.getByText('1 пиле')).toBeInTheDocument();
    expect(screen.queryByText('1 chicken')).not.toBeInTheDocument();
  });

  it('auto-translates a Bulgarian recipe to English inline when the reader clicks Translate', async () => {
    const user = userEvent.setup();
    vi.clearAllMocks();
    (fetchRecipeTranslation as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Chicken soup',
      ingredients: ['1 chicken', 'salt', 'water'],
      steps: ['Boil the water'],
    });
    render(<RecipeDetailView {...defaultProps({ lang: 'en', recipe: makeBgRecipe() })} />);

    await user.click(screen.getByRole('button', { name: /Translate to English/i }));

    expect(fetchRecipeTranslation).toHaveBeenCalledWith('r1', 'en');
    await waitFor(() => expect(screen.getByText('1 chicken')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
  });
});
