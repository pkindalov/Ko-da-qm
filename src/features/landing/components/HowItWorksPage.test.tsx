import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowItWorksPage } from './HowItWorksPage';

const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const renderPage = () => render(<MemoryRouter><HowItWorksPage /></MemoryRouter>);

describe('HowItWorksPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  describe('when logged out', () => {
    it('shows login and register links in the nav, not a Home link', async () => {
      renderPage();
      const nav = await screen.findByRole('navigation');
      await waitFor(() =>
        expect(within(nav).getByRole('link', { name: 'Вход' })).toHaveAttribute('href', '/login'),
      );
      expect(within(nav).getByRole('link', { name: 'Регистрация' })).toHaveAttribute('href', '/register');
      expect(within(nav).queryByRole('link', { name: 'Начало' })).not.toBeInTheDocument();
    });

    it('points the CTA at /register', async () => {
      renderPage();
      await waitFor(() =>
        expect(screen.getByRole('link', { name: /започни сега/i })).toHaveAttribute('href', '/register'),
      );
    });

    it('shows login and register links in the footer', async () => {
      renderPage();
      const footer = await screen.findByRole('contentinfo');
      await waitFor(() =>
        expect(within(footer).getByRole('link', { name: 'Вход' })).toHaveAttribute('href', '/login'),
      );
      expect(within(footer).getByRole('link', { name: 'Регистрация' })).toHaveAttribute('href', '/register');
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    });

    it('shows a Home link in the nav and hides the auth links', async () => {
      renderPage();
      const nav = await screen.findByRole('navigation');
      await waitFor(() =>
        expect(within(nav).getByRole('link', { name: 'Начало' })).toHaveAttribute('href', '/home'),
      );
      expect(within(nav).queryByRole('link', { name: 'Вход' })).not.toBeInTheDocument();
      expect(within(nav).queryByRole('link', { name: 'Регистрация' })).not.toBeInTheDocument();
    });

    it('points every Home link (nav, CTA, footer) at /home', async () => {
      renderPage();
      const homeLinks = await screen.findAllByRole('link', { name: 'Начало' });
      expect(homeLinks.length).toBeGreaterThanOrEqual(1);
      homeLinks.forEach((link) => expect(link).toHaveAttribute('href', '/home'));
    });

    it('shows a Home link in the footer and hides the auth links', async () => {
      renderPage();
      const footer = await screen.findByRole('contentinfo');
      await waitFor(() =>
        expect(within(footer).getByRole('link', { name: 'Начало' })).toHaveAttribute('href', '/home'),
      );
      expect(within(footer).queryByRole('link', { name: 'Вход' })).not.toBeInTheDocument();
      expect(within(footer).queryByRole('link', { name: 'Регистрация' })).not.toBeInTheDocument();
    });
  });
});
