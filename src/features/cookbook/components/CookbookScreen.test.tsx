import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookbookScreen } from './CookbookScreen';
import type { Recipe, Profile } from '../../../shared/types';

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({ toBlob: vi.fn().mockResolvedValue(new Blob()) })),
  PDFViewer: (_props: unknown) => null,
  Font: { register: vi.fn() },
  Document: (_props: unknown) => null,
  Page: (_props: unknown) => null,
  View: (_props: unknown) => null,
  Text: (_props: unknown) => null,
  StyleSheet: { create: (s: unknown) => s },
}));

const defaultProfile: Profile = { name: 'Test', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: `r-${Math.random()}`,
  name: 'Салата',
  nameEn: 'Salad',
  emoji: '🥗',
  time: 10,
  requiredIngredients: ['Домати'],
  ingredients: ['Домати'],
  steps: ['Нарежи'],
  tags: ['salad'],
  isAI: false,
  isPublic: false,
  ...overrides,
});

const renderScreen = (overrides: Partial<Parameters<typeof CookbookScreen>[0]> = {}) =>
  render(
    <CookbookScreen
      recipes={[]}
      favoriteIds={[]}
      profile={defaultProfile}
      lang="bg"
      {...overrides}
    />,
  );

describe('CookbookScreen – recipe grid', () => {
  beforeEach(() => localStorage.clear());

  it('shows an empty state when there are no recipes', () => {
    renderScreen();
    expect(screen.getByText(/Все още няма рецепти/i)).toBeInTheDocument();
  });

  it('renders a card for each recipe', () => {
    renderScreen({ recipes: [makeRecipe({ id: 'r1', name: 'Салата' }), makeRecipe({ id: 'r2', name: 'Супа' })] });
    expect(screen.getByText('Салата')).toBeInTheDocument();
    expect(screen.getByText('Супа')).toBeInTheDocument();
  });

  it('flags a recipe when an allergy ingredient matches (case-insensitive)', () => {
    const r = makeRecipe({ id: 'r1', requiredIngredients: ['Nuts'] });
    renderScreen({
      recipes: [r],
      profile: { name: '', allergies: ['nuts'], dislikes: [], dietaryPrefs: [] },
    });
    expect(screen.getByRole('article')).toHaveClass('flagged');
  });

  it('does not flag a recipe when no allergy or dislike matches', () => {
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })] });
    expect(screen.getByRole('article')).not.toHaveClass('flagged');
  });
});

describe('CookbookScreen – selection', () => {
  beforeEach(() => localStorage.clear());

  it('clicking a card marks it as selected', async () => {
    const user = userEvent.setup();
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })] });
    await user.click(screen.getByRole('article'));
    expect(screen.getByRole('article')).toHaveClass('selected');
  });

  it('shows the action bar when at least one card is selected', async () => {
    const user = userEvent.setup();
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })] });
    await user.click(screen.getByRole('article'));
    expect(screen.getByRole('button', { name: /Създай готварска книга/i })).toBeInTheDocument();
  });

  it('deselects a card on second click and hides the bar', async () => {
    const user = userEvent.setup();
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })] });
    const card = screen.getByRole('article');
    await user.click(card);
    await user.click(card);
    expect(screen.queryByRole('button', { name: /Създай готварска книга/i })).not.toBeInTheDocument();
  });

  it('does not show the action bar for stale IDs in localStorage that no longer exist', () => {
    localStorage.setItem('kdq_cookbook_sel_v1', JSON.stringify(['deleted-recipe-id']));
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })] });
    expect(screen.queryByRole('button', { name: /Създай готварска книга/i })).not.toBeInTheDocument();
  });

  it('"Clear" removes all selections', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', name: 'Салата' });
    const r2 = makeRecipe({ id: 'r2', name: 'Супа' });
    renderScreen({ recipes: [r1, r2] });
    const [c1, c2] = screen.getAllByRole('article');
    await user.click(c1);
    await user.click(c2);
    await user.click(screen.getAllByRole('button', { name: /Изчисти/i })[0]);
    expect(screen.queryByRole('button', { name: /Създай готварска книга/i })).not.toBeInTheDocument();
  });

  it('"Select all recipes" selects every recipe regardless of active filter', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', name: 'Салата' });
    const r2 = makeRecipe({ id: 'r2', name: 'Супа' });
    renderScreen({ recipes: [r1, r2], favoriteIds: ['r1'] });
    await user.click(screen.getByRole('tab', { name: /Любими/i }));
    await user.click(screen.getByRole('button', { name: /Избери всички/i }));
    await user.click(screen.getByRole('tab', { name: /Моите рецепти/i }));
    const cards = screen.getAllByRole('article');
    cards.forEach(c => expect(c).toHaveClass('selected'));
  });
});

describe('CookbookScreen – filter tabs', () => {
  beforeEach(() => localStorage.clear());

  it('shows only favorited recipes in the Favorites tab', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', name: 'Салата' });
    const r2 = makeRecipe({ id: 'r2', name: 'Супа' });
    renderScreen({ recipes: [r1, r2], favoriteIds: ['r1'] });
    await user.click(screen.getByRole('tab', { name: /Любими/i }));
    expect(screen.getByText('Салата')).toBeInTheDocument();
    expect(screen.queryByText('Супа')).not.toBeInTheDocument();
  });

  it('shows a favorites empty state when the user has no favorites', async () => {
    const user = userEvent.setup();
    renderScreen({ recipes: [makeRecipe({ id: 'r1' })], favoriteIds: [] });
    await user.click(screen.getByRole('tab', { name: /Любими/i }));
    expect(screen.getByText(/Все още няма любими/i)).toBeInTheDocument();
  });

  it('"Select visible" in the Favorites tab only selects visible favorites', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', name: 'Салата' });
    const r2 = makeRecipe({ id: 'r2', name: 'Супа' });
    renderScreen({ recipes: [r1, r2], favoriteIds: ['r1'] });
    await user.click(screen.getByRole('tab', { name: /Любими/i }));
    await user.click(screen.getByRole('button', { name: /Маркирай видимите/i }));
    await user.click(screen.getByRole('tab', { name: /Моите рецепти/i }));
    const cards = screen.getAllByRole('article');
    const salataCard = cards.find(c => c.textContent?.includes('Салата'));
    const supaCard = cards.find(c => c.textContent?.includes('Супа'));
    expect(salataCard).toHaveClass('selected');
    expect(supaCard).not.toHaveClass('selected');
  });

  it('"Deselect visible" deselects only the visible cards, leaving hidden selections intact', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', name: 'Салата' });
    const r2 = makeRecipe({ id: 'r2', name: 'Супа' });
    renderScreen({ recipes: [r1, r2], favoriteIds: ['r1'] });
    // Select both recipes from the All tab
    await user.click(screen.getAllByRole('article')[0]);
    await user.click(screen.getAllByRole('article')[1]);
    // Switch to Favorites (only r1 visible) and deselect visible
    await user.click(screen.getByRole('tab', { name: /Любими/i }));
    await user.click(screen.getByRole('button', { name: /Размаркирай/i }));
    // Back to All: r2 should still be selected, r1 should not
    await user.click(screen.getByRole('tab', { name: /Моите рецепти/i }));
    const cards = screen.getAllByRole('article');
    const salataCard = cards.find(c => c.textContent?.includes('Салата'));
    const supaCard = cards.find(c => c.textContent?.includes('Супа'));
    expect(salataCard).not.toHaveClass('selected');
    expect(supaCard).toHaveClass('selected');
  });
});
