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

const renderProfile = (props: Partial<React.ComponentProps<typeof ProfileScreen>> = {}) =>
  render(
    <ProfileScreen
      profile={baseProfile}
      setProfile={vi.fn()}
      products={[]}
      lang="en"
      {...props}
    />
  );

describe('ProfileScreen – disable account button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders disable account button when onDisableAccount is provided', () => {
    renderProfile({ onDisableAccount: vi.fn() });
    expect(screen.getByRole('button', { name: /disable account/i })).toBeInTheDocument();
  });

  it('does not render disable account button when onDisableAccount is not provided', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: /disable account/i })).not.toBeInTheDocument();
  });

  it('shows bulgarian label when lang is bg', () => {
    renderProfile({ lang: 'bg', onDisableAccount: vi.fn() });
    expect(screen.getByRole('button', { name: /деактивирай профила/i })).toBeInTheDocument();
  });

  it('disables the button when isDisabling is true', () => {
    renderProfile({ onDisableAccount: vi.fn(), isDisabling: true });
    expect(screen.getByRole('button', { name: /disable account/i })).toBeDisabled();
  });

  it('renders danger zone when only onDisableAccount is provided', () => {
    renderProfile({ onDisableAccount: vi.fn() });
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
  });
});

describe('ProfileScreen – disable account confirmation modal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens confirmation modal when disable button is clicked', async () => {
    renderProfile({ onDisableAccount: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: /disable account/i }));
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument();
  });

  it('closes modal without calling onDisableAccount when cancel is clicked', async () => {
    const onDisableAccount = vi.fn();
    renderProfile({ onDisableAccount });
    await userEvent.click(screen.getByRole('button', { name: /disable account/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDisableAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^disable$/i })).not.toBeInTheDocument();
  });

  it('calls onDisableAccount when confirm is clicked', async () => {
    const onDisableAccount = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onDisableAccount });
    await userEvent.click(screen.getByRole('button', { name: /disable account/i }));
    await userEvent.click(screen.getByRole('button', { name: /^disable$/i }));
    expect(onDisableAccount).toHaveBeenCalledOnce();
  });

  it('closes modal before calling onDisableAccount', async () => {
    let resolveDisable!: () => void;
    const onDisableAccount = vi.fn().mockReturnValue(new Promise<void>(res => { resolveDisable = res; }));
    renderProfile({ onDisableAccount });

    await userEvent.click(screen.getByRole('button', { name: /disable account/i }));
    await userEvent.click(screen.getByRole('button', { name: /^disable$/i }));

    expect(screen.queryByRole('button', { name: /^disable$/i })).not.toBeInTheDocument();

    resolveDisable();
  });
});
