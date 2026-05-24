import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());
const mockSignInWithOAuth = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: mockSignIn, signInWithOAuth: mockSignInWithOAuth, getSession: mockGetSession } },
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
    mockSignInWithOAuth.mockReset();
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

  it('navigates to /app on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app'));
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

  it('redirects to /app immediately when an active session already exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    render(<MemoryRouter><LoginScreen /></MemoryRouter>);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true }));
  });

  it('renders the Facebook login button', async () => {
    await renderLogin();
    expect(screen.getByRole('button', { name: /влез с facebook/i })).toBeInTheDocument();
  });

  it('calls signInWithOAuth with facebook provider on Facebook button click', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await user.click(screen.getByRole('button', { name: /влез с facebook/i }));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
  });

  it('shows error message when Facebook OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'Facebook provider not enabled' } });
    const user = userEvent.setup();
    await renderLogin();
    await user.click(screen.getByRole('button', { name: /влез с facebook/i }));
    await waitFor(() => expect(screen.getByText('Facebook provider not enabled')).toBeInTheDocument());
  });

  it('renders the Google login button', async () => {
    await renderLogin();
    expect(screen.getByRole('button', { name: /влез с google/i })).toBeInTheDocument();
  });

  it('calls signInWithOAuth with google provider on Google button click', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await user.click(screen.getByRole('button', { name: /влез с google/i }));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  });

  it('shows error message when Google OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'Google provider not enabled' } });
    const user = userEvent.setup();
    await renderLogin();
    await user.click(screen.getByRole('button', { name: /влез с google/i }));
    await waitFor(() => expect(screen.getByText('Google provider not enabled')).toBeInTheDocument());
  });

  it('disables the Google button while Google OAuth is in progress', async () => {
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderLogin();
    await user.click(screen.getByRole('button', { name: /влез с google/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /влез с google/i })).toBeDisabled());
  });

  it('disables the Google button while a form sign-in is in progress', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /влез с google/i })).toBeDisabled());
  });

  it('shows error for empty email on submit', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(screen.getByText('Имейлът е задължителен')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format on submit', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'notanemail');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(screen.getByText('Невалиден имейл адрес')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows error for empty password on submit', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(screen.getByText('Паролата е задължителна')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('clears email field error when user types in the email field', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'bad');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(screen.getByText('Невалиден имейл адрес')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'x');
    expect(screen.queryByText('Невалиден имейл адрес')).not.toBeInTheDocument();
  });

  it('clears password field error when user types in the password field', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    expect(screen.getByText('Паролата е задължителна')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('••••••••'), 'x');
    expect(screen.queryByText('Паролата е задължителна')).not.toBeInTheDocument();
  });

  it('clears a previous error when Google login is clicked', async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderLogin();
    await fillForm(user, 'test@test.com', 'wrongpass');
    await user.click(screen.getByRole('button', { name: /вход/i }));
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /влез с google/i }));
    await waitFor(() => expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument());
  });
});
