import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannerScreen } from './PlannerScreen';
import type { PlannerScreenProps } from './PlannerScreen';
import type { Recipe, FridgeItem, Profile } from '../../../shared/types';

const defaultProfile: Profile = { name: 'Test', allergies: [], dislikes: [], dietaryPrefs: [] };

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: crypto.randomUUID(),
  name: 'Омлет',
  nameEn: 'Omelette',
  emoji: '🍳',
  time: 10,
  requiredIngredients: ['eggs'],
  ingredients: ['2 eggs', 'salt'],
  steps: ['Beat eggs', 'Cook'],
  tags: [],
  isAI: false,
  isPublic: false,
  authorEmail: 'test@test.com',
  ...overrides,
});

const makeFridgeItem = (overrides: Partial<FridgeItem> = {}): FridgeItem => ({
  id: crypto.randomUUID(),
  name: 'eggs',
  emoji: '🥚',
  category: 'egg',
  ...overrides,
});

// Same logic as PlannerScreen.weekKey — Monday of the current local week
const getWeekKey = () => {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const WEEK_KEY = getWeekKey();

const renderPlanner = (overrides: Partial<PlannerScreenProps> = {}) =>
  render(
    <PlannerScreen
      recipes={[]}
      fridge={[]}
      products={[]}
      profile={defaultProfile}
      lang="en"
      planner={{}}
      setPlanner={vi.fn()}
      favoriteRecipes={[]}
      {...overrides}
    />,
  );

// ── Initial render ─────────────────────────────────────────────────────────────

describe('PlannerScreen – initial render', () => {
  it('shows the Planner heading', () => {
    renderPlanner();
    expect(screen.getByRole('heading', { name: /Planner/i })).toBeInTheDocument();
  });

  it('shows all 7 English day names', () => {
    renderPlanner();
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day =>
      expect(screen.getByText(day)).toBeInTheDocument(),
    );
  });

  it('shows Breakfast, Lunch, and Dinner labels for every day (7 slots + 1 drawer chip each)', () => {
    renderPlanner();
    expect(screen.getAllByText('Breakfast')).toHaveLength(8);
    expect(screen.getAllByText('Lunch')).toHaveLength(8);
    expect(screen.getAllByText('Dinner')).toHaveLength(8);
  });

  it('shows 0 / 21 in the meals planned metric when nothing is planned', () => {
    renderPlanner();
    expect(screen.getByText('/ 21')).toBeInTheDocument();
  });

  it('shows "Try a sample week" when recipes exist and the week is empty', () => {
    renderPlanner({ recipes: [makeRecipe()] });
    expect(screen.getByRole('button', { name: /Try a sample week/i })).toBeInTheDocument();
  });

  it('hides "Try a sample week" when there are no recipes', () => {
    renderPlanner({ recipes: [] });
    expect(screen.queryByRole('button', { name: /Try a sample week/i })).not.toBeInTheDocument();
  });

  it('hides "Clear week" when nothing is planned', () => {
    renderPlanner({ recipes: [makeRecipe()] });
    expect(screen.queryByRole('button', { name: /Clear week/i })).not.toBeInTheDocument();
  });

  it('shows Bulgarian heading when lang is bg', () => {
    renderPlanner({ lang: 'bg' });
    expect(screen.getByRole('heading', { name: /Седмица/i })).toBeInTheDocument();
  });

  it('shows Bulgarian day names when lang is bg', () => {
    renderPlanner({ lang: 'bg' });
    expect(screen.getByText('Понеделник')).toBeInTheDocument();
    expect(screen.getByText('Неделя')).toBeInTheDocument();
  });
});

// ── Sample week ────────────────────────────────────────────────────────────────

describe('PlannerScreen – sample week', () => {
  it('calls setPlanner when "Try a sample week" is clicked', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })], setPlanner });
    await user.click(screen.getByRole('button', { name: /Try a sample week/i }));
    expect(setPlanner).toHaveBeenCalledOnce();
  });

  it('setPlanner is called with data keyed to the current week', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })], setPlanner });
    await user.click(screen.getByRole('button', { name: /Try a sample week/i }));
    expect(setPlanner.mock.calls[0][0]).toHaveProperty(WEEK_KEY);
  });
});

// ── Clear week ─────────────────────────────────────────────────────────────────

