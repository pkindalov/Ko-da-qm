import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterScreen } from './RegisterScreen';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSignUp = vi.hoisted(() => vi.fn());
const mockSignInWithOAuth = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signUp: mockSignUp, signInWithOAuth: mockSignInWithOAuth, getSession: mockGetSession } },
}));

const renderRegister = async () => {
  render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
  await screen.findByPlaceholderText('Иван Иванов');
};

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  email: string,
  password: string,
  confirm: string,
) {
  await user.type(screen.getByPlaceholderText('Иван Иванов'), name);
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  const passwordFields = screen.getAllByPlaceholderText('••••••••');
  await user.type(passwordFields[0], password);
  await user.type(passwordFields[1], confirm);
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignUp.mockReset();
    mockSignInWithOAuth.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('renders the name field', async () => {
    await renderRegister();
    expect(screen.getByPlaceholderText('Иван Иванов')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Тест', 'test@test.com', 'password123', 'different');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    expect(screen.getByText('Паролите не съвпадат')).toBeInTheDocument();
  });

  it('does not call supabase when passwords do not match', async () => {
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Тест', 'test@test.com', 'password123', 'different');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls supabase signUp with credentials and name in options', async () => {
    mockSignUp.mockResolvedValue({ data: { session: {}, user: {} }, error: null });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'secret123',
      options: { data: { name: 'Иван' } },
    });
  });

  it('navigates to / when signUp returns a session (email confirmation disabled)', async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: 'tok' }, user: {} }, error: null });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows confirmation screen when signUp returns no session (email confirmation required)', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.getByText(/провери имейла си/i)).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the registered email address in the confirmation screen', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.getByText('test@test.com')).toBeInTheDocument());
  });

  it('shows supabase error message on failed registration', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'Email already in use' } });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'taken@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
  });

  it('clears a previous password-mismatch error on the next submit', async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: 'tok' }, user: {} }, error: null });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'password123', 'different');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    expect(screen.getByText('Паролите не съвпадат')).toBeInTheDocument();

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.clear(passwordFields[1]);
    await user.type(passwordFields[1], 'password123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.queryByText('Паролите не съвпадат')).not.toBeInTheDocument());
  });

  it('does not navigate on a failed registration', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'Email already in use' } });
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'taken@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables submit button and shows loading text during sign-up', async () => {
    mockSignUp.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderRegister();
    await fillForm(user, 'Иван', 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: 'Регистрирай се' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /регистрация/i })).toBeDisabled());
  });

  it('redirects to / immediately when an active session already exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('renders the Facebook register button', async () => {
    await renderRegister();
    expect(screen.getByRole('button', { name: /регистрирай се с facebook/i })).toBeInTheDocument();
  });

  it('calls signInWithOAuth with facebook provider on Facebook button click', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await renderRegister();
    await user.click(screen.getByRole('button', { name: /регистрирай се с facebook/i }));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
  });

  it('shows error message when Facebook OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'Facebook provider not enabled' } });
    const user = userEvent.setup();
    await renderRegister();
    await user.click(screen.getByRole('button', { name: /регистрирай се с facebook/i }));
    await waitFor(() => expect(screen.getByText('Facebook provider not enabled')).toBeInTheDocument());
  });
});
