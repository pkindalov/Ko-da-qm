import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlipbookModal } from './FlipbookModal';
import type { Recipe } from '../../../shared/types';

const mockMatchMedia = (mobile: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobile,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
};

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'r1',
  name: 'Палачинки',
  nameEn: 'Pancakes',
  emoji: '🥞',
  time: 20,
  requiredIngredients: ['Брашно', 'Яйца', 'Мляко'],
  ingredients: ['Брашно', 'Яйца', 'Мляко'],
  steps: ['Смесете съставките', 'Изпечете'],
  tags: ['закуска'],
  isAI: false,
  isPublic: false,
  ...overrides,
});

const r1 = makeRecipe({ id: 'r1', name: 'Палачинки', nameEn: 'Pancakes' });
const r2 = makeRecipe({ id: 'r2', name: 'Супа', nameEn: 'Soup' });

const renderModal = (props: Partial<Parameters<typeof FlipbookModal>[0]> = {}) => {
  const onClose = vi.fn();
  render(<FlipbookModal recipes={[r1, r2]} lang="bg" onClose={onClose} {...props} />);
  return { onClose };
};

// ── Cover ──────────────────────────────────────────────────────────────────
describe('FlipbookModal – cover', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setViewport(1200);
  });

  it('shows the recipe count on the cover', () => {
    renderModal({ recipes: [r1, r2] });
    expect(screen.getByText(/2.*подбрани рецепти/)).toBeInTheDocument();
  });

  it('shows English eyebrow and title when lang is "en"', () => {
    renderModal({ lang: 'en' });
    expect(screen.getByText('Recipe Collection')).toBeInTheDocument();
    expect(screen.getByText('My Cookbook')).toBeInTheDocument();
  });

  it('shows the correct spread ratio in the nav label', () => {
    // 2 recipes → pages=[cover,r1,r2] → desktop maxSpread=floor(3/2)+1=2
    renderModal({ recipes: [r1, r2] });
    expect(screen.getByText(/1\s*\/\s*2/)).toBeInTheDocument();
  });
});

// ── Nav button states ──────────────────────────────────────────────────────
describe('FlipbookModal – nav button states', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setViewport(1200);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('prev is disabled on the first spread', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /Предишна страница/i })).toBeDisabled();
  });

  it('next is enabled when more spreads exist', () => {
    renderModal({ recipes: [r1] }); // 2 spreads
    expect(screen.getByRole('button', { name: /Следваща страница/i })).not.toBeDisabled();
  });

  it('next is disabled on the last spread', () => {
    renderModal({ recipes: [r1] }); // 2 spreads (0 and 1)
    fireEvent.click(screen.getByRole('button', { name: /Следваща страница/i }));
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByRole('button', { name: /Следваща страница/i })).toBeDisabled();
  });

  it('both buttons are disabled while an animation is in progress', () => {
    renderModal({ recipes: [r1] });
    fireEvent.click(screen.getByRole('button', { name: /Следваща страница/i }));
    // Timer has NOT fired yet – flip is in progress
    expect(screen.getByRole('button', { name: /Следваща страница/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Предишна страница/i })).toBeDisabled();
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────
describe('FlipbookModal – navigation', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setViewport(1200);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('clicking next shows the recipe page after the timer fires', () => {
    renderModal({ recipes: [r1] });
    fireEvent.click(screen.getByRole('button', { name: /Следваща страница/i }));
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText('Палачинки')).toBeInTheDocument();
  });

  it('clicking prev after next returns to the cover', () => {
    renderModal({ recipes: [r1] });
    fireEvent.click(screen.getByRole('button', { name: /Следваща страница/i }));
    act(() => { vi.advanceTimersByTime(780); });
    fireEvent.click(screen.getByRole('button', { name: /Предишна страница/i }));
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText(/Сборник рецепти/)).toBeInTheDocument();
  });

  it('ArrowRight advances the spread', () => {
    renderModal({ recipes: [r1] });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', bubbles: true });
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText('Палачинки')).toBeInTheDocument();
  });

  it('ArrowLeft goes back to the cover', () => {
    renderModal({ recipes: [r1] });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', bubbles: true });
    act(() => { vi.advanceTimersByTime(780); });
    fireEvent.keyDown(document.body, { key: 'ArrowLeft', bubbles: true });
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText(/Сборник рецепти/)).toBeInTheDocument();
  });

  it('a click during an animation is ignored (no double-flip)', () => {
    // 2 recipes → maxSpread=2; double-clicking should only advance by 1
    renderModal({ recipes: [r1, r2] });
    const next = screen.getByRole('button', { name: /Следваща страница/i });
    fireEvent.click(next);
    fireEvent.click(next); // during animation – should be ignored
    act(() => { vi.advanceTimersByTime(780); });
    // spread should be 1, not 2: nav shows "2 / 2"
    expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument();
  });
});

