import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useDisableAccount } from './useDisableAccount';

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

describe('useDisableAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('calls supabase.rpc("disable_user")', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(mockRpc).toHaveBeenCalledWith('disable_user');
  });

  it('calls signOut after a successful RPC call', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('shows english error toast and skips signOut when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'disable failed' } });
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Failed to disable account');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('shows bulgarian error toast when lang is bg', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'disable failed' } });
    const { result } = renderHook(() => useDisableAccount('bg'));
    await act(async () => { await result.current.disableAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Грешка при деактивиране на профила');
  });

  it('shows error toast and skips signOut when RPC throws', async () => {
    mockRpc.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(toast.error).toHaveBeenCalledWith('Failed to disable account');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('resets isDisabling to false after a failed call', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'failed' } });
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(result.current.isDisabling).toBe(false);
  });

  it('resets isDisabling to false after a successful call', async () => {
    mockRpc.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useDisableAccount('en'));
    await act(async () => { await result.current.disableAccount(); });
    expect(result.current.isDisabling).toBe(false);
  });

  it('sets isDisabling to true while the operation is in flight', async () => {
    let resolveRpc!: (val: unknown) => void;
    mockRpc.mockReturnValue(new Promise(res => { resolveRpc = res; }));

    const { result } = renderHook(() => useDisableAccount('en'));

    let promise: Promise<void>;
    act(() => { promise = result.current.disableAccount(); });

    expect(result.current.isDisabling).toBe(true);

    await act(async () => {
      resolveRpc({ error: { message: 'failed' } });
      await promise;
    });

    expect(result.current.isDisabling).toBe(false);
  });
});
