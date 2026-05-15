import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockFridgeSelect, mockProductsSelect, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockFridgeSelect = vi.fn(() => ({ eq: () => Promise.resolve({ data: [], error: null }) }));
  const mockProductsSelect = vi.fn(() => ({ eq: () => Promise.resolve({ data: [], error: null }) }));
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();
  return { mockFridgeSelect, mockProductsSelect, mockFrom, mockGetUser };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: mockFrom,
  },
}));

describe('useAppData – loadAll select fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } });
    mockFridgeSelect.mockReturnValue({ eq: () => Promise.resolve({ data: [], error: null }) });
    mockProductsSelect.mockReturnValue({ eq: () => Promise.resolve({ data: [], error: null }) });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { name: 'Test', allergies: [], dislikes: [], dietary_prefs: [] }, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'fridge_items') return { select: mockFridgeSelect };
      if (table === 'products') return { select: mockProductsSelect };
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  it('selects only the required fridge_items fields – no wildcard', async () => {
    renderHook(() => useAppData());
    await act(async () => {});
    expect(mockFridgeSelect).toHaveBeenCalledWith('id, name, emoji, category');
  });

  it('selects only the required products fields – no wildcard', async () => {
    renderHook(() => useAppData());
    await act(async () => {});
    expect(mockProductsSelect).toHaveBeenCalledWith('id, name, name_en, category, status, emoji');
  });
});