// ── Closing ────────────────────────────────────────────────────────────────
describe('FlipbookModal – closing', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setViewport(1200);
  });

  it('Escape key calls onClose', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document.body, { key: 'Escape', bubbles: true });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: /Затвори книгата/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking the overlay calls onClose', () => {
    const { onClose } = renderModal();
    // Fire directly on the overlay element (role=dialog); this doesn't pass
    // through the scene's stopPropagation since it's not a bubbled child event.
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking inside the scene does not call onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    // The nav label is inside fbk-scene which stops propagation
    await user.click(screen.getByText(/1\s*\/\s*2/));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Touch swipe ────────────────────────────────────────────────────────────
describe('FlipbookModal – touch swipe', () => {
  beforeEach(() => {
    mockMatchMedia(true); // mobile
    setViewport(375);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const swipe = (dx: number, dy = 0) => {
    const book = document.querySelector('.fbk-book')!;
    fireEvent.touchStart(book, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(book, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  };

  it('swiping left navigates forward', () => {
    renderModal({ recipes: [r1] });
    swipe(-80);
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText('Палачинки')).toBeInTheDocument();
  });

  it('swiping right navigates backward', () => {
    renderModal({ recipes: [r1] });
    swipe(-80);
    act(() => { vi.advanceTimersByTime(780); });
    swipe(80);
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText(/Сборник рецепти/)).toBeInTheDocument();
  });

  it('a short swipe (< 48 px) does not navigate', () => {
    renderModal({ recipes: [r1] });
    swipe(-30);
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText(/Сборник рецепти/)).toBeInTheDocument();
  });

  it('a mostly vertical swipe does not navigate', () => {
    renderModal({ recipes: [r1] });
    // |dy|=120, |dx|=50 → |dx| < |dy|*1.5 → rejected
    swipe(-50, -120);
    act(() => { vi.advanceTimersByTime(780); });
    expect(screen.getByText(/Сборник рецепти/)).toBeInTheDocument();
  });
});

// ── Recipe content ─────────────────────────────────────────────────────────
describe('FlipbookModal – recipe page content', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setViewport(1200);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const goToRecipe = (lang: 'bg' | 'en' = 'bg') => {
    const label = lang === 'en' ? /Next page/i : /Следваща страница/i;
    fireEvent.click(screen.getByRole('button', { name: label }));
    act(() => { vi.advanceTimersByTime(780); });
  };

  it('shows the recipe name, time and an ingredient', () => {
    renderModal({ recipes: [r1] });
    goToRecipe();
    expect(screen.getByText('Палачинки')).toBeInTheDocument();
    expect(screen.getByText(/20.*мин/)).toBeInTheDocument();
    expect(screen.getByText('Брашно')).toBeInTheDocument();
  });

  it('shows translated content when lang is "en"', () => {
    const recipe = makeRecipe({ id: 'r1', nameEn: 'Pancakes', ingredientsTranslated: ['Flour', 'Eggs'] });
    renderModal({ recipes: [recipe], lang: 'en' });
    goToRecipe('en');
    expect(screen.getByText('Pancakes')).toBeInTheDocument();
    expect(screen.getByText('Flour')).toBeInTheDocument();
  });

  it('shows "+N more" when ingredients exceed the desktop limit of 7', () => {
    const recipe = makeRecipe({
      id: 'r1',
      ingredients: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], // 8 → +1 more
    });
    renderModal({ recipes: [recipe] });
    goToRecipe();
    expect(screen.getByText(/\+1.*още/)).toBeInTheDocument();
  });

  it('falls back to Bulgarian ingredients when no translation exists', () => {
    const recipe = makeRecipe({ id: 'r1', ingredientsTranslated: undefined });
    renderModal({ recipes: [recipe], lang: 'en' });
    goToRecipe('en');
    expect(screen.getByText('Брашно')).toBeInTheDocument();
  });
});
