import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useDeleteAccount } from './useDeleteAccount';

const { mockRpc, mockSignOut } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSignOut = vi.fn();
  return { mockRpc, mockSignOut };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: { signOut: mockSignOut },
  },
}));

describe('useDeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('calls supabase.rpc("delete_user")', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(mockRpc).toHaveBeenCalledWith('delete_user');
  });

  it('calls signOut after a successful RPC call', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('shows english error toast and skips signOut when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'delete failed' } });
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Failed to delete account');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('shows bulgarian error toast when lang is bg', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'delete failed' } });
    const { result } = renderHook(() => useDeleteAccount('bg'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Грешка при изтриване на профила');
  });

  it('shows error toast and skips signOut when RPC throws', async () => {
    mockRpc.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Failed to delete account');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('resets isDeleting to false after a failed call', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'failed' } });
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(result.current.isDeleting).toBe(false);
  });

  it('resets isDeleting to false after a successful call', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDeleteAccount('en'));
    await act(async () => { await result.current.deleteAccount(); });
    expect(result.current.isDeleting).toBe(false);
  });

  it('sets isDeleting to true while the operation is in flight', async () => {
    let resolveRpc!: (val: unknown) => void;
    mockRpc.mockReturnValue(new Promise(res => { resolveRpc = res; }));

    const { result } = renderHook(() => useDeleteAccount('en'));

    let promise: Promise<void>;
    act(() => { promise = result.current.deleteAccount(); });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolveRpc({ error: { message: 'failed' } });
      await promise;
    });

    expect(result.current.isDeleting).toBe(false);
  });
});
