import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from './layout/Sidebar';
import { BottomNav } from './layout/BottomNav';
import { TweaksPanel } from './layout/TweaksPanel';
import { useLocalStorage } from '../shared/hooks/useLocalStorage';
import { useAppData } from '../shared/hooks/useAppData';
import { usePublicRecipes } from '../features/home/hooks/usePublicRecipes';
import { useFavorites } from '../features/recipes/hooks/useFavorites';
import { useRecipeFavoriteCounts } from '../features/userProfile/hooks/useRecipeFavoriteCounts';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useDeleteAccount } from '../features/profile/hooks/useDeleteAccount';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { DEFAULT_TWEAKS } from '../shared/constants/defaults';
import { supabase } from '../lib/supabase';
import type { Tab } from '../shared/types';

const SUBNAV_TABS = new Set<Tab>(['recipes', 'cookbook', 'planner', 'fridge', 'products']);
const VALID_TABS = new Set<string>(['home', 'feed', 'fridge', 'recipes', 'cookbook', 'products', 'profile', 'planner']);

const HomeScreen = lazy(() => import('../features/home/components/HomeScreen').then(m => ({ default: m.HomeScreen })));
const FeedScreen = lazy(() => import('../features/feed/components/FeedScreen').then(m => ({ default: m.FeedScreen })));
const FridgeScreen = lazy(() => import('../features/fridge/components/FridgeScreen').then(m => ({ default: m.FridgeScreen })));
const RecipesScreen = lazy(() => import('../features/recipes/components/RecipesScreen').then(m => ({ default: m.RecipesScreen })));
const ProductsScreen = lazy(() => import('../features/products/components/ProductsScreen').then(m => ({ default: m.ProductsScreen })));
const ProfileScreen = lazy(() => import('../features/profile/components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const CookbookScreen = lazy(() => import('../features/cookbook/components/CookbookScreen').then(m => ({ default: m.CookbookScreen })));
const PlannerScreen = lazy(() => import('../features/planner/components/PlannerScreen').then(m => ({ default: m.PlannerScreen })));

export const AppShell = () => {
  const { tab: tabParam } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const isValidTab = tabParam != null && VALID_TABS.has(tabParam);
  const tab: Tab = (isValidTab ? tabParam : 'home') as Tab;
  const setTab = useCallback((newTab: Tab) => navigate(`/${newTab}`), [navigate]);
  const [tweaks, setTweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
  const { loading, userId, userEmail, profile, setProfile, fridge, addFridgeItem, removeFridgeItem, updateFridgeItem, recipes, addRecipe, removeRecipe, updateRecipe, products, setProducts, addProduct, removeProduct } = useAppData(tweaks.lang);
  const { publicRecipes } = usePublicRecipes({ enabled: tab === 'home', userId });
  const { favoriteIds, favoriteRecipes, toggleFavorite } = useFavorites(tweaks.lang);
  const publicRecipeIds = useMemo(() => publicRecipes.map((recipe) => recipe.id), [publicRecipes]);
  const communityFavoriteCounts = useRecipeFavoriteCounts(publicRecipeIds);
  const { notifications, unreadCount, markAsRead, markAllAsRead, markAsUnread, markAllAsUnread, deleteNotification, deleteAllNotifications } = useNotifications(tweaks.lang);
  const { deleteAccount, isDeleting } = useDeleteAccount(tweaks.lang);
  const [planner, setPlanner] = useLocalStorage<Record<string, Record<string, string>>>('kdq_planner', {});
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
    tweaks.theme === 'cool' ? 'theme-cool' :
    tweaks.theme === 'dark' ? 'theme-dark' : '';

  if (loading) {
    return (
      <div className={`app-shell app-shell-loading ${themeClass}`}>
        <span>{tweaks.lang === 'en' ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  if (!isValidTab) return <Navigate to="/home" replace />;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(tweaks.lang === 'en' ? 'Failed to log out' : 'Грешка при излизане');
  };

  const screens: Record<Tab, React.ReactNode> = {
    feed: <ErrorBoundary><FeedScreen lang={tweaks.lang} allergies={profile.allergies} dislikes={profile.dislikes} /></ErrorBoundary>,
    home: <ErrorBoundary><HomeScreen
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
      onRemoveAllergy={(name) => setProfile({ ...profile, allergies: profile.allergies.filter(allergy => allergy !== name) })}
      onAddAllergy={(name) => setProfile({ ...profile, allergies: [...profile.allergies, name] })}
      onEditAllergy={(oldName, newName) => setProfile({ ...profile, allergies: profile.allergies.map(allergy => allergy === oldName ? newName : allergy) })}
      onRemoveDislike={(name) => setProfile({ ...profile, dislikes: profile.dislikes.filter(dislike => dislike !== name) })}
      onAddDislike={(name) => setProfile({ ...profile, dislikes: [...profile.dislikes, name] })}
      onEditDislike={(oldName, newName) => setProfile({ ...profile, dislikes: profile.dislikes.map(dislike => dislike === oldName ? newName : dislike) })}
      onUpdateProductStatus={(productId, status) => setProducts(products.map(product => product.id === productId ? { ...product, status } : product))}
      communityFavoriteCounts={communityFavoriteCounts}
      onNavigateToUser={(userId) => navigate(`/user/${userId}`)}
    /></ErrorBoundary>,
    fridge: <ErrorBoundary><FridgeScreen fridge={fridge} addFridgeItem={addFridgeItem} removeFridgeItem={removeFridgeItem} removeProduct={removeProduct} addProduct={addProduct} addRecipe={addRecipe} removeRecipe={removeRecipe} updateRecipe={updateRecipe} profile={profile} recipes={recipes} products={products} lang={tweaks.lang} /></ErrorBoundary>,
    recipes: <ErrorBoundary><RecipesScreen recipes={recipes} addRecipe={addRecipe} removeRecipe={removeRecipe} updateRecipe={updateRecipe} favoriteRecipes={favoriteRecipes} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} products={products} profile={profile} lang={tweaks.lang} userEmail={userEmail} fridge={fridge} openRecipeId={pendingOpenRecipeId} onRecipeOpened={handleRecipeOpened} /></ErrorBoundary>,
    cookbook: <ErrorBoundary><CookbookScreen recipes={recipes} favoriteIds={favoriteIds} profile={profile} lang={tweaks.lang} /></ErrorBoundary>,
    products: <ErrorBoundary><ProductsScreen products={products} setProducts={setProducts} addProduct={addProduct} lang={tweaks.lang} /></ErrorBoundary>,
    profile: <ErrorBoundary><ProfileScreen profile={profile} setProfile={setProfile} products={products} lang={tweaks.lang} onLogout={handleLogout} onDeleteAccount={deleteAccount} isDeleting={isDeleting} onTweaksToggle={() => setTweaksOpen((o) => !o)} onNavigateToProducts={() => setTab('products')} onViewPublicProfile={userId ? () => navigate(`/user/${userId}`) : undefined} /></ErrorBoundary>,
    planner: <ErrorBoundary><PlannerScreen recipes={recipes} fridge={fridge} profile={profile} lang={tweaks.lang} planner={planner} setPlanner={setPlanner} onViewRecipe={(id) => { setTab('recipes'); setPendingOpenRecipeId(id); }} /></ErrorBoundary>,
  };

  return (
    <div className={`app-shell ${themeClass}`}>
      <Sidebar tab={tab} setTab={setTab} lang={tweaks.lang} profile={profile} tweaksOpen={tweaksOpen} onTweaksToggle={() => setTweaksOpen((o) => !o)} onLangToggle={() => setTweaks({ ...tweaks, lang: tweaks.lang === 'bg' ? 'en' : 'bg' })} onLogout={handleLogout} onUserClick={userId ? () => navigate(`/user/${userId}`) : undefined} notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onMarkAsUnread={markAsUnread} onMarkAllAsUnread={markAllAsUnread} onDeleteNotification={deleteNotification} onDeleteAll={deleteAllNotifications} onEntityClick={handleEntityClick} />
      <main className={`main-content${SUBNAV_TABS.has(tab) ? ' main-has-subnav' : ''}`}>
        <div className="mobile-notif-bar">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead} onMarkAsUnread={markAsUnread} onMarkAllAsUnread={markAllAsUnread} onDeleteNotification={deleteNotification} onDeleteAll={deleteAllNotifications} onEntityClick={handleEntityClick} lang={tweaks.lang} />
        </div>
        <Suspense fallback={null}>{screens[tab]}</Suspense>
      </main>
      <BottomNav tab={tab} setTab={setTab} lang={tweaks.lang} />
      <TweaksPanel open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />
    </div>
  );
}