describe('PlannerScreen – clear week', () => {
  it('shows "Clear week" when the current week has planned meals', () => {
    const recipe = makeRecipe({ id: 'r1' });
    renderPlanner({
      recipes: [recipe],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.getByRole('button', { name: /Clear week/i })).toBeInTheDocument();
  });

  it('calls setPlanner with an empty object for the week key when "Clear week" is clicked', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    const recipe = makeRecipe({ id: 'r1' });
    renderPlanner({
      recipes: [recipe],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
      setPlanner,
    });
    await user.click(screen.getByRole('button', { name: /Clear week/i }));
    expect(setPlanner.mock.calls[0][0][WEEK_KEY]).toEqual({});
  });
});

// ── Metrics ────────────────────────────────────────────────────────────────────

describe('PlannerScreen – metrics', () => {
  it('shows the correct mealsPlanned count for valid planned recipes', () => {
    const r1 = makeRecipe({ id: 'r1' });
    const r2 = makeRecipe({ id: 'r2' });
    renderPlanner({
      recipes: [r1, r2],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1', '0_lunch': 'r2', '1_breakfast': 'r1' } },
    });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('orphaned slot IDs (deleted recipes) do not count toward mealsPlanned', () => {
    // 'deleted-id' is NOT present in the recipes array
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'deleted-id' } },
    });
    // mealsPlanned is 0 → "Try a sample week" shows and "Clear week" stays hidden
    expect(screen.getByRole('button', { name: /Try a sample week/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear week/i })).not.toBeInTheDocument();
  });
});

// ── Recipe picker modal ────────────────────────────────────────────────────────

describe('PlannerScreen – recipe picker modal', () => {
  it('clicking an empty meal slot opens the picker modal', async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Pick a recipe/i)).toBeInTheDocument();
  });

  it('picker modal lists all recipes', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', nameEn: 'Pasta' });
    const r2 = makeRecipe({ id: 'r2', nameEn: 'Salad' });
    renderPlanner({ recipes: [r1, r2] });
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Pasta')).toBeInTheDocument();
    expect(within(modal).getByText('Salad')).toBeInTheDocument();
  });

  it('searching in the picker filters recipes by name', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', nameEn: 'Pasta' });
    const r2 = makeRecipe({ id: 'r2', nameEn: 'Salad' });
    renderPlanner({ recipes: [r1, r2] });
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    const modal = screen.getByRole('dialog');
    await user.type(within(modal).getByPlaceholderText(/Search recipes/i), 'pasta');
    expect(within(modal).getByText('Pasta')).toBeInTheDocument();
    expect(within(modal).queryByText('Salad')).not.toBeInTheDocument();
  });

  it('picker shows an empty state when the search has no matches', async () => {
    const user = userEvent.setup();
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })] });
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    const modal = screen.getByRole('dialog');
    await user.type(within(modal).getByPlaceholderText(/Search recipes/i), 'zzznomatch');
    expect(within(modal).getByText(/Nothing matches/i)).toBeInTheDocument();
  });

  it('clicking a recipe in the picker calls setPlanner with the correct slot key', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      setPlanner,
    });
    // Open Monday breakfast picker (first empty slot button)
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    await user.click(within(screen.getByRole('dialog')).getByText('Pasta'));
    expect(setPlanner).toHaveBeenCalledOnce();
    expect(setPlanner.mock.calls[0][0][WEEK_KEY]['0_breakfast']).toBe('r1');
  });

  it('closing the picker with ✕ dismisses it', async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.click(screen.getAllByRole('button', { name: /drop or pick/i })[0]);
    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ── Filled slot actions ────────────────────────────────────────────────────────

describe('PlannerScreen – filled slot actions', () => {
  beforeEach(() => localStorage.clear());

  it('shows the recipe name inside a filled slot', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    // Recipe also appears in the drawer — scope to the slot element
    expect(screen.getByText('Pasta', { selector: '.meal-name' })).toBeInTheDocument();
  });

  it('clicking × on a filled slot calls setPlanner without that slot key', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
      setPlanner,
    });
    await user.click(screen.getByRole('button', { name: '×' }));
    expect(setPlanner.mock.calls[0][0][WEEK_KEY]).not.toHaveProperty('0_breakfast');
  });

  it('clicking a filled recipe calls onViewRecipe with its id', async () => {
    const user = userEvent.setup();
    const onViewRecipe = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
      onViewRecipe,
    });
    // Click the slot element, not the drawer copy
    await user.click(screen.getByText('Pasta', { selector: '.meal-name' }));
    expect(onViewRecipe).toHaveBeenCalledWith('r1');
  });
});

// ── Allergy flagging ───────────────────────────────────────────────────────────

