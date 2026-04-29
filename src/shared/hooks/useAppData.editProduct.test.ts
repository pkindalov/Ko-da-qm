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
  nameEn: 'Apple',
  emoji: '🍎',
  category: 'fruit',
  status: 'liked',
  ...overrides,
});

describe('useAppData – setProducts (edit)', () => {
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
});
