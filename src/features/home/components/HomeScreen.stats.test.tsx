import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';
import type { Profile, Recipe, FridgeItem, Product } from '../../../shared/types';

const baseProfile: Profile = { name: '', allergies: [], dislikes: [], dietaryPrefs: [] };

let productCounter = 0;
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: `p${++productCounter}`,
  name: 'Product',
  category: 'other',
  status: 'liked',
  emoji: '🍎',
  ...overrides,
});

const makeFridgeItem = (overrides: Partial<FridgeItem> = {}): FridgeItem => ({
  id: 'f1',
  name: 'Броколи',
  emoji: '🥦',
  category: 'veg',
  ...overrides,
});

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Пиле с ориз',
  emoji: '🍗',
  ingredients: [],
  steps: [],
  time: 20,
  tags: [],
  requiredIngredients: [],
  isAI: false,
  isPublic: false,
  ...overrides,
});

const makeProps = (overrides: Partial<Parameters<typeof HomeScreen>[0]> = {}) => ({
  profile: baseProfile,
  recipes: [] as Recipe[],
  fridge: [] as FridgeItem[],
  publicRecipes: [] as Recipe[],
  favoriteIds: [] as string[],
  onToggleFavorite: vi.fn(),
  products: [] as Product[],
  setTab: vi.fn(),
  lang: 'bg' as const,
  onDeleteFridgeItem: vi.fn(),
  onAddFridgeItem: vi.fn(),
  onEditFridgeItem: vi.fn(),
  onRemoveAllergy: vi.fn(),
  onRemoveDislike: vi.fn(),
  ...overrides,
});

describe('HomeScreen – stat card counts', () => {
  it('shows 0 allergies when no allergic products and profile.allergies is empty', () => {
    render(<HomeScreen {...makeProps()} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('0')).toBeInTheDocument();
  });

  it('shows allergy count from allergic products when profile.allergies is empty', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows combined allergy count from profile and products', () => {
    const products = [
      makeProduct({ name: 'мляко', status: 'allergic' }),
      makeProduct({ name: 'яйца', status: 'allergic' }),
    ];
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('3')).toBeInTheDocument();
  });

  it('deduplicates allergies that appear in both profile and products', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    const profile: Profile = { ...baseProfile, allergies: ['мляко'] };
    render(<HomeScreen {...makeProps({ profile, products })} />);
    const card = screen.getByText('алергии').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows 0 dislikes when no disliked products and profile.dislikes is empty', () => {
    render(<HomeScreen {...makeProps()} />);
    const card = screen.getByText('нелюбими').parentElement!;
    expect(within(card).getByText('0')).toBeInTheDocument();
  });

  it('shows dislike count from disliked products when profile.dislikes is empty', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    const card = screen.getByText('нелюбими').parentElement!;
    expect(within(card).getByText('1')).toBeInTheDocument();
  });

  it('shows fridge item count matching fridge array length', () => {
    const fridge = [makeFridgeItem({ id: 'f1' }), makeFridgeItem({ id: 'f2' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    const card = screen.getByText('в хладилника').parentElement!;
    expect(within(card).getByText('2')).toBeInTheDocument();
  });
});

describe('HomeScreen – stat card modals', () => {
  it('opens safe recipes modal when safe recipes stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(screen.getByText('Безопасни рецепти (0)')).toBeInTheDocument();
  });

  it('opens fridge modal when fridge stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByText('Хладилник (0)')).toBeInTheDocument();
  });

  it('opens allergies modal when allergies stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByText('Алергии (0)')).toBeInTheDocument();
  });

  it('opens dislikes modal when dislikes stat is clicked', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByText('Нелюбими (0)')).toBeInTheDocument();
  });

  it('stat card clicks do not call setTab', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(setTab).not.toHaveBeenCalled();
  });

  it('safe recipes modal lists safe recipes by name', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    const modal = screen.getByText('Безопасни рецепти (1)').closest('.modal') as HTMLElement;
    expect(within(modal).getByText('Пиле с ориз')).toBeInTheDocument();
  });

  it('fridge modal lists fridge item names', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ name: 'Тиквички' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByText('Тиквички')).toBeInTheDocument();
  });

  it('allergies modal shows allergy badges', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('dislikes modal shows dislike badges', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByText('лук')).toBeInTheDocument();
  });
});

describe('HomeScreen – active allergies section', () => {
  it('does not show active allergies section when no allergies exist', () => {
    render(<HomeScreen {...makeProps()} />);
    expect(screen.queryByRole('button', { name: /Активни алергии/ })).not.toBeInTheDocument();
  });

  it('shows collapsed toggle button when profile.allergies is set', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByRole('button', { name: /Активни алергии/ })).toBeInTheDocument();
    expect(screen.queryByText('орехи')).not.toBeInTheDocument();
  });

  it('shows collapsed toggle button when a product has allergic status', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.getByRole('button', { name: /Активни алергии/ })).toBeInTheDocument();
    expect(screen.queryByText('мляко')).not.toBeInTheDocument();
  });

  it('reveals allergy badges after clicking the toggle button', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByRole('button', { name: /Активни алергии/ }));
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('shows combined allergies from profile and products when expanded', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByRole('button', { name: /Активни алергии/ }));
    expect(screen.getByText('орехи')).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('collapses badges again after a second click', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    const toggle = screen.getByRole('button', { name: /Активни алергии/ });
    await user.click(toggle);
    expect(screen.getByText('орехи')).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByText('орехи')).not.toBeInTheDocument();
  });

  it('does not show active allergies section when only disliked products exist', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.queryByRole('button', { name: /Активни алергии/ })).not.toBeInTheDocument();
  });
});