describe('PlannerScreen – allergy flagging', () => {
  it('shows a "check" warning in a filled slot when the recipe contains an allergen', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', requiredIngredients: ['nuts'] })],
      profile: { ...defaultProfile, allergies: ['nuts'] },
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.getByText(/check/i)).toBeInTheDocument();
  });

  it('does not show a warning when the recipe ingredients do not match any allergy', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', requiredIngredients: ['pasta'] })],
      profile: { ...defaultProfile, allergies: ['nuts'] },
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.queryByText(/check/i)).not.toBeInTheDocument();
  });

  it('allergy matching is case-insensitive', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', requiredIngredients: ['NUTS'] })],
      profile: { ...defaultProfile, allergies: ['nuts'] },
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.getByText(/check/i)).toBeInTheDocument();
  });

  it('flags a slot for dislikes the same way as allergies', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', requiredIngredients: ['mushrooms'] })],
      profile: { ...defaultProfile, dislikes: ['mushrooms'] },
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.getByText(/check/i)).toBeInTheDocument();
  });
});

// ── Shopping list ──────────────────────────────────────────────────────────────

describe('PlannerScreen – shopping list', () => {
  it('"Generate list" is disabled when no meals are planned', () => {
    renderPlanner();
    expect(screen.getByRole('button', { name: /Generate list/i })).toBeDisabled();
  });

  it('"Generate list" is enabled when at least one meal is planned', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    expect(screen.getByRole('button', { name: /Generate list/i })).not.toBeDisabled();
  });

  it('clicking "Generate list" opens the shopping modal', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shopping modal lists required ingredients as items to buy', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', requiredIngredients: ['eggs', 'salt'] });
    renderPlanner({
      recipes: [recipe],
      fridge: [],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('eggs')).toBeInTheDocument();
    expect(within(modal).getByText('salt')).toBeInTheDocument();
  });

  it('fridge ingredients show in the "On shelves" tab, not the "To buy" tab', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', requiredIngredients: ['eggs', 'salt'] });
    const fridgeItem = makeFridgeItem({ name: 'eggs' });
    renderPlanner({
      recipes: [recipe],
      fridge: [fridgeItem],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    const modal = screen.getByRole('dialog');
    // "To buy" tab — only salt (eggs is in fridge)
    expect(within(modal).getByText('salt')).toBeInTheDocument();
    expect(within(modal).queryByText('eggs')).not.toBeInTheDocument();
    // Switch to "On shelves" tab — eggs
    await user.click(within(modal).getByRole('button', { name: /On shelves/i }));
    expect(within(modal).getByText('eggs')).toBeInTheDocument();
    expect(within(modal).queryByText('salt')).not.toBeInTheDocument();
  });

  it('"Copy list" is disabled when all ingredients are already in the fridge', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', requiredIngredients: ['eggs'] });
    renderPlanner({
      recipes: [recipe],
      fridge: [makeFridgeItem({ name: 'eggs' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('button', { name: /Copy list/i })).toBeDisabled();
  });

  it('the same ingredient from multiple recipes is deduplicated in the shopping list', async () => {
    const user = userEvent.setup();
    const r1 = makeRecipe({ id: 'r1', requiredIngredients: ['eggs'] });
    const r2 = makeRecipe({ id: 'r2', requiredIngredients: ['eggs'] });
    renderPlanner({
      recipes: [r1, r2],
      fridge: [],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1', '0_lunch': 'r2' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getAllByText('eggs')).toHaveLength(1);
  });

  it('closing the shopping modal with ✕ dismisses it', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    await user.click(screen.getByRole('button', { name: /Generate list/i }));
    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ── Drawer search and filter ───────────────────────────────────────────────────

describe('PlannerScreen – drawer search and filter', () => {
  it('drawer shows all recipes by default', () => {
    renderPlanner({
      recipes: [
        makeRecipe({ id: 'r1', nameEn: 'Pasta' }),
        makeRecipe({ id: 'r2', nameEn: 'Salad' }),
      ],
    });
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Salad')).toBeInTheDocument();
  });

  it('typing in the drawer search filters recipes by name', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [
        makeRecipe({ id: 'r1', nameEn: 'Pasta' }),
        makeRecipe({ id: 'r2', nameEn: 'Salad' }),
      ],
    });
    await user.type(screen.getByPlaceholderText(/^Search…$/i), 'pasta');
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Salad')).not.toBeInTheDocument();
  });

  it('clicking the Breakfast chip filters to breakfast-tagged recipes', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [
        makeRecipe({ id: 'r1', nameEn: 'Toast', tags: ['закуска'] }),
        makeRecipe({ id: 'r2', nameEn: 'Steak', tags: ['вечеря'] }),
      ],
    });
    await user.click(screen.getByRole('button', { name: /^Breakfast$/i }));
    expect(screen.getByText('Toast')).toBeInTheDocument();
    expect(screen.queryByText('Steak')).not.toBeInTheDocument();
  });

  it('clicking the All chip after a meal filter restores all recipes', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [
        makeRecipe({ id: 'r1', nameEn: 'Toast', tags: ['закуска'] }),
        makeRecipe({ id: 'r2', nameEn: 'Steak', tags: ['вечеря'] }),
      ],
    });
    await user.click(screen.getByRole('button', { name: /^Breakfast$/i }));
    await user.click(screen.getByRole('button', { name: /^All$/i }));
    expect(screen.getByText('Toast')).toBeInTheDocument();
    expect(screen.getByText('Steak')).toBeInTheDocument();
  });

  it('shows an empty state in the drawer when no recipes match the search', async () => {
    const user = userEvent.setup();
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })] });
    await user.type(screen.getByPlaceholderText(/^Search…$/i), 'zzznomatch');
    expect(screen.getByText(/Nothing matches/i)).toBeInTheDocument();
  });

  it('drawer search matches the English name in English mode', async () => {
    const user = userEvent.setup();
    renderPlanner({
      lang: 'en',
      recipes: [makeRecipe({ id: 'r1', name: 'Омлет', nameEn: 'Omelette' })],
    });
    await user.type(screen.getByPlaceholderText(/^Search…$/i), 'omelette');
    expect(screen.getByText('Omelette')).toBeInTheDocument();
  });
});

