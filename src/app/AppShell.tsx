import { useState, useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { BottomNav } from './layout/BottomNav';
import { TweaksPanel } from './layout/TweaksPanel';
import { HomeScreen } from '../features/home/components/HomeScreen';
import { FridgeScreen } from '../features/fridge/components/FridgeScreen';
import { RecipesScreen } from '../features/recipes/components/RecipesScreen';
import { ProductsScreen } from '../features/products/components/ProductsScreen';
import { ProfileScreen } from '../features/profile/components/ProfileScreen';
import { useLocalStorage } from '../shared/hooks/useLocalStorage';
import { useAppData } from '../shared/hooks/useAppData';
import { DEFAULT_TWEAKS } from '../shared/constants/defaults';
import { supabase } from '../lib/supabase';
import type { Tab } from '../shared/types';

export function AppShell() {
  const [tab, setTab] = useLocalStorage<Tab>('kdq_tab', 'home');
  const [tweaks, setTweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
  const { loading, profile, setProfile, fridge, setFridge, recipes, setRecipes, products, setProducts, addProduct } = useAppData();
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const themeClass =
    tweaks.theme === 'cool' ? 'theme-cool' : tweaks.theme === 'dark' ? 'theme-dark' : '';

  if (loading) {
    return (
      <div className={`app-shell ${themeClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>{tweaks.lang === 'en' ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  const screens: Record<Tab, React.ReactNode> = {
    home: <HomeScreen profile={profile} recipes={recipes} fridge={fridge} setTab={setTab} lang={tweaks.lang} />,
    fridge: <FridgeScreen fridge={fridge} setFridge={setFridge} profile={profile} recipes={recipes} lang={tweaks.lang} />,
    recipes: <RecipesScreen recipes={recipes} setRecipes={setRecipes} profile={profile} lang={tweaks.lang} />,
    products: <ProductsScreen products={products} setProducts={setProducts} addProduct={addProduct} lang={tweaks.lang} />,
    profile: <ProfileScreen profile={profile} setProfile={setProfile} lang={tweaks.lang} />,
  };

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className={`app-shell ${themeClass}`}>
      <Sidebar tab={tab} setTab={setTab} lang={tweaks.lang} onTweaksToggle={() => setTweaksOpen((o) => !o)} onLogout={handleLogout} />
      <main className="main-content">{screens[tab]}</main>
      <BottomNav tab={tab} setTab={setTab} lang={tweaks.lang} />
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
    </div>
  );
}
