import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockSingle, mockSelect, mockInsert, mockFrom, mockGetSession } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  const mockGetSession = vi.fn();
  return { mockSingle, mockSelect, mockInsert, mockFrom, mockGetSession };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
  },
}));

describe('useAppData – addProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // loadAll runs on mount; returning no user short-circuits it
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('inserts the product in supabase and appends it to products state', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-123' } } } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-uuid' }, error: null });

    const newProduct = {
      name: 'Ябълка',
      nameEn: 'Apple',
      emoji: '🍎',
      category: 'fruit' as const,
      status: 'liked' as const,
    };

    await act(async () => {
      await result.current.addProduct(newProduct);
    });

    expect(mockFrom).toHaveBeenCalledWith('products');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      name: 'Ябълка',
      name_en: 'Apple',
      category: 'fruit',
      status: 'liked',
      emoji: '🍎',
    });
    expect(result.current.products).toContainEqual({ ...newProduct, id: 'new-uuid' });
  });

  it('does nothing when no user is logged in', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const initialProducts = result.current.products;

    await act(async () => {
      await result.current.addProduct({
        name: 'Test',
        emoji: '📦',
        category: 'other',
        status: 'liked',
      });
    });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(result.current.products).toEqual(initialProducts);
  });

  it('does not update state when supabase returns an error', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-123' } } } });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const initialProducts = result.current.products;

    await act(async () => {
      await result.current.addProduct({
        name: 'Test',
        emoji: '📦',
        category: 'other',
        status: 'liked',
      });
    });

    expect(result.current.products).toEqual(initialProducts);
  });

  it('sets name_en to null when nameEn is not provided', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-123' } } } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-uuid' }, error: null });

    await act(async () => {
      await result.current.addProduct({
        name: 'Тест',
        emoji: '📦',
        category: 'other',
        status: 'liked',
      });
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name_en: null }),
    );
  });

  it('accumulates products in state across sequential calls', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {}); // flush loadAll (null user → no-op)

    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } });
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'uuid-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'uuid-2' }, error: null });

    await act(async () => {
      await result.current.addProduct({ name: 'Ябълка', emoji: '🍎', category: 'fruit', status: 'liked' });
    });
    await act(async () => {
      await result.current.addProduct({ name: 'Круша', emoji: '🍐', category: 'fruit', status: 'liked' });
    });

    expect(result.current.products).toContainEqual(expect.objectContaining({ id: 'uuid-1', name: 'Ябълка' }));
    expect(result.current.products).toContainEqual(expect.objectContaining({ id: 'uuid-2', name: 'Круша' }));
  });
});
