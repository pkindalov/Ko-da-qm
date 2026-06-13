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
  onAddAllergy: vi.fn(),
  onEditAllergy: vi.fn(),
  onRemoveDislike: vi.fn(),
  onAddDislike: vi.fn(),
  onEditDislike: vi.fn(),
  onUpdateProductStatus: vi.fn(),
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

  it('allergies modal shows all allergies in a single unified list', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('алергии'));
    const modal = screen.getByText('Алергии (2)').closest('.modal') as HTMLElement;
    expect(within(modal).getByText('орехи')).toBeInTheDocument();
    expect(within(modal).getByText('мляко')).toBeInTheDocument();
  });

  it('dislikes modal shows all dislikes in a single unified list', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByText('гъби')).toBeInTheDocument();
    expect(screen.getByText('лук')).toBeInTheDocument();
  });

  it('deduped allergy appears only once in the modal', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['мляко'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('алергии'));
    const modal = screen.getByText('Алергии (1)').closest('.modal') as HTMLElement;
    expect(within(modal).getAllByText('мляко')).toHaveLength(1);
  });

  it('deduped dislike appears only once in the modal', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['лук'] };
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getAllByText('лук')).toHaveLength(1);
  });
});

describe('HomeScreen – active allergies section', () => {
  it('does not show active allergies section when no allergies exist', () => {
    render(<HomeScreen {...makeProps()} />);
    expect(screen.queryByText(/Активни алергии/)).not.toBeInTheDocument();
  });

  it('shows alert banner with allergy name when profile.allergies is set', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByText(/Активни алергии/)).toBeInTheDocument();
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('shows alert banner with allergy name when a product has allergic status', () => {
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.getByText(/Активни алергии/)).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('allergy name is visible in the banner without any interaction', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('shows combined allergies from profile and products in the banner', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    expect(screen.getByText('орехи')).toBeInTheDocument();
    expect(screen.getByText('мляко')).toBeInTheDocument();
  });

  it('allergy names remain visible in the banner on re-render', () => {
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    expect(screen.getByText('орехи')).toBeInTheDocument();
  });

  it('does not show alert banner when only disliked products exist', () => {
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    expect(screen.queryByText(/Активни алергии/)).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
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

  it('allergies modal remove button calls onRemoveAllergy for profile allergies', async () => {
    const user = userEvent.setup();
    const onRemoveAllergy = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onRemoveAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия орехи' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onRemoveAllergy).toHaveBeenCalledWith('орехи');
  });

  it('product-derived allergy has a remove button', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByRole('button', { name: 'Премахни алергия мляко' })).toBeInTheDocument();
  });

  it('removing a product-derived allergy calls onUpdateProductStatus with liked', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const products = [makeProduct({ id: 'prod-1', name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products, onUpdateProductStatus })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия мляко' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onUpdateProductStatus).toHaveBeenCalledWith('prod-1', 'liked');
  });

  it('removing a profile allergy does not call onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onUpdateProductStatus })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия орехи' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onUpdateProductStatus).not.toHaveBeenCalled();
  });

  it('removing an allergy in both profile and products calls both onRemoveAllergy and onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onRemoveAllergy = vi.fn();
    const onUpdateProductStatus = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['мляко'] };
    const products = [makeProduct({ id: 'prod-1', name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products, onRemoveAllergy, onUpdateProductStatus })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия мляко' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onRemoveAllergy).toHaveBeenCalledWith('мляко');
    expect(onUpdateProductStatus).toHaveBeenCalledWith('prod-1', 'liked');
  });

  it('allergies modal Go to Products button calls setTab with products', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<HomeScreen {...makeProps({ setTab })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByText('Към продукти →'));
    expect(setTab).toHaveBeenCalledWith('products');
  });

  it('dislikes modal remove button calls onRemoveDislike for profile dislikes', async () => {
    const user = userEvent.setup();
    const onRemoveDislike = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onRemoveDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима гъби' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onRemoveDislike).toHaveBeenCalledWith('гъби');
  });

  it('product-derived dislike has a remove button', async () => {
    const user = userEvent.setup();
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByRole('button', { name: 'Премахни нелюбима лук' })).toBeInTheDocument();
  });

  it('removing a product-derived dislike calls onUpdateProductStatus with liked', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const products = [makeProduct({ id: 'prod-2', name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products, onUpdateProductStatus })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима лук' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onUpdateProductStatus).toHaveBeenCalledWith('prod-2', 'liked');
  });

  it('removing a profile dislike does not call onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onUpdateProductStatus })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима гъби' }));
    await user.click(screen.getByRole('button', { name: 'Потвърди' }));
    expect(onUpdateProductStatus).not.toHaveBeenCalled();
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

