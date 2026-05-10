import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import type { Profile } from '../../../shared/types';

const baseProfile: Profile = {
  name: 'Test User',
  allergies: [],
  dislikes: [],
  dietaryPrefs: [],
};

interface RenderOptions {
  lang?: 'en' | 'bg';
  onLogout?: () => void;
  onTweaksToggle?: () => void;
  profile?: Profile;
}

const renderProfile = ({ lang = 'en', onLogout, onTweaksToggle, profile = baseProfile }: RenderOptions = {}) =>
  render(
    <ProfileScreen
      profile={profile}
      setProfile={vi.fn()}
      lang={lang}
      onLogout={onLogout}
      onTweaksToggle={onTweaksToggle}
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
