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

const renderProfile = (onLogout?: () => void) =>
  render(
    <ProfileScreen
      profile={baseProfile}
      setProfile={vi.fn()}
      lang="en"
      onLogout={onLogout}
    />
  );

describe('ProfileScreen logout button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders logout button when onLogout is provided', () => {
    renderProfile(vi.fn());
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('does not render logout button when onLogout is not provided', () => {
    renderProfile();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', async () => {
    const onLogout = vi.fn();
    renderProfile(onLogout);
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
