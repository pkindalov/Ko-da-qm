import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_PROFILE, DEFAULT_FRIDGE, DEFAULT_RECIPES, DEFAULT_PRODUCTS } from '../constants/defaults';
import type { Profile, FridgeItem, Recipe, Product } from '../types';

export function useAppData() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [fridge, setFridgeState] = useState<FridgeItem[]>(DEFAULT_FRIDGE);
  const [recipes, setRecipesState] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [products, setProductsState] = useState<Product[]>(DEFAULT_PRODUCTS);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserEmail(user.email ?? '');

    const [profileRes, fridgeRes, recipesRes, productsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('fridge_items').select('*').eq('user_id', user.id),
      supabase.from('recipes').select('*').eq('user_id', user.id),
      supabase.from('products').select('*').eq('user_id', user.id),
    ]);

    if (profileRes.data) {
      setProfileState({
        name: profileRes.data.name,
        allergies: profileRes.data.allergies ?? [],
        dislikes: profileRes.data.dislikes ?? [],
        dietaryPrefs: profileRes.data.dietary_prefs ?? [],
      });
    } else {
      const newName = (user.user_metadata?.name as string) ?? DEFAULT_PROFILE.name;
      await supabase.from('users').insert({
        id: user.id,
        name: newName,
        allergies: DEFAULT_PROFILE.allergies,
        dislikes: DEFAULT_PROFILE.dislikes,
        dietary_prefs: DEFAULT_PROFILE.dietaryPrefs,
      });
      setProfileState({
        name: newName,
        allergies: DEFAULT_PROFILE.allergies,
        dislikes: DEFAULT_PROFILE.dislikes,
        dietaryPrefs: DEFAULT_PROFILE.dietaryPrefs,
      });
    }

    // Only replace defaults when the user has saved data in DB
    if (fridgeRes.data && fridgeRes.data.length > 0) {
      setFridgeState(fridgeRes.data.map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        category: r.category,
      })));
    }

    if (recipesRes.data && recipesRes.data.length > 0) {
      setRecipesState(recipesRes.data.map(r => ({
        id: r.id,
        name: r.name,
        nameEn: r.name_en ?? undefined,
        emoji: r.emoji,
        ingredients: r.ingredients ?? [],
        steps: r.steps ?? [],
        time: r.time,
        tags: r.tags ?? [],
        requiredIngredients: r.required_ingredients ?? [],
        isAI: r.is_ai,
        isPublic: r.is_public ?? false,
        authorName: r.author_name ?? undefined,
        authorEmail: r.author_email ?? undefined,
      })));
    }

    if (productsRes.data && productsRes.data.length > 0) {
      const dbProducts = productsRes.data.map(r => ({
        id: r.id,
        name: r.name,
        nameEn: r.name_en ?? undefined,
        category: r.category,
        status: r.status,
        emoji: r.emoji,
      }));
      setProductsState([...DEFAULT_PRODUCTS, ...dbProducts]);
    }

    setLoading(false);
  }

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('users').upsert({
        id: user.id,
        name: next.name,
        allergies: next.allergies,
        dislikes: next.dislikes,
        dietary_prefs: next.dietaryPrefs,
        updated_at: new Date().toISOString(),
      });
    });
  }, []);

  const addFridgeItem = useCallback(async (newItem: Omit<FridgeItem, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('fridge_items').insert({
      user_id: user.id,
      name: newItem.name,
      emoji: newItem.emoji,
      category: newItem.category,
    }).select('id').single();
    if (error) { console.error('addFridgeItem error:', error); return; }
    setFridgeState(prev => [...prev, { ...newItem, id: data.id }]);
  }, []);

  const removeFridgeItem = useCallback(async (id: string) => {
    setFridgeState(prev => prev.filter(f => f.id !== id));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('fridge_items').delete().eq('id', id).eq('user_id', user.id);
  }, []);

  const addRecipe = useCallback(async (recipe: Recipe) => {
    setRecipesState(prev => [...prev, recipe]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('recipes').insert({
      id: recipe.id,
      user_id: user.id,
      name: recipe.name,
      name_en: recipe.nameEn ?? null,
      emoji: recipe.emoji,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      time: recipe.time,
      tags: recipe.tags,
      required_ingredients: recipe.requiredIngredients,
      is_ai: recipe.isAI,
      is_public: recipe.isPublic,
      author_name: recipe.authorName ?? null,
      author_email: recipe.authorEmail ?? null,
    });
    if (error) console.error('addRecipe error:', error);
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    setRecipesState(prev => prev.filter(r => r.id !== id));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
  }, []);

  const setProducts = useCallback((next: Product[]) => {
    setProductsState(next);
    const defaultIds = new Set(DEFAULT_PRODUCTS.map(p => p.id));
    const userProducts = next.filter(p => !defaultIds.has(p.id));

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;

      if (userProducts.length === 0) {
        await supabase.from('products').delete().eq('user_id', user.id);
        return;
      }

      const { error: upsertError } = await supabase.from('products').upsert(
        userProducts.map(item => ({
          id: item.id,
          user_id: user.id,
          name: item.name,
          name_en: item.nameEn ?? null,
          category: item.category,
          status: item.status,
          emoji: item.emoji,
        }))
      );
      if (upsertError) { console.error('products upsert error:', upsertError); return; }

      const { error: deleteError } = await supabase.from('products')
        .delete()
        .eq('user_id', user.id)
        .not('id', 'in', `(${userProducts.map(i => i.id).join(',')})`);
      if (deleteError) console.error('products cleanup delete error:', deleteError);
    });
  }, []);

  const addProduct = useCallback(async (newProduct: Omit<Product, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('products').insert({
      user_id: user.id,
      name: newProduct.name,
      name_en: newProduct.nameEn ?? null,
      category: newProduct.category,
      status: newProduct.status,
      emoji: newProduct.emoji,
    }).select('id').single();
    if (error) { console.error('addProduct error:', error); return; }
    setProductsState(prev => [...prev, { ...newProduct, id: data.id }]);
  }, []);

  return { loading, userEmail, profile, setProfile, fridge, addFridgeItem, removeFridgeItem, recipes, addRecipe, removeRecipe, products, setProducts, addProduct };
}
