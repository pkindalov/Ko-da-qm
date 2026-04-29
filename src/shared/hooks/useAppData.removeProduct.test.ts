import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';
import type { Product } from '../types';
import { DEFAULT_PRODUCTS } from '../constants/defaults';

const { mockGetUser, mockGetSession, mockDelete, mockEq, mockNot, mockUpsert, mockFrom } =
  vi.hoisted(() => {
    const mockNot = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn();
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete, upsert: mockUpsert });
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
    const mockGetSession = vi.fn();
    return { mockGetUser, mockGetSession, mockDelete, mockEq, mockNot, mockUpsert, mockFrom };
  });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
    from: mockFrom,
  },
}));

const USER_ID = 'user-123';

const makeUserProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'uuid-abc',
  name: 'Ябълка',
  emoji: '🍎',
  category: 'fruit',
  status: 'liked',
  ...overrides,
});

describe('useAppData – setProducts (remove)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } }); // loadAll no-op
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: USER_ID } } } });
    mockNot.mockResolvedValue({ error: null });
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: mockDelete, upsert: mockUpsert });
  });

  it('removes the product from state immediately', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const userProduct = makeUserProduct();

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, userProduct]);
    });
    expect(result.current.products).toContainEqual(userProduct);

    await act(async () => {
      result.current.setProducts(DEFAULT_PRODUCTS);
    });

    expect(result.current.products).not.toContainEqual(userProduct);
    expect(result.current.products).toEqual(DEFAULT_PRODUCTS);
  });

  it('calls delete when the last user product is removed', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    // Add then remove a user product
    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, makeUserProduct()]);
    });
    await act(async () => {
      result.current.setProducts(DEFAULT_PRODUCTS);
    });

    expect(mockFrom).toHaveBeenLastCalledWith('products');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('user_id', USER_ID);
  });

  it('calls upsert + delete cleanup when some user products still remain', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const keep = makeUserProduct({ id: 'uuid-keep', name: 'Морков', emoji: '🥕' });
    const remove = makeUserProduct({ id: 'uuid-remove', name: 'Лук', emoji: '🧅' });

    // Start with both, then remove one
    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, keep, remove]);
    });
    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, keep]);
    });

    expect(mockUpsert).toHaveBeenLastCalledWith(
      [expect.objectContaining({ id: 'uuid-keep', user_id: USER_ID })],
    );
    expect(mockNot).toHaveBeenLastCalledWith('id', 'in', '(uuid-keep)');
  });

  it('does not call supabase when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    await act(async () => {
      result.current.setProducts(DEFAULT_PRODUCTS);
    });

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('never syncs default products (p1, p2…) to supabase', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    await act(async () => {
      result.current.setProducts(DEFAULT_PRODUCTS);
    });

    // Default-only → userProducts is empty → delete-all path, upsert never called
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('updates state even when the upsert fails, but skips the delete cleanup', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const keep = makeUserProduct({ id: 'uuid-keep', name: 'Морков', emoji: '🥕' });
    const remove = makeUserProduct({ id: 'uuid-remove', name: 'Лук', emoji: '🧅' });

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, keep, remove]);
    });

    mockUpsert.mockResolvedValueOnce({ error: { message: 'upsert failed' } });

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, keep]);
    });

    // State reflects the removal despite the Supabase error
    expect(result.current.products).not.toContainEqual(remove);
    expect(result.current.products).toContainEqual(keep);
    // Cleanup delete must not run when upsert already failed
    expect(mockNot).toHaveBeenCalledTimes(1); // only from the first setProducts call
  });
});
