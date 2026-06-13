import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannerScreen, applyGeminiPlan } from './PlannerScreen';
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

  it('hides the reset chips when nothing is planned', () => {
    renderPlanner({ recipes: [makeRecipe()] });
    expect(screen.queryByText('Clear', { selector: '.plan-scope-label' })).not.toBeInTheDocument();
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

// ── Reset chips ────────────────────────────────────────────────────────────────

describe('PlannerScreen – reset chips', () => {
  const getResetRow = () =>
    screen.getByText('Clear', { selector: '.plan-scope-label' }).closest('.plan-scope') as HTMLElement;

  it('shows the reset chips when the current week has planned meals', () => {
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })], planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } } });
    const row = getResetRow();
    ['All', 'Breakfast', 'Lunch', 'Dinner'].forEach(label =>
      expect(within(row).getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument(),
    );
  });

  it('reset All empties the whole week', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1', '0_dinner': 'r1' } },
      setPlanner,
    });
    await user.click(within(getResetRow()).getByRole('button', { name: /^All$/i }));
    expect(setPlanner.mock.calls[0][0][WEEK_KEY]).toEqual({});
  });

  it('reset Breakfast clears only the breakfast slots', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1', '0_dinner': 'r1' } },
      setPlanner,
    });
    await user.click(within(getResetRow()).getByRole('button', { name: /^Breakfast$/i }));
    const nextWeek = setPlanner.mock.calls[0][0][WEEK_KEY];
    expect(nextWeek).not.toHaveProperty('0_breakfast');
    expect(nextWeek['0_dinner']).toBe('r1');
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
    // mealsPlanned is 0 → "Try a sample week" shows and the reset chips stay hidden
    expect(screen.getByRole('button', { name: /Try a sample week/i })).toBeInTheDocument();
    expect(screen.queryByText('Clear', { selector: '.plan-scope-label' })).not.toBeInTheDocument();
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
    const drawerChips = within(document.querySelector('.drawer-chips') as HTMLElement);
    await user.click(drawerChips.getByRole('button', { name: /^Breakfast$/i }));
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
    const drawerChips = within(document.querySelector('.drawer-chips') as HTMLElement);
    await user.click(drawerChips.getByRole('button', { name: /^Breakfast$/i }));
    await user.click(drawerChips.getByRole('button', { name: /^All$/i }));
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

  it('lists the user\'s own recipe in the drawer even when it has no authorEmail', () => {
    // Regression: pickableRecipes must not filter by authorEmail, or legacy
    // recipes with a null author_email vanish from the planner drawer/picker.
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'Legacy Stew', authorEmail: undefined })] });
    expect(screen.getByText('Legacy Stew', { selector: '.drawer-recipe-name' })).toBeInTheDocument();
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

// ── Recipe source filter (Mine / Favorites / All) ───────────────────────────────

describe('PlannerScreen – recipe source filter', () => {
  const sourceRow = () => document.querySelector('.drawer-chips-source') as HTMLElement | null;
  const drawerNames = () =>
    Array.from(document.querySelectorAll('.drawer-recipe-name')).map(el => el.textContent);

  it('hides the source chips when the user has no favorited (non-own) recipes', () => {
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })] });
    expect(sourceRow()).toBeNull();
  });

  it('shows Mine / Favorites / All chips once a favorite recipe exists', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    const row = within(sourceRow() as HTMLElement);
    ['Mine', 'Favorites', 'All'].forEach(label =>
      expect(row.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument(),
    );
  });

  it('defaults to "Mine": shows own recipes and hides favorites', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    expect(drawerNames()).toContain('My Dish');
    expect(drawerNames()).not.toContain('Fav Dish');
  });

  it('"Favorites" shows favorited recipes and hides own', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    await user.click(within(sourceRow() as HTMLElement).getByRole('button', { name: /^Favorites$/i }));
    expect(drawerNames()).toContain('Fav Dish');
    expect(drawerNames()).not.toContain('My Dish');
  });

  it('still shows own recipes if "Favorites" was selected and the favorites then disappear', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    await user.click(within(sourceRow() as HTMLElement).getByRole('button', { name: /^Favorites$/i }));
    expect(drawerNames()).toEqual(['Fav Dish']);
    // Favorites vanish (e.g. unfavorited elsewhere) — the toggle hides, but the
    // drawer must fall back to showing the user's own recipes, not go empty.
    rerender(
      <PlannerScreen
        recipes={[makeRecipe({ id: 'r1', nameEn: 'My Dish' })]}
        fridge={[]}
        products={[]}
        profile={defaultProfile}
        lang="en"
        planner={{}}
        setPlanner={vi.fn()}
        favoriteRecipes={[]}
      />,
    );
    expect(sourceRow()).toBeNull();
    expect(drawerNames()).toContain('My Dish');
  });

  it('counts shown / total-pickable, so the numerator never exceeds the denominator', () => {
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    // Default "Mine" shows 1 of the 2 pickable recipes (own + favorite).
    expect(document.querySelector('.drawer-count')?.textContent).toBe('1 / 2');
  });

  it('"All" shows both own and favorited recipes', async () => {
    const user = userEvent.setup();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })],
      favoriteRecipes: [makeRecipe({ id: 'f1', nameEn: 'Fav Dish' })],
    });
    await user.click(within(sourceRow() as HTMLElement).getByRole('button', { name: /^All$/i }));
    expect(drawerNames()).toEqual(expect.arrayContaining(['My Dish', 'Fav Dish']));
  });
});

