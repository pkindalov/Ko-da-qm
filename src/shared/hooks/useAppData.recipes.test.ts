import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockInsert, mockDelete, mockEq, mockSelect, mockSingle, mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();

  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ data: null, error: null });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockSingle.mockResolvedValue({ data: null, error: null });

  return { mockInsert, mockDelete, mockEq, mockSelect, mockSingle, mockFrom, mockGetUser };
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

const makeRecipe = (overrides = {}) => ({
  id: 'recipe-1',
  name: 'Omelette',
  nameEn: 'Omelette',
  emoji: '🍳',
  ingredients: ['eggs', 'salt'],
  steps: ['beat eggs', 'fry'],
  time: 10,
  tags: [],
  requiredIngredients: ['eggs'],
  isAI: false,
  isPublic: false,
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
  ...overrides,
});

function setupLoadAllMocks(profileData: object | null = { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profileData, error: null }) }) }),
        insert: mockInsert,
      };
    }
    if (table === 'recipes') return { select: mockSelect, insert: mockInsert, delete: mockDelete };
    return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
  });
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
  mockSingle.mockResolvedValue({ data: [], error: null });
  mockSelect.mockReturnValue({ eq: () => Promise.resolve({ data: [], error: null }) });
}

describe('useAppData – addRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts the recipe into the DB and updates in-memory state', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const recipe = makeRecipe();
    await act(async () => { await result.current.addRecipe(recipe); });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'recipe-1',
        user_id: 'user-1',
        name: 'Omelette',
        is_public: false,
        author_name: 'Alice',
        author_email: 'alice@example.com',
      }),
    );
    expect(result.current.recipes).toContainEqual(recipe);
  });

  it('maps null optional fields correctly on insert', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const recipe = makeRecipe({ nameEn: undefined, authorName: undefined, authorEmail: undefined });
    await act(async () => { await result.current.addRecipe(recipe); });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name_en: null, author_name: null, author_email: null }),
    );
  });

  it('does not insert when no user is authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: mockInsert,
      delete: mockDelete,
    }));

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await act(async () => { await result.current.addRecipe(makeRecipe()); });

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('useAppData – removeRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the recipe from in-memory state and deletes from DB', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const recipe = makeRecipe();
    await act(async () => { await result.current.addRecipe(recipe); });
    await act(async () => { await result.current.removeRecipe('recipe-1'); });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'recipe-1');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.current.recipes.find(r => r.id === 'recipe-1')).toBeUndefined();
  });
});
