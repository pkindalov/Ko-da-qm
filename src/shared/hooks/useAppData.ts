import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { DEFAULT_PROFILE, DEFAULT_FRIDGE, DEFAULT_RECIPES, DEFAULT_PRODUCTS } from '../constants/defaults';
import type { Profile, FridgeItem, Recipe, Product, Language } from '../types';

export const useAppData = (lang: Language = 'bg') => {
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const translate = (bg: string, en: string) => langRef.current === 'en' ? en : bg;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [fridge, setFridgeState] = useState<FridgeItem[]>(DEFAULT_FRIDGE);
  const [recipes, setRecipesState] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [products, setProductsState] = useState<Product[]>(DEFAULT_PRODUCTS);

  const loadAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    setUserEmail(user.email ?? '');

    const [profileRes, fridgeRes, recipesRes, productsRes] = await Promise.all([
      supabase.from('users').select('name, allergies, dislikes, dietary_prefs, disabled_at').eq('id', user.id).single(),
      supabase.from('fridge_items').select('id, name, emoji, category').eq('user_id', user.id),
      supabase.from('recipes').select('id, user_id, name, name_en, name_translated, source_lang, emoji, image_url, ingredients, steps, ingredients_translated, steps_translated, time, tags, difficulty, required_ingredients, is_ai, is_public, author_name, author_email').eq('user_id', user.id),
      supabase.from('products').select('id, name, name_en, category, status, emoji').eq('user_id', user.id),
    ]);

    if (profileRes.data) {
      if (profileRes.data.disabled_at) {
        await supabase.from('users').update({ disabled_at: null }).eq('id', user.id);
      }
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
      setFridgeState(fridgeRes.data.map(fridgeRow => ({
        id: fridgeRow.id,
        name: fridgeRow.name,
        emoji: fridgeRow.emoji,
        category: fridgeRow.category,
      })));
    }

    if (recipesRes.data && recipesRes.data.length > 0) {
      setRecipesState(recipesRes.data.map(recipeRow => ({
        id: recipeRow.id,
        name: recipeRow.name,
        nameEn: recipeRow.name_en ?? undefined,
        nameTranslated: recipeRow.name_translated ?? undefined,
        sourceLang: recipeRow.source_lang ?? undefined,
        emoji: recipeRow.emoji,
        imageUrl: recipeRow.image_url ?? undefined,
        ingredients: recipeRow.ingredients ?? [],
        steps: recipeRow.steps ?? [],
        ingredientsTranslated: recipeRow.ingredients_translated?.length ? recipeRow.ingredients_translated : undefined,
        stepsTranslated: recipeRow.steps_translated?.length ? recipeRow.steps_translated : undefined,
        time: recipeRow.time,
        tags: recipeRow.tags ?? [],
        difficulty: recipeRow.difficulty ?? undefined,
        requiredIngredients: recipeRow.required_ingredients ?? [],
        isAI: recipeRow.is_ai,
        isPublic: recipeRow.is_public ?? false,
        authorId: recipeRow.user_id ?? undefined,
        authorName: recipeRow.author_name ?? undefined,
        authorEmail: recipeRow.author_email ?? undefined,
      })));
    }

    if (productsRes.data && productsRes.data.length > 0) {
      const dbProducts = productsRes.data.map(productRow => ({
        id: productRow.id,
        name: productRow.name,
        nameEn: productRow.name_en ?? undefined,
        category: productRow.category,
        status: productRow.status,
        emoji: productRow.emoji,
      }));
      setProductsState([...DEFAULT_PRODUCTS, ...dbProducts]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const setProfile = useCallback(async (next: Profile) => {
    setProfileState(next);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: next.name,
      allergies: next.allergies,
      dislikes: next.dislikes,
      dietary_prefs: next.dietaryPrefs,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('setProfile error:', error);
      toast.error(translate('Грешка при запазване на профила', 'Failed to save profile'));
    }
  }, []);

  const addFridgeItem = useCallback(async (newItem: Omit<FridgeItem, 'id'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('fridge_items').insert({
      user_id: user.id,
      name: newItem.name,
      emoji: newItem.emoji,
      category: newItem.category,
    }).select('id').single();
    if (error) {
      console.error('addFridgeItem error:', error);
      toast.error(translate('Грешка при добавяне в хладилника', 'Failed to add item'));
      return;
    }
    setFridgeState(prev => [...prev, { ...newItem, id: data.id }]);
    toast.success(translate('Добавен в хладилника', 'Added to fridge'));
  }, []);

  const removeFridgeItem = useCallback(async (id: string) => {
    setFridgeState(prev => prev.filter(fridgeItem => fridgeItem.id !== id));
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    await supabase.from('fridge_items').delete().eq('id', id).eq('user_id', user.id);
  }, []);

  const updateFridgeItem = useCallback(async (item: FridgeItem) => {
    setFridgeState(prev => prev.map(fridgeItem => fridgeItem.id === item.id ? item : fridgeItem));
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { error } = await supabase.from('fridge_items')
      .update({ name: item.name, emoji: item.emoji, category: item.category })
      .eq('id', item.id)
      .eq('user_id', user.id);
    if (error) {
      console.error('updateFridgeItem error:', error);
      toast.error(translate('Грешка при обновяване', 'Failed to update item'));
    }
  }, []);

  const addRecipe = useCallback(async (recipe: Recipe) => {
    setRecipesState(prev => [...prev, recipe]);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { error } = await supabase.from('recipes').insert({
      id: recipe.id,
      user_id: user.id,
      name: recipe.name,
      name_en: recipe.nameEn ?? null,
      name_translated: recipe.nameTranslated ?? null,
      source_lang: recipe.sourceLang ?? null,
      emoji: recipe.emoji,
      image_url: recipe.imageUrl ?? null,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      ingredients_translated: recipe.ingredientsTranslated ?? [],
      steps_translated: recipe.stepsTranslated ?? [],
      time: recipe.time,
      tags: recipe.tags,
      difficulty: recipe.difficulty ?? null,
      required_ingredients: recipe.requiredIngredients,
      is_ai: recipe.isAI,
      is_public: recipe.isPublic,
      author_name: recipe.authorName ?? null,
      author_email: recipe.authorEmail ?? null,
    });
    if (error) {
      console.error('addRecipe error:', error);
      toast.error(translate('Грешка при запазване на рецептата', 'Failed to save recipe'));
    }
  }, []);

  const removeRecipe = useCallback(async (id: string) => {
    setRecipesState(prev => prev.filter(existingRecipe => existingRecipe.id !== id));
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    await supabase.from('recipes').delete().eq('id', id).eq('user_id', user.id);
  }, []);

  const updateRecipe = useCallback(async (recipe: Recipe) => {
    setRecipesState(prev => prev.map(existingRecipe => existingRecipe.id === recipe.id ? recipe : existingRecipe));
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { error } = await supabase.from('recipes')
      .update({
        name: recipe.name,
        name_en: recipe.nameEn ?? null,
        name_translated: recipe.nameTranslated ?? null,
        source_lang: recipe.sourceLang ?? null,
        emoji: recipe.emoji,
        image_url: recipe.imageUrl ?? null,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        ingredients_translated: recipe.ingredientsTranslated ?? [],
        steps_translated: recipe.stepsTranslated ?? [],
        time: recipe.time,
        tags: recipe.tags,
        difficulty: recipe.difficulty ?? null,
        required_ingredients: recipe.requiredIngredients,
        is_ai: recipe.isAI,
        is_public: recipe.isPublic,
        author_name: recipe.authorName ?? null,
        author_email: recipe.authorEmail ?? null,
      })
      .eq('id', recipe.id)
      .eq('user_id', user.id);
    if (error) {
      console.error('updateRecipe error:', error);
      toast.error(translate('Грешка при обновяване на рецептата', 'Failed to update recipe'));
    }
  }, []);

  const setProducts = useCallback((next: Product[]) => {
    setProductsState(next);
    const defaultIds = new Set(DEFAULT_PRODUCTS.map(product => product.id));
    const userProducts = next.filter(product => !defaultIds.has(product.id));

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
        .not('id', 'in', `(${userProducts.map(product => product.id).join(',')})`);
      if (deleteError) console.error('products cleanup delete error:', deleteError);
    });
  }, []);

  const addProduct = useCallback(async (newProduct: Omit<Product, 'id'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('products').insert({
      user_id: user.id,
      name: newProduct.name,
      name_en: newProduct.nameEn ?? null,
      category: newProduct.category,
      status: newProduct.status,
      emoji: newProduct.emoji,
    }).select('id').single();
    if (error) {
      console.error('addProduct error:', error);
      toast.error(translate('Грешка при добавяне на продукт', 'Failed to add product'));
      return;
    }
    setProductsState(prev => [...prev, { ...newProduct, id: data.id }]);
    toast.success(translate('Продуктът е добавен', 'Product added'));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(products.filter(product => product.id !== id));
  }, [products, setProducts]);

  return { loading, userId, userEmail, profile, setProfile, fridge, addFridgeItem, removeFridgeItem, updateFridgeItem, recipes, addRecipe, removeRecipe, updateRecipe, products, setProducts, addProduct, removeProduct };
}
