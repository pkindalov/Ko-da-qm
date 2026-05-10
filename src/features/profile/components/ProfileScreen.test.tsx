import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import type { Profile, Product } from '../../../shared/types';

const baseProfile: Profile = {
  name: 'Test User',
  allergies: [],
  dislikes: [],
  dietaryPrefs: [],
};

const honeyProduct: Product = { id: 'p1', name: 'Honey', nameEn: 'honey', category: 'other', status: 'allergic', emoji: '🍯' };
const mushroomProduct: Product = { id: 'p2', name: 'Mushrooms', nameEn: 'mushrooms', category: 'veg', status: 'disliked', emoji: '🍄' };
const tomatoProduct: Product = { id: 'p3', name: 'Tomato', nameEn: 'tomato', category: 'veg', status: 'liked', emoji: '🍅' };

interface RenderOptions {
  lang?: 'en' | 'bg';
  onLogout?: () => void;
  onTweaksToggle?: () => void;
  onNavigateToProducts?: () => void;
  profile?: Profile;
  products?: Product[];
}

const renderProfile = ({ lang = 'en', onLogout, onTweaksToggle, onNavigateToProducts, profile = baseProfile, products = [] }: RenderOptions = {}) =>
  render(
    <ProfileScreen
      profile={profile}
      setProfile={vi.fn()}
      products={products}
      lang={lang}
      onLogout={onLogout}
      onTweaksToggle={onTweaksToggle}
      onNavigateToProducts={onNavigateToProducts}
    />
  );

describe('ProfileScreen logout button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders logout button when onLogout is provided', () => {
    renderProfile({ onLogout: vi.fn() });
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('does not render logout button when onLogout is not provided', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', async () => {
    const onLogout = vi.fn();
    renderProfile({ onLogout });
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('shows bulgarian logout label when lang is bg', () => {
    renderProfile({ lang: 'bg', onLogout: vi.fn() });
    expect(screen.getByRole('button', { name: /изход/i })).toBeInTheDocument();
  });
});

describe('ProfileScreen settings button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders settings button when onTweaksToggle is provided', () => {
    renderProfile({ onTweaksToggle: vi.fn() });
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('does not render settings button when onTweaksToggle is not provided', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('calls onTweaksToggle when settings button is clicked', async () => {
    const onTweaksToggle = vi.fn();
    renderProfile({ onTweaksToggle });
    await userEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(onTweaksToggle).toHaveBeenCalledOnce();
  });

  it('shows bulgarian settings label when lang is bg', () => {
    renderProfile({ lang: 'bg', onTweaksToggle: vi.fn() });
    expect(screen.getByRole('button', { name: /настройки/i })).toBeInTheDocument();
  });
});

describe('ProfileScreen labels language', () => {
  it('shows english labels when lang is en', () => {
    renderProfile({ lang: 'en' });
    expect(screen.getByText(/my profile/i)).toBeInTheDocument();
    expect(screen.getByText(/display name/i)).toBeInTheDocument();
  });

  it('shows bulgarian labels when lang is bg', () => {
    renderProfile({ lang: 'bg' });
    expect(screen.getByText(/моят профил/i)).toBeInTheDocument();
    expect(screen.getByText(/^ИМЕ$/i)).toBeInTheDocument();
  });
});

describe('ProfileScreen dietary preferences language', () => {
  it('shows english dietary preference labels when lang is en', () => {
    renderProfile({ lang: 'en' });
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Vegan')).toBeInTheDocument();
    expect(screen.getByText('Gluten-free')).toBeInTheDocument();
    expect(screen.getByText('Lactose-free')).toBeInTheDocument();
    expect(screen.getByText('Halal')).toBeInTheDocument();
    expect(screen.getByText('Kosher')).toBeInTheDocument();
  });

  it('shows bulgarian dietary preference labels when lang is bg', () => {
    renderProfile({ lang: 'bg' });
    expect(screen.getByText('Вегетарианец')).toBeInTheDocument();
    expect(screen.getByText('Веган')).toBeInTheDocument();
    expect(screen.getByText('Без глутен')).toBeInTheDocument();
    expect(screen.getByText('Без лактоза')).toBeInTheDocument();
    expect(screen.getByText('Халал')).toBeInTheDocument();
    expect(screen.getByText('Кошер')).toBeInTheDocument();
  });

  it('does not show bulgarian text in dietary preferences when lang is en', () => {
    renderProfile({ lang: 'en' });
    expect(screen.queryByText('Вегетарианец')).not.toBeInTheDocument();
    expect(screen.queryByText('Веган')).not.toBeInTheDocument();
  });

  it('does not show english text in dietary preferences when lang is bg', () => {
    renderProfile({ lang: 'bg' });
    expect(screen.queryByText('Vegetarian')).not.toBeInTheDocument();
    expect(screen.queryByText('Vegan')).not.toBeInTheDocument();
  });
});

describe('ProfileScreen allergies and dislikes from products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows allergic product name in allergies section', () => {
    renderProfile({ products: [honeyProduct] });
    expect(screen.getByText(/Honey/)).toBeInTheDocument();
  });

  it('shows disliked product name in dislikes section', () => {
    renderProfile({ products: [mushroomProduct] });
    expect(screen.getByText(/Mushrooms/)).toBeInTheDocument();
  });

  it('does not show liked product in allergies or dislikes sections', () => {
    renderProfile({ products: [tomatoProduct] });
    const allergiesCard = screen.getByText((_, el) => el?.className === 'section-title' && !!el.textContent?.includes('ALLERGIES')).closest('.card');
    const dislikesCard = screen.getByText((_, el) => el?.className === 'section-title' && !!el.textContent?.includes('DISLIKES')).closest('.card');
    expect(allergiesCard).not.toHaveTextContent('Tomato');
    expect(dislikesCard).not.toHaveTextContent('Tomato');
  });

  it('shows empty message when no allergic products', () => {
    renderProfile({ products: [] });
    expect(screen.getByText('No allergies set.')).toBeInTheDocument();
  });

  it('shows empty message when no disliked products', () => {
    renderProfile({ products: [] });
    expect(screen.getByText('No dislikes set.')).toBeInTheDocument();
  });

  it('shows empty messages in bulgarian when no products and lang is bg', () => {
    renderProfile({ lang: 'bg', products: [] });
    expect(screen.getByText('Няма зададени алергии.')).toBeInTheDocument();
    expect(screen.getByText('Няма зададени нелюбими.')).toBeInTheDocument();
  });

  it('shows manage button when onNavigateToProducts is provided', () => {
    renderProfile({ onNavigateToProducts: vi.fn(), products: [] });
    const buttons = screen.getAllByRole('button', { name: /manage in products/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onNavigateToProducts when manage button is clicked', async () => {
    const onNavigateToProducts = vi.fn();
    renderProfile({ onNavigateToProducts, products: [] });
    const buttons = screen.getAllByRole('button', { name: /manage in products/i });
    await userEvent.click(buttons[0]);
    expect(onNavigateToProducts).toHaveBeenCalledOnce();
  });

  it('shows correct summary counts from products', () => {
    renderProfile({ products: [honeyProduct, mushroomProduct, tomatoProduct] });
    const summary = screen.getByText(/summary/i).closest('.card');
    expect(summary).toHaveTextContent('1'); // 1 allergy
    expect(summary).toHaveTextContent('1'); // 1 dislike
  });
});