describe('HomeScreen – delete confirmation modals', () => {
  it('clicking fridge delete shows the confirmation dialog', async () => {
    const user = userEvent.setup();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Премахни Домат' }));
    expect(screen.getByText('Потвърди изтриване')).toBeInTheDocument();
    expect(screen.getByText(/Изтрий "Домат"/)).toBeInTheDocument();
  });

  it('cancelling fridge delete confirmation does not call onDeleteFridgeItem', async () => {
    const user = userEvent.setup();
    const onDeleteFridgeItem = vi.fn();
    const fridge = [makeFridgeItem({ id: 'f1', name: 'Домат' })];
    render(<HomeScreen {...makeProps({ fridge, onDeleteFridgeItem })} />);
    await user.click(screen.getByText('в хладилника'));
    await user.click(screen.getByRole('button', { name: 'Премахни Домат' }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(onDeleteFridgeItem).not.toHaveBeenCalled();
  });

  it('clicking allergy remove shows the confirmation dialog', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия орехи' }));
    expect(screen.getByText('Потвърди изтриване')).toBeInTheDocument();
    expect(screen.getByText(/Изтрий "орехи"/)).toBeInTheDocument();
  });

  it('cancelling allergy delete confirmation does not call onRemoveAllergy', async () => {
    const user = userEvent.setup();
    const onRemoveAllergy = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onRemoveAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Премахни алергия орехи' }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(onRemoveAllergy).not.toHaveBeenCalled();
  });

  it('clicking dislike remove shows the confirmation dialog', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима гъби' }));
    expect(screen.getByText('Потвърди изтриване')).toBeInTheDocument();
    expect(screen.getByText(/Изтрий "гъби"/)).toBeInTheDocument();
  });

  it('cancelling dislike delete confirmation does not call onRemoveDislike', async () => {
    const user = userEvent.setup();
    const onRemoveDislike = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onRemoveDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Премахни нелюбима гъби' }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(onRemoveDislike).not.toHaveBeenCalled();
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

describe('HomeScreen – allergies modal add/edit', () => {
  it('allergies modal shows add button', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByRole('button', { name: /Добави алергия/ })).toBeInTheDocument();
  });

  it('clicking add button shows the allergy name input', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: /Добави алергия/ }));
    expect(screen.getByPlaceholderText(/Фъстъци/)).toBeInTheDocument();
  });

  it('submitting the add form calls onAddAllergy with the entered name', async () => {
    const user = userEvent.setup();
    const onAddAllergy = vi.fn();
    render(<HomeScreen {...makeProps({ onAddAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: /Добави алергия/ }));
    await user.type(screen.getByPlaceholderText(/Фъстъци/), 'Орехи');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddAllergy).toHaveBeenCalledWith('Орехи');
  });

  it('does not call onAddAllergy when the allergy name is empty', async () => {
    const user = userEvent.setup();
    const onAddAllergy = vi.fn();
    render(<HomeScreen {...makeProps({ onAddAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: /Добави алергия/ }));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddAllergy).not.toHaveBeenCalled();
  });

  it('cancel hides the add form', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: /Добави алергия/ }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(screen.queryByPlaceholderText(/Фъстъци/)).not.toBeInTheDocument();
  });

  it('each allergy in the unified list has an edit button', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    const products = [makeProduct({ name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('алергии'));
    expect(screen.getByRole('button', { name: 'Редактирай алергия орехи' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Редактирай алергия мляко' })).toBeInTheDocument();
  });

  it('edit button appears before delete button for allergies', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('алергии'));
    const editBtn = screen.getByRole('button', { name: 'Редактирай алергия орехи' });
    const deleteBtn = screen.getByRole('button', { name: 'Премахни алергия орехи' });
    expect(editBtn.compareDocumentPosition(deleteBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('clicking edit button on a profile allergy shows the form pre-filled', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Редактирай алергия орехи' }));
    expect(screen.getByDisplayValue('орехи')).toBeInTheDocument();
  });

  it('editing a profile allergy calls onEditAllergy', async () => {
    const user = userEvent.setup();
    const onEditAllergy = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onEditAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Редактирай алергия орехи' }));
    const input = screen.getByDisplayValue('орехи');
    await user.clear(input);
    await user.type(input, 'фъстъци');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditAllergy).toHaveBeenCalledWith('орехи', 'фъстъци');
  });

  it('editing a profile allergy does not call onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onUpdateProductStatus })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Редактирай алергия орехи' }));
    const input = screen.getByDisplayValue('орехи');
    await user.clear(input);
    await user.type(input, 'фъстъци');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onUpdateProductStatus).not.toHaveBeenCalled();
  });

  it('editing a product-derived allergy calls onAddAllergy with new name and onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onAddAllergy = vi.fn();
    const onUpdateProductStatus = vi.fn();
    const products = [makeProduct({ id: 'prod-1', name: 'мляко', status: 'allergic' })];
    render(<HomeScreen {...makeProps({ products, onAddAllergy, onUpdateProductStatus })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Редактирай алергия мляко' }));
    const input = screen.getByDisplayValue('мляко');
    await user.clear(input);
    await user.type(input, 'dairy');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddAllergy).toHaveBeenCalledWith('dairy');
    expect(onUpdateProductStatus).toHaveBeenCalledWith('prod-1', 'liked');
  });

  it('does not call onEditAllergy when name is cleared to empty', async () => {
    const user = userEvent.setup();
    const onEditAllergy = vi.fn();
    const profile: Profile = { ...baseProfile, allergies: ['орехи'] };
    render(<HomeScreen {...makeProps({ profile, onEditAllergy })} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: 'Редактирай алергия орехи' }));
    await user.clear(screen.getByDisplayValue('орехи'));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditAllergy).not.toHaveBeenCalled();
  });

  it('allergy form is hidden after closing and reopening the modal', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('алергии'));
    await user.click(screen.getByRole('button', { name: /Добави алергия/ }));
    expect(screen.getByPlaceholderText(/Фъстъци/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByText('алергии'));
    expect(screen.queryByPlaceholderText(/Фъстъци/)).not.toBeInTheDocument();
  });
});

