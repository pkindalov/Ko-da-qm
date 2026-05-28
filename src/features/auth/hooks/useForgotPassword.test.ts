import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useForgotPassword } from './useForgotPassword';

const { mockResetPasswordForEmail } = vi.hoisted(() => {
  const mockResetPasswordForEmail = vi.fn();
  return { mockResetPasswordForEmail };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  },
}));

describe('useForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls resetPasswordForEmail with the email and correct redirectTo', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useForgotPassword());
    await act(async () => { await result.current.sendResetEmail('test@example.com'); });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: `${window.location.origin}/reset-password` },
    );
  });

  it('returns true on success', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useForgotPassword());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.sendResetEmail('test@example.com'); });
    expect(ok).toBe(true);
  });

  it('shows error toast and returns false when Supabase returns an error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'invalid email' } });
    const { result } = renderHook(() => useForgotPassword());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.sendResetEmail('bad@example.com'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Грешка при изпращане на имейл');
  });

  it('shows error toast and returns false when call throws', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useForgotPassword());
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.sendResetEmail('test@example.com'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Грешка при изпращане на имейл');
  });

  it('resets isSending to false after success', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useForgotPassword());
    await act(async () => { await result.current.sendResetEmail('test@example.com'); });
    expect(result.current.isSending).toBe(false);
  });

  it('resets isSending to false after failure', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'error' } });
    const { result } = renderHook(() => useForgotPassword());
    await act(async () => { await result.current.sendResetEmail('test@example.com'); });
    expect(result.current.isSending).toBe(false);
  });

  it('sets isSending to true while the operation is in flight', async () => {
    let resolveReset!: (val: unknown) => void;
    mockResetPasswordForEmail.mockReturnValue(new Promise(res => { resolveReset = res; }));

    const { result } = renderHook(() => useForgotPassword());

    let promise: Promise<boolean>;
    act(() => { promise = result.current.sendResetEmail('test@example.com'); });

    expect(result.current.isSending).toBe(true);

    await act(async () => {
      resolveReset({ error: null });
      await promise;
    });

    expect(result.current.isSending).toBe(false);
  });
});
