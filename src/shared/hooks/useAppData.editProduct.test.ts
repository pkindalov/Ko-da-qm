import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';
import type { Product } from '../types';
import { DEFAULT_PRODUCTS } from '../constants/defaults';

const { mockGetSession, mockDelete, mockEq, mockNot, mockUpsert, mockFrom } =
  vi.hoisted(() => {
    const mockNot = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn();
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete, upsert: mockUpsert });
    const mockGetSession = vi.fn();
    return { mockGetSession, mockDelete, mockEq, mockNot, mockUpsert, mockFrom };
  });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
  },
}));

const USER_ID = 'user-123';

const makeUserProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'uuid-abc',
  name: 'Ябълка',
  nameEn: 'Apple',
  emoji: '🍎',
  category: 'fruit',
  status: 'liked',
  ...overrides,
});

describe('useAppData – setProducts (edit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } }) // loadAll no-op
      .mockResolvedValue({ data: { session: { user: { id: USER_ID } } } });
    mockNot.mockResolvedValue({ error: null });
    mockEq.mockReturnValue({ eq: mockEq, not: mockNot });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: mockDelete, upsert: mockUpsert });
  });

  it('updates state immediately with the edited product', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const original = makeUserProduct();

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, original]);
    });

    const edited = { ...original, name: 'Круша', emoji: '🍐', status: 'disliked' as const };

    await act(async () => {
      result.current.setProducts(
        result.current.products.map(p => (p.id === original.id ? edited : p)),
      );
    });

    const found = result.current.products.find(p => p.id === original.id);
    expect(found).toEqual(edited);
  });

  it('upserts the updated fields to supabase', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const original = makeUserProduct();

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, original]);
    });

    const edited = { ...original, name: 'Круша', nameEn: 'Pear', status: 'disliked' as const };

    await act(async () => {
      result.current.setProducts(
        result.current.products.map(p => (p.id === original.id ? edited : p)),
      );
    });

    expect(mockUpsert).toHaveBeenLastCalledWith([
      {
        id: 'uuid-abc',
        user_id: USER_ID,
        name: 'Круша',
        name_en: 'Pear',
        category: 'fruit',
        status: 'disliked',
        emoji: '🍎',
      },
    ]);
  });

  it('runs the delete cleanup after upsert so stale rows are removed', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const product = makeUserProduct();

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, product]);
    });
    await act(async () => {
      result.current.setProducts(
        result.current.products.map(p => (p.id === product.id ? { ...p, name: 'Круша' } : p)),
      );
    });

    expect(mockNot).toHaveBeenLastCalledWith('id', 'in', `(${product.id})`);
  });

  it('does not call supabase when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, makeUserProduct()]);
    });

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('does not upsert default products even when their fields are changed', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const editedDefaults = DEFAULT_PRODUCTS.map(p => ({ ...p, status: 'disliked' as const }));

    await act(async () => {
      result.current.setProducts(editedDefaults);
    });

    // userProducts is empty → delete-all path, upsert never called
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('updates state even when the upsert fails, but skips the delete cleanup', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const product = makeUserProduct();

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, product]);
    });

    mockUpsert.mockResolvedValueOnce({ error: { message: 'upsert failed' } });

    const edited = { ...product, name: 'Круша' };

    await act(async () => {
      result.current.setProducts(
        result.current.products.map(p => (p.id === product.id ? edited : p)),
      );
    });

    // State reflects the edit despite the Supabase error
    expect(result.current.products).toContainEqual(edited);
    // Cleanup delete must not run when upsert already failed
    expect(mockNot).toHaveBeenCalledTimes(1); // only from the initial setProducts
  });

  it('maps cleared nameEn (undefined) to name_en: null in the upsert payload', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const product = makeUserProduct({ nameEn: 'Apple' });

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, product]);
    });

    const cleared = { ...product, nameEn: undefined };

    await act(async () => {
      result.current.setProducts(
        result.current.products.map(p => (p.id === product.id ? cleared : p)),
      );
    });

    expect(mockUpsert).toHaveBeenLastCalledWith(
      [expect.objectContaining({ name_en: null })],
    );
  });

  it('includes all user products in the upsert payload when multiple are edited', async () => {
    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const p1 = makeUserProduct({ id: 'uuid-1', name: 'Ябълка' });
    const p2 = makeUserProduct({ id: 'uuid-2', name: 'Круша' });

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, p1, p2]);
    });

    const edited1 = { ...p1, status: 'disliked' as const };
    const edited2 = { ...p2, status: 'allergic' as const };

    await act(async () => {
      result.current.setProducts([...DEFAULT_PRODUCTS, edited1, edited2]);
    });

    const lastCall = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(2);
    expect(lastCall).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'uuid-1', status: 'disliked' }),
        expect.objectContaining({ id: 'uuid-2', status: 'allergic' }),
      ]),
    );
  });
});
