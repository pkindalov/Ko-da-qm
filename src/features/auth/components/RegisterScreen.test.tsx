import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterScreen } from './RegisterScreen';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSignUp = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signUp: mockSignUp } },
}));

function renderRegister() {
  render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
  confirm: string,
) {
  await user.type(screen.getByPlaceholderText('you@example.com'), email);
  const passwordFields = screen.getAllByPlaceholderText('••••••••');
  await user.type(passwordFields[0], password);
  await user.type(passwordFields[1], confirm);
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignUp.mockReset();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, 'test@test.com', 'password123', 'different');
    await user.click(screen.getByRole('button', { name: /регистрирай се/i }));
    expect(screen.getByText('Паролите не съвпадат')).toBeInTheDocument();
  });

  it('does not call supabase when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, 'test@test.com', 'password123', 'different');
    await user.click(screen.getByRole('button', { name: /регистрирай се/i }));
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls supabase signUp with correct credentials', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: /регистрирай се/i }));
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@test.com', password: 'secret123' });
  });

  it('navigates to / on successful registration', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, 'test@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: /регистрирай се/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows supabase error message on failed registration', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already in use' } });
    const user = userEvent.setup();
    renderRegister();
    await fillForm(user, 'taken@test.com', 'secret123', 'secret123');
    await user.click(screen.getByRole('button', { name: /регистрирай се/i }));
    await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument());
  });
});
