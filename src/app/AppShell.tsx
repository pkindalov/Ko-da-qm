import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from './layout/Sidebar';
import { BottomNav } from './layout/BottomNav';
import { TweaksPanel } from './layout/TweaksPanel';
import { HomeScreen } from '../features/home/components/HomeScreen';
import { FeedScreen } from '../features/feed/components/FeedScreen';
import { FridgeScreen } from '../features/fridge/components/FridgeScreen';
import { RecipesScreen } from '../features/recipes/components/RecipesScreen';
import { ProductsScreen } from '../features/products/components/ProductsScreen';
import { ProfileScreen } from '../features/profile/components/ProfileScreen';
import { useLocalStorage } from '../shared/hooks/useLocalStorage';
import { useAppData } from '../shared/hooks/useAppData';
import { usePublicRecipes } from '../features/home/hooks/usePublicRecipes';
import { useFavorites } from '../features/recipes/hooks/useFavorites';
import { useRecipeFavoriteCounts } from '../features/userProfile/hooks/useRecipeFavoriteCounts';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { DEFAULT_TWEAKS } from '../shared/constants/defaults';
import { supabase } from '../lib/supabase';
import type { Tab } from '../shared/types';

export function AppShell() {
  const [tab, setTab] = useLocalStorage<Tab>('kdq_tab', 'home');
  const [tweaks, setTweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
  const { loading, userId, userEmail, profile, setProfile, fridge, addFridgeItem, removeFridgeItem, updateFridgeItem, recipes, addRecipe, removeRecipe, updateRecipe, products, setProducts, addProduct } = useAppData(tweaks.lang);
  const { publicRecipes } = usePublicRecipes();
  const { favoriteIds, favoriteRecipes, toggleFavorite } = useFavorites(tweaks.lang);
  const navigate = useNavigate();
  const publicRecipeIds = useMemo(() => publicRecipes.map((r) => r.id), [publicRecipes]);
  const communityFavoriteCounts = useRecipeFavoriteCounts(publicRecipeIds);
  const { notifications, unreadCount, markAsRead, markAllAsRead, markAsUnread, markAllAsUnread, deleteNotification, deleteAllNotifications } = useNotifications(tweaks.lang);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [pendingOpenRecipeId, setPendingOpenRecipeId] = useState<string | null>(null);

  const handleEntityClick = useCallback((entityType: string, entityId: string) => {
    if (entityType === 'recipe') {
      setTab('recipes');
      setPendingOpenRecipeId(entityId);
    }
  }, [setTab]);

  const handleRecipeOpened = useCallback(() => setPendingOpenRecipeId(null), []);

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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(tweaks.lang === 'en' ? 'Failed to log out' : 'Грешка при излизане');
  };

  const screens: Record<Tab, React.ReactNode> = {
    feed: <FeedScreen lang={tweaks.lang} allergies={profile.allergies} dislikes={profile.dislikes} />,
    home: <HomeScreen
      profile={profile}
      recipes={recipes}
      fridge={fridge}
      publicRecipes={publicRecipes}
      favoriteIds={favoriteIds}
      onToggleFavorite={toggleFavorite}
      products={products}
      setTab={setTab}
      lang={tweaks.lang}
      onDeleteFridgeItem={removeFridgeItem}
      onAddFridgeItem={addFridgeItem}
      onEditFridgeItem={updateFridgeItem}
      onRemoveAllergy={(name) => setProfile({ ...profile, allergies: profile.allergies.filter(a => a !== name) })}
      onAddAllergy={(name) => setProfile({ ...profile, allergies: [...profile.allergies, name] })}
      onEditAllergy={(oldName, newName) => setProfile({ ...profile, allergies: profile.allergies.map(a => a === oldName ? newName : a) })}
      onRemoveDislike={(name) => setProfile({ ...profile, dislikes: profile.dislikes.filter(d => d !== name) })}
      onAddDislike={(name) => setProfile({ ...profile, dislikes: [...profile.dislikes, name] })}
      onEditDislike={(oldName, newName) => setProfile({ ...profile, dislikes: profile.dislikes.map(d => d === oldName ? newName : d) })}
      onUpdateProductStatus={(productId, status) => setProducts(products.map(p => p.id === productId ? { ...p, status } : p))}
      communityFavoriteCounts={communityFavoriteCounts}
      onNavigateToUser={(userId) => navigate(`/user/${userId}`)}
    />,
    fridge: <FridgeScreen fridge={fridge} addFridgeItem={addFridgeItem} removeFridgeItem={removeFridgeItem} addRecipe={addRecipe} removeRecipe={removeRecipe} profile={profile} recipes={recipes} products={products} lang={tweaks.lang} />,
    recipes: <RecipesScreen recipes={recipes} addRecipe={addRecipe} removeRecipe={removeRecipe} updateRecipe={updateRecipe} favoriteRecipes={favoriteRecipes} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} products={products} profile={profile} lang={tweaks.lang} userEmail={userEmail} openRecipeId={pendingOpenRecipeId} onRecipeOpened={handleRecipeOpened} />,
    products: <ProductsScreen products={products} setProducts={setProducts} addProduct={addProduct} lang={tweaks.lang} />,
    profile: <ProfileScreen profile={profile} setProfile={setProfile} products={products} lang={tweaks.lang} onLogout={handleLogout} onTweaksToggle={() => setTweaksOpen((o) => !o)} onNavigateToProducts={() => setTab('products')} onViewPublicProfile={userId ? () => navigate(`/user/${userId}`) : undefined} />,
  };

  return (
    <div className={`app-shell ${themeClass}`}>
      <Sidebar tab={tab} setTab={setTab} lang={tweaks.lang} onTweaksToggle={() => setTweaksOpen((o) => !o)} onLogout={handleLogout} notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onMarkAsUnread={markAsUnread} onMarkAllAsUnread={markAllAsUnread} onDeleteNotification={deleteNotification} onDeleteAll={deleteAllNotifications} onEntityClick={handleEntityClick} />
      <main className="main-content">
        <div className="mobile-notif-bar">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onMarkAsUnread={markAsUnread} onMarkAllAsUnread={markAllAsUnread} onDeleteNotification={deleteNotification} onDeleteAll={deleteAllNotifications} onEntityClick={handleEntityClick} lang={tweaks.lang} />
        </div>
        {screens[tab]}
      </main>
      <BottomNav tab={tab} setTab={setTab} lang={tweaks.lang} />
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />
    </div>
  );
}