describe('HomeScreen – stat modal actions', () => {
  it('fridge modal delete button calls onDeleteFridgeItem with the item id', async () => {
    const user = userEvent.setup();
    const onDeleteFridgeItem = vi.fn();
    const fridge = [makeFridgeItem({ id: 'f-test', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge, onDeleteFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Премахни Домат' }));
    expect(onDeleteFridgeItem).toHaveBeenCalledWith('f-test');
  });

  it('fridge modal Go to Fridge button calls setTab with fridge', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByText('Към хладилника →'));
    expect(setTab).toHaveBeenCalledWith('fridge');
  });

  it('allergies modal remove button calls onRemoveAllergy with the allergy name', async () => {
    const user = userEvent.setup();
    const onRemoveAllergy = vi.fn();
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products, onRemoveAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия мляко' }));
    expect(onRemoveAllergy).toHaveBeenCalledWith('мляко');
  });

  it('allergies modal Go to Products button calls setTab with products', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByText('Към продукти →'));
    expect(setTab).toHaveBeenCalledWith('products');
  });

  it('dislikes modal remove button calls onRemoveDislike with the dislike name', async () => {
    const user = userEvent.setup();
    const onRemoveDislike = vi.fn();
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products, onRemoveDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима лук' }));
    expect(onRemoveDislike).toHaveBeenCalledWith('лук');
  });

  it('safe recipes modal Go to Recipes button calls setTab with recipes', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByText('Към рецепти →'));
    expect(setTab).toHaveBeenCalledWith('recipes');
  });
});

describe('HomeScreen – fridge modal add/edit', () => {
  it('fridge modal shows add button', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByRole('button', { name: /Добави/ })).toBeInTheDocument();
  });

  it('clicking add button shows the name input form', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    expect(screen.getByPlaceholderText(/Домати/)).toBeInTheDocument();
  });

  it('submitting the add form calls onAddFridgeItem with name and emoji', async () => {
    const user = userEvent.setup();
    const onAddFridgeItem = vi.fn();
    render(<HomeScreen {...makeProps({ onAddFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    await user.type(screen.getByPlaceholderText(/Домати/), 'Картофи');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddFridgeItem).toHaveBeenCalledWith({ name: 'Картофи', emoji: '📦', category: 'other' });
  });

  it('does not call onAddFridgeItem when name is empty', async () => {
    const user = userEvent.setup();
    const onAddFridgeItem = vi.fn();
    render(<HomeScreen {...makeProps({ onAddFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddFridgeItem).not.toHaveBeenCalled();
  });

  it('cancel button hides the add form', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(screen.queryByPlaceholderText(/Домати/)).not.toBeInTheDocument();
  });

  it('each fridge item has an edit button', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    expect(screen.getByRole('button', { name: 'Редактирай Домат' })).toBeInTheDocument();
  });

  it('edit button appears before delete button in the DOM', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    const editBtn = screen.getByRole('button', { name: 'Редактирай Домат' });
    const deleteBtn = screen.getByRole('button', { name: 'Премахни Домат' });
    expect(editBtn.compareDocumentPosition(deleteBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('clicking edit button shows the form pre-filled with item data', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат', emoji: '🍅' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Редактирай Домат' }));
    expect(screen.getByDisplayValue('Домат')).toBeInTheDocument();
  });

  it('submitting the edit form calls onEditFridgeItem with updated data', async () => {
    const user = userEvent.setup();
    const onEditFridgeItem = vi.fn();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат', emoji: '🍅', category: 'veg' })];
    render(<HomeScreen {...makeProps({ fridge, onEditFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Редактирай Домат' }));
    const input = screen.getByDisplayValue('Домат');
    await user.clear(input);
    await user.type(input, 'Тиквичка');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditFridgeItem).toHaveBeenCalledWith({ id: 'f1', name: 'Тиквичка', emoji: '🍅', category: 'veg' });
  });

  it('does not call onEditFridgeItem when name is cleared to empty', async () => {
    const user = userEvent.setup();
    const onEditFridgeItem = vi.fn();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge, onEditFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Редактирай Домат' }));
    await user.clear(screen.getByDisplayValue('Домат'));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditFridgeItem).not.toHaveBeenCalled();
  });

  it('form is hidden after closing and reopening the modal', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    expect(screen.getByPlaceholderText(/Домати/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByText('в хладилника'));
    expect(screen.queryByPlaceholderText(/Домати/)).not.toBeInTheDocument();
  });

  it('custom emoji input is shown when form is open', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    expect(screen.getByRole('textbox', { name: 'Персонален емоджи' })).toBeInTheDocument();
  });

  it('typing in the custom emoji input updates the emoji used on submit', async () => {
    const user = userEvent.setup();
    const onAddFridgeItem = vi.fn();
    render(<HomeScreen {...makeProps({ onAddFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: /Добави/ }));
    await user.type(screen.getByPlaceholderText(/Домати/), 'Картофи');
    const emojiInput = screen.getByRole('textbox', { name: 'Персонален емоджи' });
    await user.clear(emojiInput);
    await user.type(emojiInput, '🥔');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddFridgeItem).toHaveBeenCalledWith({ name: 'Картофи', emoji: '🥔', category: 'other' });
  });
});