// ── Favorites & Gemini button ──────────────────────────────────────────────────

describe('PlannerScreen – favorites and Gemini', () => {
  it('renders a favorited recipe (not in own recipes) placed in a slot', () => {
    const fav = makeRecipe({ id: 'f1', nameEn: 'Fav Soup', authorEmail: undefined });
    renderPlanner({
      recipes: [],
      favoriteRecipes: [fav],
      planner: { [WEEK_KEY]: { '0_breakfast': 'f1' } },
    });
    expect(screen.getByText('Fav Soup', { selector: '.meal-name' })).toBeInTheDocument();
  });

  it('shows "Plan with Gemini" when the user has only favorite recipes', () => {
    renderPlanner({ recipes: [], favoriteRecipes: [makeRecipe({ id: 'f1' })] });
    expect(screen.getByRole('button', { name: /Plan with Gemini/i })).toBeInTheDocument();
  });

  it('shows "Plan with Gemini" when the user has fridge items but no recipes', () => {
    renderPlanner({ recipes: [], fridge: [makeFridgeItem()] });
    expect(screen.getByRole('button', { name: /Plan with Gemini/i })).toBeInTheDocument();
  });

  it('hides "Plan with Gemini" when there are no recipes, fridge, or products', () => {
    renderPlanner({ recipes: [], fridge: [], products: [] });
    expect(screen.queryByRole('button', { name: /Plan with Gemini/i })).not.toBeInTheDocument();
  });
});

// ── Week navigation ────────────────────────────────────────────────────────────

describe('PlannerScreen – week navigation', () => {
  it('"This week" button is visually dimmed when on the current week (offset 0)', () => {
    renderPlanner();
    expect(screen.getByRole('button', { name: /This week/i })).toHaveClass('planner-btn-dimmed');
  });

  it('"This week" button loses the dimmed class after navigating to the next week', async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByRole('button', { name: /This week/i })).not.toHaveClass('planner-btn-dimmed');
  });

  it('"This week" regains the dimmed class after clicking it from another week', async () => {
    const user = userEvent.setup();
    renderPlanner();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /This week/i }));
    expect(screen.getByRole('button', { name: /This week/i })).toHaveClass('planner-btn-dimmed');
  });

  it('planned meals for the current week are hidden when navigating away and restored on return', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', nameEn: 'Pasta' });
    renderPlanner({
      recipes: [recipe],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
    });
    // Slot shows the meal; drawer always shows the recipe
    expect(screen.getByText('Pasta', { selector: '.meal-name' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    // Slot is empty on the next week — no .meal-name with Pasta
    expect(screen.queryByText('Pasta', { selector: '.meal-name' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /This week/i }));
    expect(screen.getByText('Pasta', { selector: '.meal-name' })).toBeInTheDocument();
  });
});