describe('HomeScreen – safe recipe click to detail', () => {
  it('clicking a safe recipe closes the safe recipes modal', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByRole('button', { name: 'Пиле с ориз' }));
    expect(screen.queryByText('Безопасни рецепти (1)')).not.toBeInTheDocument();
  });

  it('clicking a safe recipe opens the recipe detail view with the recipe name', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByRole('button', { name: 'Пиле с ориз' }));
    expect(screen.getAllByText('Пиле с ориз').length).toBeGreaterThan(0);
  });

  it('uses English name in detail when lang is en and nameEn is set', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз', nameEn: 'Chicken with rice' })];
    render(<HomeScreen {...makeProps({ recipes, lang: 'en' })} />);
    await user.click(screen.getByText('safe recipes'));
    await user.click(screen.getByRole('button', { name: 'Chicken with rice' }));
    expect(screen.getAllByText('Chicken with rice').length).toBeGreaterThan(0);
  });

  it('closing the detail modal removes the close button from the DOM', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByRole('button', { name: 'Пиле с ориз' }));
    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByRole('button', { name: '✕' })).not.toBeInTheDocument();
  });

  it('each safe recipe in the list is a clickable button', async () => {
    const user = userEvent.setup();
    const recipes = [
      makeRecipe({ id: 'r1', name: 'Рецепта едно' }),
      makeRecipe({ id: 'r2', name: 'Рецепта две' }),
    ];
    render(<HomeScreen {...makeProps({ recipes })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    expect(screen.getByRole('button', { name: 'Рецепта едно' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Рецепта две' })).toBeInTheDocument();
  });

  it('author name is not shown in the safe recipe detail because these are the user\'s own recipes', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз', authorName: 'Иван', authorId: 'user-42' })];
    const onNavigateToUser = vi.fn();
    render(<HomeScreen {...makeProps({ recipes, onNavigateToUser })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByRole('button', { name: 'Пиле с ориз' }));
    expect(screen.queryByText('Иван')).not.toBeInTheDocument();
  });

  it('Edit button is shown in the safe recipe detail when onEditRecipe is provided', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Chicken rice', nameEn: 'Chicken rice' })];
    const onEditRecipe = vi.fn();
    render(<HomeScreen {...makeProps({ recipes, onEditRecipe, lang: 'en' })} />);
    await user.click(screen.getByText('safe recipes'));
    await user.click(screen.getByRole('button', { name: 'Chicken rice' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '✏ Edit' })).toBeInTheDocument();
  });

  it('clicking Edit in the safe recipe detail calls onEditRecipe with the recipe and closes the modal', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', name: 'Chicken rice', nameEn: 'Chicken rice' });
    const onEditRecipe = vi.fn();
    render(<HomeScreen {...makeProps({ recipes: [recipe], onEditRecipe, lang: 'en' })} />);
    await user.click(screen.getByText('safe recipes'));
    await user.click(screen.getByRole('button', { name: 'Chicken rice' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '✏ Edit' }));
    expect(onEditRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Delete button is shown in the safe recipe detail when onDeleteRecipe is provided', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Chicken rice', nameEn: 'Chicken rice' })];
    const onDeleteRecipe = vi.fn();
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe, lang: 'en' })} />);
    await user.click(screen.getByText('safe recipes'));
    await user.click(screen.getByRole('button', { name: 'Chicken rice' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('author name is not shown when recipe has no authorName', async () => {
    const user = userEvent.setup();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз', authorId: 'user-42' })];
    const onNavigateToUser = vi.fn();
    render(<HomeScreen {...makeProps({ recipes, onNavigateToUser })} />);
    await user.click(screen.getByText('безопасни рецепти'));
    await user.click(screen.getByRole('button', { name: 'Пиле с ориз' }));
    expect(screen.queryByText('👤')).not.toBeInTheDocument();
  });
});

describe('HomeScreen – dislikes modal add/edit', () => {
  it('dislikes modal shows add button', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByRole('button', { name: /Добави нелюбима/ })).toBeInTheDocument();
  });

  it('clicking add button shows the dislike name input', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: /Добави нелюбима/ }));
    expect(screen.getByPlaceholderText(/Гъби/)).toBeInTheDocument();
  });

  it('submitting the add form calls onAddDislike with the entered name', async () => {
    const user = userEvent.setup();
    const onAddDislike = vi.fn();
    render(<HomeScreen {...makeProps({ onAddDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: /Добави нелюбима/ }));
    await user.type(screen.getByPlaceholderText(/Гъби/), 'Лук');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddDislike).toHaveBeenCalledWith('Лук');
  });

  it('does not call onAddDislike when the dislike name is empty', async () => {
    const user = userEvent.setup();
    const onAddDislike = vi.fn();
    render(<HomeScreen {...makeProps({ onAddDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: /Добави нелюбима/ }));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddDislike).not.toHaveBeenCalled();
  });

  it('cancel hides the add form', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: /Добави нелюбима/ }));
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(screen.queryByPlaceholderText(/Гъби/)).not.toBeInTheDocument();
  });

  it('each dislike in the unified list has an edit button', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    const products = [makeProduct({ name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ profile, products })} />);
    await user.click(screen.getByText('нелюбими'));
    expect(screen.getByRole('button', { name: 'Редактирай нелюбима гъби' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Редактирай нелюбима лук' })).toBeInTheDocument();
  });

  it('edit button appears before delete button for dislikes', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('нелюбими'));
    const editBtn = screen.getByRole('button', { name: 'Редактирай нелюбима гъби' });
    const deleteBtn = screen.getByRole('button', { name: 'Премахни нелюбима гъби' });
    expect(editBtn.compareDocumentPosition(deleteBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('clicking edit button on a profile dislike shows the form pre-filled', async () => {
    const user = userEvent.setup();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Редактирай нелюбима гъби' }));
    expect(screen.getByDisplayValue('гъби')).toBeInTheDocument();
  });

  it('editing a profile dislike calls onEditDislike', async () => {
    const user = userEvent.setup();
    const onEditDislike = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onEditDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Редактирай нелюбима гъби' }));
    const input = screen.getByDisplayValue('гъби');
    await user.clear(input);
    await user.type(input, 'лук');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditDislike).toHaveBeenCalledWith('гъби', 'лук');
  });

  it('editing a profile dislike does not call onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onUpdateProductStatus = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onUpdateProductStatus })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Редактирай нелюбима гъби' }));
    const input = screen.getByDisplayValue('гъби');
    await user.clear(input);
    await user.type(input, 'лук');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onUpdateProductStatus).not.toHaveBeenCalled();
  });

  it('editing a product-derived dislike calls onAddDislike with new name and onUpdateProductStatus', async () => {
    const user = userEvent.setup();
    const onAddDislike = vi.fn();
    const onUpdateProductStatus = vi.fn();
    const products = [makeProduct({ id: 'prod-2', name: 'лук', status: 'disliked' })];
    render(<HomeScreen {...makeProps({ products, onAddDislike, onUpdateProductStatus })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Редактирай нелюбима лук' }));
    const input = screen.getByDisplayValue('лук');
    await user.clear(input);
    await user.type(input, 'чесън');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onAddDislike).toHaveBeenCalledWith('чесън');
    expect(onUpdateProductStatus).toHaveBeenCalledWith('prod-2', 'liked');
  });

  it('does not call onEditDislike when name is cleared to empty', async () => {
    const user = userEvent.setup();
    const onEditDislike = vi.fn();
    const profile: Profile = { ...baseProfile, dislikes: ['гъби'] };
    render(<HomeScreen {...makeProps({ profile, onEditDislike })} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: 'Редактирай нелюбима гъби' }));
    await user.clear(screen.getByDisplayValue('гъби'));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(onEditDislike).not.toHaveBeenCalled();
  });

  it('dislike form is hidden after closing and reopening the modal', async () => {
    const user = userEvent.setup();
    render(<HomeScreen {...makeProps()} />);
    await user.click(screen.getByText('нелюбими'));
    await user.click(screen.getByRole('button', { name: /Добави нелюбима/ }));
    expect(screen.getByPlaceholderText(/Гъби/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '✕' }));
    await user.click(screen.getByText('нелюбими'));
    expect(screen.queryByPlaceholderText(/Гъби/)).not.toBeInTheDocument();
  });
});

