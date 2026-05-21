import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecipeFavoriteCounts } from './useRecipeFavoriteCounts';
import { createQueryWrapper } from '../../../test/queryWrapper';

const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}));

describe('useRecipeFavoriteCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when recipeIds is empty', async () => {
    const { result } = renderHook(() => useRecipeFavoriteCounts([]), { wrapper: createQueryWrapper() });
    await act(async () => {});

    expect(result.current).toEqual({});
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls RPC with recipe IDs and returns counts keyed by recipe_id', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { recipe_id: 'r1', count: 5 },
        { recipe_id: 'r2', count: 2 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useRecipeFavoriteCounts(['r1', 'r2']), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current).toEqual({ r1: 5, r2: 2 }));

    expect(mockRpc).toHaveBeenCalledWith('get_recipe_favorite_counts', {
      recipe_ids: ['r1', 'r2'],
    });
  });

  it('returns empty object when RPC returns null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useRecipeFavoriteCounts(['r1']), { wrapper: createQueryWrapper() });
    await act(async () => {});

    expect(result.current).toEqual({});
  });

  it('converts count values to numbers', async () => {
    mockRpc.mockResolvedValue({
      data: [{ recipe_id: 'r1', count: '7' }],
      error: null,
    });

    const { result } = renderHook(() => useRecipeFavoriteCounts(['r1']), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current['r1']).toBe(7));

    expect(typeof result.current['r1']).toBe('number');
  });
});
