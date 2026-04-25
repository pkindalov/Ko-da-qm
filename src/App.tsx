import { useState, useEffect } from 'react';
import { Sidebar } from './app/layout/Sidebar';
import { BottomNav } from './app/layout/BottomNav';
import { TweaksPanel } from './app/layout/TweaksPanel';
import { HomeScreen } from './features/home/components/HomeScreen';
import { FridgeScreen } from './features/fridge/components/FridgeScreen';
import { RecipesScreen } from './features/recipes/components/RecipesScreen';
import { ProductsScreen } from './features/products/components/ProductsScreen';
import { ProfileScreen } from './features/profile/components/ProfileScreen';
import { useLocalStorage } from './shared/hooks/useLocalStorage';
import { DEFAULT_TWEAKS, DEFAULT_PROFILE, DEFAULT_FRIDGE, DEFAULT_PRODUCTS, DEFAULT_RECIPES } from './shared/constants/defaults';
import type { Tab } from './shared/types';
import './shared/styles/globals.css';

export function App() {
  const [tab, setTab] = useLocalStorage<Tab>('kdq_tab', 'home');
  const [profile, setProfile] = useLocalStorage('kdq_profile', DEFAULT_PROFILE);
  const [fridge, setFridge] = useLocalStorage('kdq_fridge', DEFAULT_FRIDGE);
  const [recipes, setRecipes] = useLocalStorage('kdq_recipes', DEFAULT_RECIPES);
  const [products, setProducts] = useLocalStorage('kdq_products', DEFAULT_PRODUCTS);
  const [tweaks, setTweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
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

  const screens: Record<Tab, React.ReactNode> = {
    home: <HomeScreen profile={profile} recipes={recipes} fridge={fridge} setTab={setTab} lang={tweaks.lang} />,
    fridge: <FridgeScreen fridge={fridge} setFridge={setFridge} profile={profile} recipes={recipes} lang={tweaks.lang} />,
    recipes: <RecipesScreen recipes={recipes} setRecipes={setRecipes} profile={profile} lang={tweaks.lang} />,
    products: <ProductsScreen products={products} setProducts={setProducts} lang={tweaks.lang} />,
    profile: <ProfileScreen profile={profile} setProfile={setProfile} lang={tweaks.lang} />,
  };

  return (
    <div className={`app-shell ${themeClass}`}>
      <Sidebar tab={tab} setTab={setTab} lang={tweaks.lang} onTweaksToggle={() => setTweaksOpen((o) => !o)} />
      <main className="main-content">{screens[tab]}</main>
      <BottomNav tab={tab} setTab={setTab} lang={tweaks.lang} />
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
    </div>
  );
}
