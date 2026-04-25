import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_PROFILE, DEFAULT_FRIDGE, DEFAULT_RECIPES, DEFAULT_PRODUCTS } from '../constants/defaults';
import type { Profile, FridgeItem, Recipe, Product } from '../types';

export function useAppData() {
  const [loading, setLoading] = useState(true);
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

    const [profileRes, fridgeRes, recipesRes, productsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('fridge_items').select('*').eq('user_id', user.id),
      supabase.from('recipes').select('*').eq('user_id', user.id),
      supabase.from('products').select('*').eq('user_id', user.id),
    ]);

    // Profile — create row with defaults if this is a new user
    if (profileRes.data) {
      setProfileState({
        name: profileRes.data.name,
        allergies: profileRes.data.allergies ?? [],
        dislikes: profileRes.data.dislikes ?? [],
        dietaryPrefs: profileRes.data.dietary_prefs ?? [],
      });
    } else {
      await supabase.from('profiles').insert({
        id: user.id,
        name: DEFAULT_PROFILE.name,
        allergies: DEFAULT_PROFILE.allergies,
        dislikes: DEFAULT_PROFILE.dislikes,
        dietary_prefs: DEFAULT_PROFILE.dietaryPrefs,
      });
    }

    // Fridge — seed defaults if empty
    if (fridgeRes.data && fridgeRes.data.length > 0) {
      setFridgeState(fridgeRes.data.map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        category: r.category,
      })));
    } else if (fridgeRes.data?.length === 0) {
      setFridgeState(DEFAULT_FRIDGE);
      await supabase.from('fridge_items').insert(
        DEFAULT_FRIDGE.map(item => ({ ...item, user_id: user.id }))
      );
    }

    // Recipes — seed defaults if empty
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
      })));
    } else if (recipesRes.data?.length === 0) {
      setRecipesState(DEFAULT_RECIPES);
      await supabase.from('recipes').insert(
        DEFAULT_RECIPES.map(item => ({
          id: item.id,
          user_id: user.id,
          name: item.name,
          name_en: item.nameEn ?? null,
          emoji: item.emoji,
          ingredients: item.ingredients,
          steps: item.steps,
          time: item.time,
          tags: item.tags,
          required_ingredients: item.requiredIngredients,
          is_ai: item.isAI,
        }))
      );
    }

    // Products — seed defaults if empty
    if (productsRes.data && productsRes.data.length > 0) {
      setProductsState(productsRes.data.map(r => ({
        id: r.id,
        name: r.name,
        nameEn: r.name_en ?? undefined,
        category: r.category,
        status: r.status,
        emoji: r.emoji,
      })));
    } else if (productsRes.data?.length === 0) {
      setProductsState(DEFAULT_PRODUCTS);
      await supabase.from('products').insert(
        DEFAULT_PRODUCTS.map(item => ({
          id: item.id,
          user_id: user.id,
          name: item.name,
          name_en: item.nameEn ?? null,
          category: item.category,
          status: item.status,
          emoji: item.emoji,
        }))
      );
    }

    setLoading(false);
  }

  // Optimistic setters: update state immediately, sync to Supabase in background

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').upsert({
        id: user.id,
        name: next.name,
        allergies: next.allergies,
        dislikes: next.dislikes,
        dietary_prefs: next.dietaryPrefs,
        updated_at: new Date().toISOString(),
      });
    });
  }, []);

  const setFridge = useCallback((next: FridgeItem[]) => {
    setFridgeState(next);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('fridge_items').delete().eq('user_id', user.id).then(() => {
        if (next.length > 0) {
          supabase.from('fridge_items').insert(
            next.map(item => ({ ...item, user_id: user.id }))
          );
        }
      });
    });
  }, []);

  const setRecipes = useCallback((next: Recipe[]) => {
    setRecipesState(next);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('recipes').delete().eq('user_id', user.id).then(() => {
        if (next.length > 0) {
          supabase.from('recipes').insert(
            next.map(item => ({
              id: item.id,
              user_id: user.id,
              name: item.name,
              name_en: item.nameEn ?? null,
              emoji: item.emoji,
              ingredients: item.ingredients,
              steps: item.steps,
              time: item.time,
              tags: item.tags,
              required_ingredients: item.requiredIngredients,
              is_ai: item.isAI,
            }))
          );
        }
      });
    });
  }, []);

  const setProducts = useCallback((next: Product[]) => {
    setProductsState(next);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('products').delete().eq('user_id', user.id).then(() => {
        if (next.length > 0) {
          supabase.from('products').insert(
            next.map(item => ({
              id: item.id,
              user_id: user.id,
              name: item.name,
              name_en: item.nameEn ?? null,
              category: item.category,
              status: item.status,
              emoji: item.emoji,
            }))
          );
        }
      });
    });
  }, []);

  return { loading, profile, setProfile, fridge, setFridge, recipes, setRecipes, products, setProducts };
}
