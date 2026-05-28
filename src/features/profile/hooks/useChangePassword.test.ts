import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useChangePassword } from './useChangePassword';

const { mockUpdateUser } = vi.hoisted(() => {
  const mockUpdateUser = vi.fn();
  return { mockUpdateUser };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { updateUser: mockUpdateUser },
  },
}));

describe('useChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.updateUser with the new password', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangePassword('en'));
    await act(async () => { await result.current.changePassword('newpass123'); });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' });
  });

  it('returns true and shows english success toast on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangePassword('en'));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.changePassword('newpass123'); });
    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Password changed successfully');
  });

  it('returns true and shows bulgarian success toast when lang is bg', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangePassword('bg'));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.changePassword('newpass123'); });
    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Паролата е сменена успешно');
  });

  it('returns false and shows english error toast when Supabase returns an error', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'update failed' } });
    const { result } = renderHook(() => useChangePassword('en'));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.changePassword('newpass123'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Failed to change password');
  });

  it('returns false and shows bulgarian error toast when lang is bg', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'update failed' } });
    const { result } = renderHook(() => useChangePassword('bg'));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.changePassword('newpass123'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Грешка при смяна на паролата');
  });

  it('returns false and shows error toast when call throws', async () => {
    mockUpdateUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useChangePassword('en'));
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.changePassword('newpass123'); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Failed to change password');
  });

  it('resets isChanging to false after success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangePassword('en'));
    await act(async () => { await result.current.changePassword('newpass123'); });
    expect(result.current.isChanging).toBe(false);
  });

  it('resets isChanging to false after failure', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'failed' } });
    const { result } = renderHook(() => useChangePassword('en'));
    await act(async () => { await result.current.changePassword('newpass123'); });
    expect(result.current.isChanging).toBe(false);
  });

  it('sets isChanging to true while the operation is in flight', async () => {
    let resolveUpdate!: (val: unknown) => void;
    mockUpdateUser.mockReturnValue(new Promise(res => { resolveUpdate = res; }));

    const { result } = renderHook(() => useChangePassword('en'));

    let promise: Promise<boolean>;
    act(() => { promise = result.current.changePassword('newpass123'); });

    expect(result.current.isChanging).toBe(true);

    await act(async () => {
      resolveUpdate({ error: null });
      await promise;
    });

    expect(result.current.isChanging).toBe(false);
  });
});
