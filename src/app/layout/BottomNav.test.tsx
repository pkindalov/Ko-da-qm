import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomNav } from './BottomNav';

const setup = (tab: string, lang: 'en' | 'bg' = 'en') => {
  const setTab = vi.fn();
  render(<BottomNav tab={tab as never} setTab={setTab} lang={lang} />);
  return { setTab };
};

describe('BottomNav – main row active state', () => {
  it('marks Home active when tab is home', () => {
    setup('home');
    expect(screen.getByRole('button', { name: /home/i })).toHaveClass('active');
  });

  it('marks Feed active when tab is feed', () => {
    setup('feed');
    expect(screen.getByRole('button', { name: /feed/i })).toHaveClass('active');
  });

  it('marks Cook group active when tab is recipes', () => {
    setup('recipes');
    expect(screen.getByRole('button', { name: 'Cook' })).toHaveClass('active');
  });

  it('marks Cook group active when tab is cookbook', () => {
    setup('cookbook');
    expect(screen.getByRole('button', { name: 'Cook' })).toHaveClass('active');
  });

  it('marks Cook group active when tab is planner', () => {
    setup('planner');
    expect(screen.getByRole('button', { name: 'Cook' })).toHaveClass('active');
  });

  it('marks Kitchen group active when tab is fridge', () => {
    setup('fridge');
    expect(screen.getByRole('button', { name: /kitchen/i })).toHaveClass('active');
  });

  it('marks Kitchen group active when tab is products', () => {
    setup('products');
    expect(screen.getByRole('button', { name: /kitchen/i })).toHaveClass('active');
  });

  it('marks Profile active when tab is profile', () => {
    setup('profile');
    expect(screen.getByRole('button', { name: /profile/i })).toHaveClass('active');
  });
});

describe('BottomNav – subnav visibility', () => {
  it('shows subnav when tab is a group child (recipes)', () => {
    setup('recipes');
    expect(screen.getByRole('button', { name: /recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cookbook/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /planner/i })).toBeInTheDocument();
  });

  it('shows subnav when tab is a group child (fridge)', () => {
    setup('fridge');
    expect(screen.getByRole('button', { name: /fridge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /products/i })).toBeInTheDocument();
  });

  it('does not show subnav when tab is a leaf (home)', () => {
    setup('home');
    expect(screen.queryByRole('button', { name: /recipes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fridge/i })).not.toBeInTheDocument();
  });

  it('does not show subnav when tab is profile', () => {
    setup('profile');
    expect(screen.queryByRole('button', { name: /recipes/i })).not.toBeInTheDocument();
  });
});

describe('BottomNav – subnav active subitem', () => {
  it('marks the correct subitem active', () => {
    setup('cookbook');
    expect(screen.getByRole('button', { name: /cookbook/i })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /recipes/i })).not.toHaveClass('active');
  });
});

describe('BottomNav – leaf click', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls setTab with "home" when Home is clicked', async () => {
    const { setTab } = setup('feed');
    await userEvent.click(screen.getByRole('button', { name: /home/i }));
    expect(setTab).toHaveBeenCalledWith('home');
  });

  it('calls setTab with "profile" when Profile is clicked', async () => {
    const { setTab } = setup('home');
    await userEvent.click(screen.getByRole('button', { name: /profile/i }));
    expect(setTab).toHaveBeenCalledWith('profile');
  });
});

describe('BottomNav – group click', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navigates to first child when clicking a group not currently active', async () => {
    const { setTab } = setup('home');
    await userEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(setTab).toHaveBeenCalledWith('recipes');
  });

  it('does NOT call setTab when clicking the already-active group', async () => {
    const { setTab } = setup('recipes');
    await userEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(setTab).not.toHaveBeenCalled();
  });

  it('does NOT call setTab when clicking active group from a non-first child', async () => {
    const { setTab } = setup('cookbook');
    await userEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(setTab).not.toHaveBeenCalled();
  });
});

describe('BottomNav – subnav click', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls setTab with the child tab when a subnav item is clicked', async () => {
    const { setTab } = setup('recipes');
    await userEvent.click(screen.getByRole('button', { name: /planner/i }));
    expect(setTab).toHaveBeenCalledWith('planner');
  });
});

describe('BottomNav – language', () => {
  it('renders bulgarian labels when lang is bg', () => {
    setup('home', 'bg');
    expect(screen.getByRole('button', { name: /начало/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /лента/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /профил/i })).toBeInTheDocument();
  });
});
