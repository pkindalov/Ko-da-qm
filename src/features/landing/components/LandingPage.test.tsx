import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

const renderLanding = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

describe('LandingPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('renders the app name in the hero', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ко-да-ям');
  });

  it('renders the app name in the nav logo', async () => {
    renderLanding();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByText('Ко-да-ям')).toBeInTheDocument();
  });

  it('renders login and register links in the nav', async () => {
    renderLanding();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: /вход/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /регистрация/i })).toBeInTheDocument();
  });

  it('login link points to /login', async () => {
    renderLanding();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: /вход/i })).toHaveAttribute('href', '/login');
  });

  it('register link points to /register', async () => {
    renderLanding();
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: /регистрация/i })).toHaveAttribute('href', '/register');
  });

  it('renders all three feature cards', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByText(/умен хладилник/i)).toBeInTheDocument());
    expect(screen.getByText(/безопасни рецепти/i)).toBeInTheDocument();
    expect(screen.getByText(/алергии под контрол/i)).toBeInTheDocument();
  });

  it('renders the three how-it-works steps', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByText(/добави в хладилника/i)).toBeInTheDocument());
    expect(screen.getByText(/задай ограниченията/i)).toBeInTheDocument();
    expect(screen.getByText(/готви без стрес/i)).toBeInTheDocument();
  });

  it('renders the final CTA section', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /готов да ядеш/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /регистрирай се сега/i })).toBeInTheDocument();
  });

  it('CTA register link points to /register', async () => {
    renderLanding();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /регистрирай се сега/i })).toHaveAttribute('href', '/register'),
    );
  });

  it('redirects to /home when an active session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    renderLanding();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }));
  });

  it('does not navigate when there is no session', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the ko-fi support button in the footer', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('button', { name: /Подкрепи проекта/i })).toBeInTheDocument());
  });

  it('clicking the ko-fi button opens the donation modal', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('button', { name: /Подкрепи проекта/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Подкрепи проекта/i }));
    expect(screen.getByTitle(/Ko-fi/i)).toBeInTheDocument();
  });

  it('closing the ko-fi modal removes the iframe', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('button', { name: /Подкрепи проекта/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Подкрепи проекта/i }));
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByTitle(/Ko-fi/i)).not.toBeInTheDocument();
  });

  it('pressing Escape closes the ko-fi modal', async () => {
    renderLanding();
    await waitFor(() => expect(screen.getByRole('button', { name: /Подкрепи проекта/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Подкрепи проекта/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTitle(/Ko-fi/i)).not.toBeInTheDocument();
  });

  it('on a touch device the ko-fi button opens Ko-fi in a new tab instead of the modal', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderLanding();
    await waitFor(() => expect(screen.getByRole('button', { name: /Подкрепи проекта/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Подкрепи проекта/i }));

    expect(openSpy).toHaveBeenCalledWith('https://ko-fi.com/pkindalov', '_blank', 'noopener,noreferrer');
    expect(screen.queryByTitle(/Ko-fi/i)).not.toBeInTheDocument();

    openSpy.mockRestore();
    window.matchMedia = originalMatchMedia;
  });
});