// ── Gemini suggestions management ──────────────────────────────────────────────

describe('PlannerScreen – Gemini suggestions', () => {
  beforeEach(() => localStorage.clear());

  const seedSuggestions = (recipes: Recipe[]) =>
    localStorage.setItem('kdq_planner_transient', JSON.stringify(recipes));

  it('lists transient suggestions in the drawer under a "Gemini suggestions" group', () => {
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup', authorEmail: undefined })]);
    renderPlanner();
    expect(screen.getByText(/Gemini suggestions/i)).toBeInTheDocument();
    expect(screen.getByText('AI Soup')).toBeInTheDocument();
  });

  it('renders saved recipes above the Gemini suggestions group', () => {
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup' })]);
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'My Dish' })] });
    const names = Array.from(document.querySelectorAll('.drawer-recipe-name')).map(el => el.textContent);
    expect(names.indexOf('My Dish')).toBeLessThan(names.indexOf('AI Soup'));
  });

  it('Save calls onSaveSuggestion with the recipe and drops it from the suggestions group', async () => {
    const user = userEvent.setup();
    const onSaveSuggestion = vi.fn();
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup', authorEmail: undefined })]);
    renderPlanner({ onSaveSuggestion });
    await user.click(screen.getByRole('button', { name: /Save to my recipes/i }));
    expect(onSaveSuggestion).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(screen.queryByText(/Gemini suggestions/i)).not.toBeInTheDocument();
  });

  it('Clear removes every suggestion from the drawer', async () => {
    const user = userEvent.setup();
    seedSuggestions([
      makeRecipe({ id: 's1', nameEn: 'AI Soup' }),
      makeRecipe({ id: 's2', nameEn: 'AI Salad' }),
    ]);
    renderPlanner();
    await user.click(screen.getByRole('button', { name: /^Clear$/i }));
    expect(screen.queryByText(/Gemini suggestions/i)).not.toBeInTheDocument();
  });

  it('removing a suggestion also clears it from any meal slot it filled', async () => {
    const user = userEvent.setup();
    const setPlanner = vi.fn();
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup' })]);
    renderPlanner({ planner: { [WEEK_KEY]: { '0_breakfast': 's1' } }, setPlanner });
    expect(screen.getByText('AI Soup', { selector: '.meal-name' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Remove suggestion/i }));
    // removeIdsFromPlanner passes a functional updater — apply it to assert
    const updater = setPlanner.mock.calls[0][0] as (prev: Record<string, Record<string, string>>) => Record<string, Record<string, string>>;
    expect(updater({ [WEEK_KEY]: { '0_breakfast': 's1' } })[WEEK_KEY]).not.toHaveProperty('0_breakfast');
  });

  it('the drawer search also filters the Gemini suggestions', async () => {
    const user = userEvent.setup();
    seedSuggestions([
      makeRecipe({ id: 's1', nameEn: 'AI Soup' }),
      makeRecipe({ id: 's2', nameEn: 'AI Salad' }),
    ]);
    renderPlanner();
    await user.type(screen.getByPlaceholderText(/^Search…$/i), 'soup');
    expect(screen.getByText('AI Soup')).toBeInTheDocument();
    expect(screen.queryByText('AI Salad')).not.toBeInTheDocument();
  });

  it('a meal chip filters the Gemini suggestions by tag', async () => {
    const user = userEvent.setup();
    seedSuggestions([
      makeRecipe({ id: 's1', nameEn: 'AI Eggs', tags: ['breakfast'] }),
      makeRecipe({ id: 's2', nameEn: 'AI Steak', tags: ['dinner'] }),
    ]);
    renderPlanner();
    const drawerChips = within(document.querySelector('.drawer-chips') as HTMLElement);
    await user.click(drawerChips.getByRole('button', { name: /^Breakfast$/i }));
    expect(screen.getByText('AI Eggs')).toBeInTheDocument();
    expect(screen.queryByText('AI Steak')).not.toBeInTheDocument();
  });

  it('marks a meal slot filled by a suggestion with a Gemini tag', () => {
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup' })]);
    renderPlanner({ planner: { [WEEK_KEY]: { '0_breakfast': 's1' } } });
    expect(screen.getByText(/✨ Gemini/i, { selector: '.meal-slot-suggestion' })).toBeInTheDocument();
  });

  it('clicking a suggestion-filled meal slot opens the preview modal, not the Recipes screen', async () => {
    const user = userEvent.setup();
    const onViewRecipe = vi.fn();
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup', steps: ['Boil water'] })]);
    renderPlanner({ planner: { [WEEK_KEY]: { '0_breakfast': 's1' } }, onViewRecipe });
    await user.click(screen.getByText('AI Soup', { selector: '.meal-name' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Boil water')).toBeInTheDocument();
    expect(onViewRecipe).not.toHaveBeenCalled();
  });

  it('clicking a suggestion opens a preview modal with the full recipe', async () => {
    const user = userEvent.setup();
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup', steps: ['Boil water', 'Serve'] })]);
    renderPlanner();
    await user.click(screen.getByRole('button', { name: /AI Soup/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Boil water')).toBeInTheDocument();
    expect(within(dialog).getByText('Serve')).toBeInTheDocument();
  });

  it('"Add to my recipes" inside the preview modal saves the suggestion', async () => {
    const user = userEvent.setup();
    const onSaveSuggestion = vi.fn();
    seedSuggestions([makeRecipe({ id: 's1', nameEn: 'AI Soup' })]);
    renderPlanner({ onSaveSuggestion });
    await user.click(screen.getByRole('button', { name: /AI Soup/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Add to my recipes/i }));
    expect(onSaveSuggestion).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ── applyGeminiPlan (scope/suggestion logic) ─────────────────────────────────────

describe('applyGeminiPlan', () => {
  const W = '2026-01-05';

  it('filling one meal type keeps slots AND suggestions from other meal types', () => {
    // Breakfasts were previously generated by Gemini (transient suggestions).
    const planner = { [W]: { '0_breakfast': 'b1', '1_breakfast': 'b2' } };
    const transient = [makeRecipe({ id: 'b1' }), makeRecipe({ id: 'b2' })];
    // Now the user scopes to dinner and Gemini returns a dinner plan.
    const plan = { '0_dinner': 'd1', '1_dinner': 'd1' };
    const newRecipes = [makeRecipe({ id: 'd1' })];

    const { nextPlanner, nextTransient } = applyGeminiPlan(planner, W, plan, 'dinner', false, transient, newRecipes);

    // Breakfast slots are untouched — the bug was that they got wiped.
    expect(nextPlanner[W]['0_breakfast']).toBe('b1');
    expect(nextPlanner[W]['1_breakfast']).toBe('b2');
    // Dinner slots were filled.
    expect(nextPlanner[W]['0_dinner']).toBe('d1');
    // Breakfast suggestions are retained, dinner suggestion added.
    expect(nextTransient.map(r => r.id).sort()).toEqual(['b1', 'b2', 'd1']);
  });

  it('merge only fills empty in-scope slots and leaves filled ones alone', () => {
    const planner = { [W]: { '0_dinner': 'keep' } };
    const plan = { '0_dinner': 'x', '1_dinner': 'd2' };
    const { nextPlanner } = applyGeminiPlan(planner, W, plan, 'dinner', false, [], [makeRecipe({ id: 'd2' })]);
    expect(nextPlanner[W]['0_dinner']).toBe('keep'); // not overwritten
    expect(nextPlanner[W]['1_dinner']).toBe('d2');   // empty slot filled
  });

  it('scoped overwrite replaces that meal type but keeps the others', () => {
    const planner = { [W]: { '0_breakfast': 'b1', '0_dinner': 'dOld' } };
    const transient = [makeRecipe({ id: 'b1' }), makeRecipe({ id: 'dOld' })];
    const plan = { '0_dinner': 'dNew' };
    const { nextPlanner, nextTransient } = applyGeminiPlan(planner, W, plan, 'dinner', true, transient, [makeRecipe({ id: 'dNew' })]);
    expect(nextPlanner[W]['0_breakfast']).toBe('b1');   // kept
    expect(nextPlanner[W]['0_dinner']).toBe('dNew');    // replaced
    expect(nextTransient.map(r => r.id).sort()).toEqual(['b1', 'dNew']); // dOld dropped, b1 kept
  });

  it('overwrite All replaces the whole week and discards now-unused suggestions', () => {
    const planner = { [W]: { '0_breakfast': 'b1' } };
    const plan = { '0_breakfast': 'n1', '0_lunch': 'n1' };
    const { nextPlanner, nextTransient } = applyGeminiPlan(planner, W, plan, 'all', true, [makeRecipe({ id: 'b1' })], [makeRecipe({ id: 'n1' })]);
    expect(nextPlanner[W]).toEqual({ '0_breakfast': 'n1', '0_lunch': 'n1' });
    expect(nextTransient.map(r => r.id)).toEqual(['n1']); // old b1 no longer placed → dropped
  });
});

// ── Gemini meal scope ──────────────────────────────────────────────────────────

describe('PlannerScreen – Gemini meal scope', () => {
  const getScopeChip = (label: RegExp) => {
    const scope = screen.getByText(/Gemini fills/i).closest('.plan-scope') as HTMLElement;
    return within(scope).getByRole('button', { name: label });
  };

  it('shows the Gemini scope chips when planning is possible', () => {
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })] });
    const scope = screen.getByText(/Gemini fills/i).closest('.plan-scope') as HTMLElement;
    ['All', 'Breakfast', 'Lunch', 'Dinner'].forEach(label =>
      expect(within(scope).getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument(),
    );
  });

  it('scoping to Breakfast asks to replace only breakfasts when they are all full', async () => {
    const user = userEvent.setup();
    const breakfastFull = Object.fromEntries(Array.from({ length: 7 }, (_, d) => [`${d}_breakfast`, 'r1']));
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })], planner: { [WEEK_KEY]: breakfastFull } });
    await user.click(getScopeChip(/^Breakfast$/i));
    await user.click(screen.getByRole('button', { name: /Plan with Gemini/i }));
    expect(screen.getByText(/Replace all breakfasts\?/i)).toBeInTheDocument();
  });

  it('the default (All) scope asks to replace the whole week when every slot is full', async () => {
    const user = userEvent.setup();
    const fullWeek = Object.fromEntries(
      Array.from({ length: 7 }, (_, d) => ['breakfast', 'lunch', 'dinner'].map(m => [`${d}_${m}`, 'r1'])).flat(),
    );
    renderPlanner({ recipes: [makeRecipe({ id: 'r1' })], planner: { [WEEK_KEY]: fullWeek } });
    await user.click(screen.getByRole('button', { name: /Plan with Gemini/i }));
    expect(screen.getByText(/Replace the whole week\?/i)).toBeInTheDocument();
  });
});

