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

describe('ProfileScreen – delete account button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders delete account button when onDeleteAccount is provided', () => {
    renderProfile({ onDeleteAccount: vi.fn() });
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('does not render delete account button when onDeleteAccount is not provided', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: /delete account/i })).not.toBeInTheDocument();
  });

  it('shows bulgarian label when lang is bg', () => {
    renderProfile({ lang: 'bg', onDeleteAccount: vi.fn() });
    expect(screen.getByRole('button', { name: /изтрий профила/i })).toBeInTheDocument();
  });
});

describe('ProfileScreen – delete account confirmation modal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens confirmation modal when delete button is clicked', async () => {
    renderProfile({ onDeleteAccount: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('closes modal without calling onDeleteAccount when cancel is clicked', async () => {
    const onDeleteAccount = vi.fn();
    renderProfile({ onDeleteAccount });
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDeleteAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });

  it('calls onDeleteAccount when confirm is clicked', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);
    renderProfile({ onDeleteAccount });
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onDeleteAccount).toHaveBeenCalledOnce();
  });

  it('closes modal before calling onDeleteAccount', async () => {
    let resolveDelete!: () => void;
    const onDeleteAccount = vi.fn().mockReturnValue(new Promise<void>(res => { resolveDelete = res; }));
    renderProfile({ onDeleteAccount });

    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    // Modal should be gone immediately after confirm click, before the async op finishes
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();

    resolveDelete();
  });
});