// ── Recipe card owner controls (card-level Edit / Delete) ─────────────────────

describe('HomeScreen – recipe card owner controls', () => {
  it('shows an Edit button on recipe cards when onEditRecipe is provided', () => {
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onEditRecipe: vi.fn(), lang: 'en' })} />);
    expect(screen.getByRole('button', { name: '✏ Edit' })).toBeInTheDocument();
  });

  it('does not show an Edit button on recipe cards when onEditRecipe is absent', () => {
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    expect(screen.queryByRole('button', { name: /✏/i })).not.toBeInTheDocument();
  });

  it('clicking Edit on a card calls onEditRecipe with the recipe', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', name: 'Пиле с ориз' });
    const onEditRecipe = vi.fn();
    render(<HomeScreen {...makeProps({ recipes: [recipe], onEditRecipe, lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '✏ Edit' }));
    expect(onEditRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
  });

  it('clicking Edit on a card does not open the recipe detail modal', async () => {
    const user = userEvent.setup();
    const recipe = makeRecipe({ id: 'r1', name: 'Пиле с ориз' });
    render(<HomeScreen {...makeProps({ recipes: [recipe], onEditRecipe: vi.fn(), lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '✏ Edit' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a Delete button on recipe cards when onDeleteRecipe is provided', () => {
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe: vi.fn(), lang: 'en' })} />);
    expect(screen.getByRole('button', { name: '🗑 Delete' })).toBeInTheDocument();
  });

  it('does not show a Delete button on recipe cards when onDeleteRecipe is absent', () => {
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes })} />);
    expect(screen.queryByRole('button', { name: /🗑/i })).not.toBeInTheDocument();
  });

  it('clicking Delete on a card opens a confirmation dialog, not immediately deletes', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe, lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '🗑 Delete' }));
    expect(onDeleteRecipe).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirming the delete dialog calls onDeleteRecipe with the recipe id', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe, lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '🗑 Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Confirm$/i }));
    expect(onDeleteRecipe).toHaveBeenCalledWith('r1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('canceling the delete dialog does not call onDeleteRecipe', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe, lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '🗑 Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Cancel$/i }));
    expect(onDeleteRecipe).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clicking Delete on a card does not open the recipe detail modal', async () => {
    const user = userEvent.setup();
    const onDeleteRecipe = vi.fn();
    const recipes = [makeRecipe({ id: 'r1', name: 'Пиле с ориз' })];
    render(<HomeScreen {...makeProps({ recipes, onDeleteRecipe, lang: 'en' })} />);
    await user.click(screen.getByRole('button', { name: '🗑 Delete' }));
    // The confirm dialog opens, but it is for delete — not the recipe detail
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Пиле с ориз', { selector: '.detail-recipe-name, h2' })).not.toBeInTheDocument();
  });
});