// ── Drawer delete confirmation ─────────────────────────────────────────────────

describe('PlannerScreen – drawer delete confirmation', () => {
  it('shows a delete button in the drawer when onDeleteRecipe is provided', () => {
    const onDeleteRecipe = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      onDeleteRecipe,
    });
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('does not show a delete button in the drawer when onDeleteRecipe is absent', () => {
    renderPlanner({ recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })] });
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('clicking the drawer delete button opens a confirmation dialog, not immediately deletes', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      onDeleteRecipe,
    });
    await user.click(screen.getByTitle('Delete'));
    expect(onDeleteRecipe).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirming the delete dialog calls onDeleteRecipe with the recipe id', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      onDeleteRecipe,
    });
    await user.click(screen.getByTitle('Delete'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Confirm$/i }));
    expect(onDeleteRecipe).toHaveBeenCalledWith('r1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('canceling the delete dialog does not call onDeleteRecipe', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      onDeleteRecipe,
    });
    await user.click(screen.getByTitle('Delete'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Cancel$/i }));
    expect(onDeleteRecipe).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not show a Delete button for a favorited community recipe', () => {
    const communityRecipe = makeRecipe({ id: 'community-1', nameEn: 'Community Pasta' });
    renderPlanner({
      recipes: [],
      favoriteRecipes: [communityRecipe],
      onDeleteRecipe: vi.fn(),
    });
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('does not show an Edit button for a favorited community recipe', () => {
    const communityRecipe = makeRecipe({ id: 'community-1', nameEn: 'Community Pasta' });
    renderPlanner({
      recipes: [],
      favoriteRecipes: [communityRecipe],
      onViewRecipe: vi.fn(),
    });
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
  });

  it('confirming the delete dialog also removes the recipe from planner slots', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    const setPlanner = vi.fn();
    renderPlanner({
      recipes: [makeRecipe({ id: 'r1', nameEn: 'Pasta' })],
      planner: { [WEEK_KEY]: { '0_breakfast': 'r1' } },
      onDeleteRecipe,
      setPlanner,
    });
    await user.click(screen.getByTitle('Delete'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Confirm$/i }));
    // removeIdsFromPlanner passes a functional updater — apply it to assert
    const updater = setPlanner.mock.calls[0][0] as (prev: Record<string, Record<string, string>>) => Record<string, Record<string, string>>;
    expect(updater({ [WEEK_KEY]: { '0_breakfast': 'r1' } })[WEEK_KEY]).not.toHaveProperty('0_breakfast');
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
