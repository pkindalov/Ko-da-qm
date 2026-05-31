import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';

const { mockInsert, mockDelete, mockUpdate, mockEq, mockSelect, mockSingle, mockFrom, mockGetSession } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockGetSession = vi.fn();

  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockInsert.mockResolvedValue({ data: null, error: null });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockSingle.mockResolvedValue({ data: null, error: null });

  return { mockInsert, mockDelete, mockUpdate, mockEq, mockSelect, mockSingle, mockFrom, mockGetSession };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
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

const setupLoadAllMocks = (profileData: object | null = { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }) => {
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profileData, error: null }) }) }),
        insert: mockInsert,
      };
    }
    if (table === 'recipes') return { select: mockSelect, insert: mockInsert, delete: mockDelete, update: mockUpdate };
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

  it('persists source_lang on insert', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    await act(async () => { await result.current.addRecipe(makeRecipe({ sourceLang: 'bg' })); });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source_lang: 'bg' }),
    );
  });

  it('saves image_url to DB when imageUrl is provided', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const imageUrl = 'https://www.themealdb.com/images/media/meals/abc123.jpg';
    await act(async () => { await result.current.addRecipe(makeRecipe({ imageUrl })); });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: imageUrl }),
    );
  });

  it('saves image_url as null when imageUrl is undefined', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    await act(async () => { await result.current.addRecipe(makeRecipe({ imageUrl: undefined })); });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: null }),
    );
  });

  it('does not insert when no user is authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: mockInsert,
      delete: mockDelete,
    }));

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await act(async () => { await result.current.addRecipe(makeRecipe()); });

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('useAppData – updateRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates in-memory state and sends UPDATE to DB', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const recipe = makeRecipe();
    await act(async () => { await result.current.addRecipe(recipe); });

    const updated = makeRecipe({ name: 'Cheese Omelette', time: 20 });
    await act(async () => { await result.current.updateRecipe(updated); });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cheese Omelette', time: 20 }),
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'recipe-1');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.current.recipes.find(r => r.id === 'recipe-1')?.name).toBe('Cheese Omelette');
  });

  it('maps null optional fields correctly on update', async () => {
    setupLoadAllMocks();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const recipe = makeRecipe({ nameEn: undefined, authorName: undefined, authorEmail: undefined });
    await act(async () => { await result.current.updateRecipe(recipe); });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name_en: null, author_name: null, author_email: null }),
    );
  });

  it('saves image_url to DB when imageUrl is provided on update', async () => {
    setupLoadAllMocks();
    mockEq.mockReturnValue({ eq: mockEq });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    const imageUrl = 'https://www.themealdb.com/images/media/meals/xyz.jpg';
    await act(async () => { await result.current.updateRecipe(makeRecipe({ imageUrl })); });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: imageUrl }),
    );
  });
});

describe('useAppData – loadAll recipe select fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects only the required recipe fields – no wildcard', async () => {
    setupLoadAllMocks();

    renderHook(() => useAppData());
    await act(async () => {});

    expect(mockSelect).toHaveBeenCalledWith(
      'id, user_id, name, name_en, name_translated, source_lang, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, required_ingredients, is_ai, is_public, author_name, author_email',
    );
  });
});

describe('useAppData – loadAll recipe authorId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps user_id to authorId when loading personal recipes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }, error: null }) }) }),
          insert: mockInsert,
        };
      }
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{
                id: 'r1', user_id: 'user-1', name: 'Chicken', name_en: null, emoji: '🍗', image_url: null,
                ingredients: [], steps: [], time: 20, tags: [], required_ingredients: [],
                is_ai: false, is_public: false, author_name: 'Alice', author_email: null,
              }],
              error: null,
            }),
          }),
          insert: mockInsert,
          delete: mockDelete,
          update: mockUpdate,
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.recipes[0].authorId).toBe('user-1');
  });

  it('sets authorId to undefined when user_id is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }, error: null }) }) }),
          insert: mockInsert,
        };
      }
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{
                id: 'r1', user_id: null, name: 'Chicken', name_en: null, emoji: '🍗', image_url: null,
                ingredients: [], steps: [], time: 20, tags: [], required_ingredients: [],
                is_ai: false, is_public: false, author_name: null, author_email: null,
              }],
              error: null,
            }),
          }),
          insert: mockInsert,
          delete: mockDelete,
          update: mockUpdate,
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.recipes[0].authorId).toBeUndefined();
  });
});

describe('useAppData – loadAll recipe imageUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads imageUrl from image_url column when present', async () => {
    const imageUrl = 'https://www.themealdb.com/images/media/meals/abc.jpg';
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }, error: null }) }) }),
          insert: mockInsert,
        };
      }
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{
                id: 'r1', name: 'Chicken', name_en: null, emoji: '🍗', image_url: imageUrl,
                ingredients: [], steps: [], time: 20, tags: [], required_ingredients: [],
                is_ai: false, is_public: false, author_name: null, author_email: null,
              }],
              error: null,
            }),
          }),
          insert: mockInsert,
          delete: mockDelete,
          update: mockUpdate,
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.recipes[0].imageUrl).toBe(imageUrl);
  });

  it('sets imageUrl to undefined when image_url is null in DB', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1', user_metadata: {} } } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: 'Alice', allergies: [], dislikes: [], dietary_prefs: [] }, error: null }) }) }),
          insert: mockInsert,
        };
      }
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{
                id: 'r1', name: 'Chicken', name_en: null, emoji: '🍗', image_url: null,
                ingredients: [], steps: [], time: 20, tags: [], required_ingredients: [],
                is_ai: false, is_public: false, author_name: null, author_email: null,
              }],
              error: null,
            }),
          }),
          insert: mockInsert,
          delete: mockDelete,
          update: mockUpdate,
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const { result } = renderHook(() => useAppData());
    await act(async () => {});

    expect(result.current.recipes[0].imageUrl).toBeUndefined();
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
