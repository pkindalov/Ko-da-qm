import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: mockSignIn, getSession: mockGetSession } },
}));

const renderLogin = async () => {
  render(<MemoryRouter><LoginScreen /></MemoryRouter>);
  await screen.findByPlaceholderText('you@example.com');
};

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) => {
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  await user.type(screen.getByPlaceholderText('••••••••'), password);
};

describe('LoginScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignIn.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('renders email and password fields', async () => {
    await renderLogin();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('calls signInWithPassword with entered credentials on submit', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'test@test.com', password: 'secret123' });
  });

  it('navigates to / on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows error message when credentials are invalid', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'wrong@test.com', 'wrongpass');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument());
  });

  it('does not navigate on failed login', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'wrong@test.com', 'wrongpass');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables submit button and shows loading text during sign-in', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /влизане/i })).toBeDisabled());
  });

  it('clears a previous error on the next submit', async () => {
    mockSignIn
      .mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } })
      .mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'wrongpass');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument());

    await user.clear(screen.getByPlaceholderText('••••••••'));
    await user.type(screen.getByPlaceholderText('••••••••'), 'correctpass');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument());
  });

  it('redirects to / immediately when an active session already exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    render(<MemoryRouter><LoginScreen /></MemoryRouter>);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });
});
