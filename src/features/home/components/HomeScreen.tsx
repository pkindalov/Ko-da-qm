import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import './HomeScreen.css';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { isSafe, recipeRisk } from '../../../shared/utils/recipeUtils';
import { recipeDisplayName, localizeMealTag } from '../../../shared/utils/recipeDisplayName';
import { getGreeting } from '../../../shared/utils/greeting';
import type { Profile, Recipe, FridgeItem, Language, Tab, Product, ProductStatus } from '../../../shared/types';

const FRIDGE_MODAL_EMOJIS = ['🥚', '🧀', '🍞', '🧈', '🥛', '🍚', '🍗', '🥔', '🍎', '🍅', '🥕', '🥦', '🧅', '🫙', '📦'];

interface HomeScreenProps {
  profile: Profile;
  recipes: Recipe[];
  fridge: FridgeItem[];
  publicRecipes: Recipe[];
  favoriteIds: string[];
  onToggleFavorite: (recipe: Recipe) => void;
  products: Product[];
  setTab: (tab: Tab) => void;
  lang: Language;
  onDeleteFridgeItem: (id: string) => void;
  onAddFridgeItem: (item: Omit<FridgeItem, 'id'>) => void;
  onEditFridgeItem: (item: FridgeItem) => void;
  onRemoveAllergy: (name: string) => void;
  onAddAllergy: (name: string) => void;
  onEditAllergy: (oldName: string, newName: string) => void;
  onRemoveDislike: (name: string) => void;
  onAddDislike: (name: string) => void;
  onEditDislike: (oldName: string, newName: string) => void;
  onUpdateProductStatus: (productId: string, status: ProductStatus) => void;
  communityFavoriteCounts?: Record<string, number>;
  onNavigateToUser?: (userId: string) => void;
  onEditRecipe?: (recipe: Recipe) => void;
  onDeleteRecipe?: (id: string) => void;
}

const RECIPES_PREVIEW_SIZE = 4;
const COMMUNITY_PAGE_SIZE = 4;

export const HomeScreen = ({ profile, recipes, fridge, publicRecipes, favoriteIds, onToggleFavorite, products, setTab, lang, onDeleteFridgeItem, onAddFridgeItem, onEditFridgeItem, onRemoveAllergy, onAddAllergy, onEditAllergy, onRemoveDislike, onAddDislike, onEditDislike, onUpdateProductStatus, communityFavoriteCounts = {}, onNavigateToUser, onEditRecipe, onDeleteRecipe }: HomeScreenProps) => {
  const isEnglish = lang === 'en';
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedSafeRecipe, setSelectedSafeRecipe] = useState<Recipe | null>(null);
  const [communityPage, setCommunityPage] = useState(1);
  const [openStatModal, setOpenStatModal] = useState<'safeRecipes' | 'fridge' | 'allergies' | 'dislikes' | null>(null);
  const [fridgeFormMode, setFridgeFormMode] = useState<'add' | 'edit' | null>(null);
  const [fridgeFormItem, setFridgeFormItem] = useState<FridgeItem | null>(null);
  const [fridgeFormName, setFridgeFormName] = useState('');
  const [fridgeFormEmoji, setFridgeFormEmoji] = useState('📦');

  const [allergyFormMode, setAllergyFormMode] = useState<'add' | 'edit' | null>(null);
  const [allergyFormOriginal, setAllergyFormOriginal] = useState('');
  const [allergyFormValue, setAllergyFormValue] = useState('');

  const [dislikeFormMode, setDislikeFormMode] = useState<'add' | 'edit' | null>(null);
  const [dislikeFormOriginal, setDislikeFormOriginal] = useState('');
  const [dislikeFormValue, setDislikeFormValue] = useState('');
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);

  const [pendingDeleteFridgeId, setPendingDeleteFridgeId] = useState<string | null>(null);
  const [pendingDeleteAllergyName, setPendingDeleteAllergyName] = useState<string | null>(null);
  const [pendingDeleteDislikeName, setPendingDeleteDislikeName] = useState<string | null>(null);

  const openAddForm = () => {
    setFridgeFormMode('add');
    setFridgeFormItem(null);
    setFridgeFormName('');
    setFridgeFormEmoji('📦');
  };

  const openEditForm = (item: FridgeItem) => {
    setFridgeFormMode('edit');
    setFridgeFormItem(item);
    setFridgeFormName(item.name);
    setFridgeFormEmoji(item.emoji);
  };

  const closeFridgeForm = () => {
    setFridgeFormMode(null);
    setFridgeFormItem(null);
    setFridgeFormName('');
    setFridgeFormEmoji('📦');
  };

  const submitFridgeForm = () => {
    if (!fridgeFormName.trim()) return;
    if (fridgeFormMode === 'add') {
      onAddFridgeItem({ name: fridgeFormName.trim(), emoji: fridgeFormEmoji, category: 'other' });
    } else if (fridgeFormMode === 'edit' && fridgeFormItem) {
      onEditFridgeItem({ ...fridgeFormItem, name: fridgeFormName.trim(), emoji: fridgeFormEmoji });
    }
    closeFridgeForm();
  };

  const openAddAllergyForm = () => {
    setAllergyFormMode('add');
    setAllergyFormOriginal('');
    setAllergyFormValue('');
  };

  const openEditAllergyForm = (name: string) => {
    setAllergyFormMode('edit');
    setAllergyFormOriginal(name);
    setAllergyFormValue(name);
  };

  const closeAllergyForm = () => {
    setAllergyFormMode(null);
    setAllergyFormOriginal('');
    setAllergyFormValue('');
  };

  const submitAllergyForm = () => {
    if (!allergyFormValue.trim()) return;
    if (!allergyFormMode) return;
    const newName = allergyFormValue.trim();

    if (allergyFormMode === 'add') {
      onAddAllergy(newName);
      closeAllergyForm();
      return;
    }

    const oldName = allergyFormOriginal;
    const contributingProducts = products.filter(
      product => product.status === 'allergic' && (product.name === oldName || product.nameEn === oldName)
    );

    if (profile.allergies.includes(oldName)) {
      onEditAllergy(oldName, newName);
    } else {
      onAddAllergy(newName);
    }

    contributingProducts.forEach(product => onUpdateProductStatus(product.id, 'liked'));
    closeAllergyForm();
  };

  const handleDeleteAllergy = (name: string) => {
    onRemoveAllergy(name);
    products
      .filter(product => product.status === 'allergic' && (product.name === name || product.nameEn === name))
      .forEach(product => onUpdateProductStatus(product.id, 'liked'));
  };

  const openAddDislikeForm = () => {
    setDislikeFormMode('add');
    setDislikeFormOriginal('');
    setDislikeFormValue('');
  };

  const openEditDislikeForm = (name: string) => {
    setDislikeFormMode('edit');
    setDislikeFormOriginal(name);
    setDislikeFormValue(name);
  };

  const closeDislikeForm = () => {
    setDislikeFormMode(null);
    setDislikeFormOriginal('');
    setDislikeFormValue('');
  };

  const submitDislikeForm = () => {
    if (!dislikeFormValue.trim()) return;
    if (!dislikeFormMode) return;
    const newName = dislikeFormValue.trim();

    if (dislikeFormMode === 'add') {
      onAddDislike(newName);
      closeDislikeForm();
      return;
    }

    const oldName = dislikeFormOriginal;
    const contributingProducts = products.filter(
      product => product.status === 'disliked' && (product.name === oldName || product.nameEn === oldName)
    );

    if (profile.dislikes.includes(oldName)) {
      onEditDislike(oldName, newName);
    } else {
      onAddDislike(newName);
    }

    contributingProducts.forEach(product => onUpdateProductStatus(product.id, 'liked'));
    closeDislikeForm();
  };

  const handleDeleteDislike = (name: string) => {
    onRemoveDislike(name);
    products
      .filter(product => product.status === 'disliked' && (product.name === name || product.nameEn === name))
      .forEach(product => onUpdateProductStatus(product.id, 'liked'));
  };

  const toNames = (list: Product[]) => list.flatMap(product => product.nameEn ? [product.name, product.nameEn] : [product.name]);
  const allergies = [...new Set([...profile.allergies, ...toNames(products.filter(product => product.status === 'allergic'))])];
  const dislikes  = [...new Set([...profile.dislikes,  ...toNames(products.filter(product => product.status === 'disliked'))])];
  const blocked   = [...allergies, ...dislikes];
  const safeRecipes = recipes.filter((recipe) => isSafe(recipe, blocked));
  const greeting = getGreeting(new Date().getHours(), lang);

  const today = new Date().toLocaleDateString(isEnglish ? 'en-GB' : 'bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fade-in">
      {/* Topbar */}
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Today' : 'Днес'}</span>
        </div>
        <div className="topbar-actions">
          <div className="topbar-date">{today}</div>
        </div>
      </div>

      {/* Hero */}
      <section className="hero-grid">
        <div>
          <div className="eyebrow">
            {greeting}{profile.name ? `, ${profile.name}` : ''}
          </div>
          <h1 className="h-display">
            {isEnglish ? 'What can we ' : 'Какво да '}
            <span className="it">{isEnglish ? 'cook' : 'сготвим'}</span>
            <br />{isEnglish ? 'today?' : 'днес?'}
          </h1>
          <p className="h-sub">
            {isEnglish
              ? 'A quiet cookbook that already knows what you cannot eat. Pick something safe, or stretch a little.'
              : 'Тиха готварска книга, която вече знае какво не можеш да ядеш. Избери нещо безопасно — или излез от зоната.'}
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => setTab('recipes')}>
              {isEnglish ? 'Browse recipes' : 'Към рецептите'} <span className="dim">→</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setTab('profile')}>
              {isEnglish ? 'Edit restrictions' : 'Промени ограниченията'}
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-card" onClick={() => setOpenStatModal('safeRecipes')}>
            <div className="hero-stat-num italic clay">{safeRecipes.length}</div>
            <div className="hero-stat-label">{isEnglish ? 'safe recipes' : 'безопасни рецепти'}</div>
          </div>
          <div className="hero-stat-card" onClick={() => setOpenStatModal('allergies')}>
            <div className="hero-stat-num italic rust">{allergies.length}</div>
            <div className="hero-stat-label">{isEnglish ? 'allergies' : 'алергии'}</div>
          </div>
          <div className="hero-stat-card" onClick={() => setOpenStatModal('dislikes')}>
            <div className="hero-stat-num italic amber">{dislikes.length}</div>
            <div className="hero-stat-label">{isEnglish ? 'dislikes' : 'нелюбими'}</div>
          </div>
          <div className="hero-stat-card" onClick={() => setOpenStatModal('fridge')}>
            <div className="hero-stat-num italic moss">{fridge.length}</div>
            <div className="hero-stat-label">{isEnglish ? 'in your fridge' : 'в хладилника'}</div>
          </div>
        </div>
      </section>

      {/* Alert banner */}
      {allergies.length > 0 && (
        <div className="alert-banner">
          <span className="dot dot-danger" />
          <div className="alert-banner-text">
            <strong>{isEnglish ? 'Active allergies' : 'Активни алергии'}.</strong>{' '}
            {isEnglish ? 'These ingredients are always flagged.' : 'Тези съставки винаги се маркират.'}
          </div>
          <div className="alert-banner-tags">
            {allergies.map((allergy) => <Badge type="allergy" key={allergy}>{allergy}</Badge>)}
          </div>
        </div>
      )}

      {/* Safe recipes section */}
      <div className="section-eyebrow">
        <span className="label">{isEnglish ? 'Quiet ideas — safe for you' : 'Тихи идеи — безопасни за теб'}</span>
        <span className="label">{safeRecipes.length} {isEnglish ? 'matches' : 'броя'}</span>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          icon="😔"
          title={isEnglish ? 'No recipes yet' : 'Все още няма рецепти'}
          subtitle={isEnglish ? 'Add recipes or update your restrictions' : 'Добави рецепти или промени ограниченията си'}
        />
      ) : (
        <div className="grid-3">
          {recipes.slice(0, RECIPES_PREVIEW_SIZE).map((recipe) => {
            const risk = recipeRisk(recipe, allergies, dislikes);
            const name = recipeDisplayName(recipe, lang);
            const tag = localizeMealTag(recipe.tags?.[0], isEnglish, isEnglish ? 'recipe' : 'рецепта');
            return (
              <div key={recipe.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setSelectedSafeRecipe(recipe)}>
                <div className="recipe-image">
                  <div className="recipe-image-stripes" />
                  {(recipe.imageUrls?.[0] ?? recipe.imageUrl)
                    ? <img src={recipe.imageUrls?.[0] ?? recipe.imageUrl} alt={name} className="recipe-card-img" />
                    : <div className="recipe-image-emoji">{recipe.emoji}</div>}
                  <div className="recipe-image-label">{tag} · {recipe.time} {isEnglish ? 'min' : 'мин'}</div>
                </div>
                <div className="recipe-body">
                  <div className="recipe-name italic">{name}</div>
                  <div className="recipe-meta">⏱ {recipe.time} {isEnglish ? 'min' : 'мин'}</div>
                  <div className="recipe-tags">
                    {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {isEnglish ? 'safe' : 'безопасно'}</Badge>}
                    {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {isEnglish ? 'check' : 'провери'}</Badge>}
                    {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {isEnglish ? 'allergy' : 'алергия'}</Badge>}
                  </div>
                  {(onEditRecipe || onDeleteRecipe) && (
                    <div className="recipe-card-actions">
                      {onEditRecipe && (
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onEditRecipe(recipe); }}>
                          ✏ {isEnglish ? 'Edit' : 'Редактирай'}
                        </button>
                      )}
                      {onDeleteRecipe && (
                        <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setPendingDeleteRecipeId(recipe.id); }}>
                          🗑 {isEnglish ? 'Delete' : 'Изтрий'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Community recipes */}
      {publicRecipes.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-eyebrow">
            <span className="label">{isEnglish ? 'From the community' : 'От общността'}</span>
            <span className="label">{publicRecipes.length} {isEnglish ? 'recipes' : 'рецепти'}</span>
          </div>
          <div className="grid-3">
            {publicRecipes.slice(0, communityPage * COMMUNITY_PAGE_SIZE).map((recipe) => {
              const risk = recipeRisk(recipe, allergies, dislikes);
              const name = recipeDisplayName(recipe, lang);
              const tag = localizeMealTag(recipe.tags?.[0], isEnglish, isEnglish ? 'recipe' : 'рецепта');
              return (
                <div key={recipe.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setSelectedRecipe(recipe)}>
                  <div className="recipe-image">
                    <div className="recipe-image-stripes" />
                    {(recipe.imageUrls?.[0] ?? recipe.imageUrl)
                      ? <img src={recipe.imageUrls?.[0] ?? recipe.imageUrl} alt={name} className="recipe-card-img" />
                      : <div className="recipe-image-emoji">{recipe.emoji}</div>}
                    <div className="recipe-image-label">{tag} · {recipe.time} {isEnglish ? 'min' : 'мин'}</div>
                    <button
                      className="btn-favorite"
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
                      aria-label={favoriteIds.includes(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favoriteIds.includes(recipe.id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className="recipe-body">
                    <div className="recipe-name italic">{name}</div>
                    <div className="recipe-meta">⏱ {recipe.time} {isEnglish ? 'min' : 'мин'}</div>
                    {communityFavoriteCounts[recipe.id] > 0 && (
                      <div className="recipe-meta">♥ {communityFavoriteCounts[recipe.id]}</div>
                    )}
                    {recipe.authorName && recipe.authorId && onNavigateToUser && (
                      <button
                        className="recipe-author-btn"
                        onClick={(e) => { e.stopPropagation(); onNavigateToUser(recipe.authorId!); }}
                      >
                        👤 {recipe.authorName}
                      </button>
                    )}
                    {recipe.authorName && (!recipe.authorId || !onNavigateToUser) && (
                      <div className="recipe-meta">👤 {recipe.authorName}</div>
                    )}
                    <div className="recipe-tags">
                      {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {isEnglish ? 'safe' : 'безопасно'}</Badge>}
                      {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {isEnglish ? 'check' : 'провери'}</Badge>}
                      {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {isEnglish ? 'allergy' : 'алергия'}</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {publicRecipes.length > communityPage * COMMUNITY_PAGE_SIZE && (
            <button className="btn btn-ghost btn-full mt-4" onClick={() => setCommunityPage(p => p + 1)}>
              {isEnglish ? `Show more (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} left)` : `Покажи още (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} остават)`}
            </button>
          )}
        </>
      )}

      <Modal
        open={openStatModal === 'safeRecipes'}
        onClose={() => setOpenStatModal(null)}
        title={isEnglish ? `Safe Recipes (${safeRecipes.length})` : `Безопасни рецепти (${safeRecipes.length})`}
        contentClassName="modal-sm"
      >
        {safeRecipes.length === 0 ? (
          <p className="modal-hint">
            {isEnglish ? 'No safe recipes yet.' : 'Все още няма безопасни рецепти.'}
          </p>
        ) : (
          <div className="modal-list">
            {safeRecipes.map(recipe => {
              const recipeName = recipeDisplayName(recipe, lang);
              return (
                <button
                  key={recipe.id}
                  type="button"
                  className="modal-list-btn"
                  onClick={() => { setOpenStatModal(null); setSelectedSafeRecipe(recipe); }}
                  aria-label={recipeName}
                >
                  <span className="emoji-sm">{recipe.emoji}</span>
                  <span className="item-name">{recipeName}</span>
                  <span className="item-time">⏱ {recipe.time} {isEnglish ? 'min' : 'мин'}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('recipes'); }}
          >
            {isEnglish ? 'Go to Recipes →' : 'Към рецепти →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'fridge'}
        onClose={() => { setOpenStatModal(null); closeFridgeForm(); }}
        title={isEnglish ? `Fridge (${fridge.length})` : `Хладилник (${fridge.length})`}
        contentClassName="modal-sm"
      >
        <div className="modal-mb">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddForm}
          >
            + {isEnglish ? 'Add item' : 'Добави'}
          </button>
        </div>
        {fridge.length === 0 ? (
          <p className="modal-hint">
            {isEnglish ? 'Your fridge is empty.' : 'Хладилникът е празен.'}
          </p>
        ) : (
          <div className="modal-list-fridge">
            {fridge.map(item => (
              <div key={item.id} className="modal-list-row">
                <span className="emoji-sm">{item.emoji}</span>
                <span className="item-name">{item.name}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => openEditForm(item)}
                  aria-label={`${isEnglish ? 'Edit' : 'Редактирай'} ${item.name}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => setPendingDeleteFridgeId(item.id)}
                  aria-label={`${isEnglish ? 'Remove' : 'Премахни'} ${item.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {fridgeFormMode !== null && (
          <div className="modal-section">
            <div className="modal-section-hd">
              <label className="input-label">{isEnglish ? 'Product name' : 'Продукт'}</label>
              <input
                className="input-field"
                value={fridgeFormName}
                onChange={(e) => setFridgeFormName(e.target.value)}
                placeholder={isEnglish ? 'e.g. Tomatoes' : 'напр. Домати'}
                onKeyDown={(e) => e.key === 'Enter' && submitFridgeForm()}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="input-label">{isEnglish ? 'Pick an emoji' : 'Избери емоджи'}</label>
              <div className="chip-group">
                {FRIDGE_MODAL_EMOJIS.map((emoji) => (
                  <span
                    key={emoji}
                    className={`chip chip-emoji${fridgeFormEmoji === emoji ? ' selected' : ''}`}
                    onClick={() => setFridgeFormEmoji(emoji)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <div className="emoji-row">
                <span className="emoji-row-label">
                  {isEnglish ? 'or type your own:' : 'или въведи свое:'}
                </span>
                <input
                  className="input-field input-emoji"
                  value={fridgeFormEmoji}
                  onChange={(e) => setFridgeFormEmoji(e.target.value)}
                  aria-label={isEnglish ? 'Custom emoji' : 'Персонален емоджи'}
                />
              </div>
            </div>
            <div className="row-sm">
              <button
                type="button"
                className="btn btn-primary btn-sm flex-1"
                onClick={submitFridgeForm}
              >
                {isEnglish ? 'Save' : 'Запази'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeFridgeForm}
              >
                {isEnglish ? 'Cancel' : 'Отказ'}
              </button>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('fridge'); }}
          >
            {isEnglish ? 'Go to Fridge →' : 'Към хладилника →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'allergies'}
        onClose={() => { setOpenStatModal(null); closeAllergyForm(); }}
        title={isEnglish ? `Allergies (${allergies.length})` : `Алергии (${allergies.length})`}
        contentClassName="modal-sm"
      >
        <div className="modal-mb">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddAllergyForm}
          >
            + {isEnglish ? 'Add allergy' : 'Добави алергия'}
          </button>
        </div>
        {allergies.length === 0 ? (
          <p className="modal-hint">
            {isEnglish ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        ) : (
          <div className="tag-list">
            {allergies.map(a => (
              <span key={a} className="badge badge-allergy">
                {a}
                <button
                  type="button"
                  className="badge-btn"
                  onClick={() => openEditAllergyForm(a)}
                  aria-label={`${isEnglish ? 'Edit allergy' : 'Редактирай алергия'} ${a}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="badge-btn"
                  onClick={() => setPendingDeleteAllergyName(a)}
                  aria-label={`${isEnglish ? 'Remove allergy' : 'Премахни алергия'} ${a}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {allergyFormMode !== null && (
          <div className="modal-section">
            <div className="modal-section-hd">
              <label className="input-label">{isEnglish ? 'Allergy name' : 'Алергия'}</label>
              <input
                className="input-field"
                value={allergyFormValue}
                onChange={(e) => setAllergyFormValue(e.target.value)}
                placeholder={isEnglish ? 'e.g. Peanuts' : 'напр. Фъстъци'}
                onKeyDown={(e) => e.key === 'Enter' && submitAllergyForm()}
                autoFocus
              />
            </div>
            <div className="row-sm">
              <button
                type="button"
                className="btn btn-primary btn-sm flex-1"
                onClick={submitAllergyForm}
              >
                {isEnglish ? 'Save' : 'Запази'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeAllergyForm}
              >
                {isEnglish ? 'Cancel' : 'Отказ'}
              </button>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('products'); }}
          >
            {isEnglish ? 'Go to Products →' : 'Към продукти →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'dislikes'}
        onClose={() => { setOpenStatModal(null); closeDislikeForm(); }}
        title={isEnglish ? `Dislikes (${dislikes.length})` : `Нелюбими (${dislikes.length})`}
        contentClassName="modal-sm"
      >
        <div className="modal-mb">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddDislikeForm}
          >
            + {isEnglish ? 'Add dislike' : 'Добави нелюбима'}
          </button>
        </div>
        {dislikes.length === 0 ? (
          <p className="modal-hint">
            {isEnglish ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        ) : (
          <div className="tag-list">
            {dislikes.map(d => (
              <span key={d} className="badge badge-dislike">
                {d}
                <button
                  type="button"
                  className="badge-btn"
                  onClick={() => openEditDislikeForm(d)}
                  aria-label={`${isEnglish ? 'Edit dislike' : 'Редактирай нелюбима'} ${d}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="badge-btn"
                  onClick={() => setPendingDeleteDislikeName(d)}
                  aria-label={`${isEnglish ? 'Remove dislike' : 'Премахни нелюбима'} ${d}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {dislikeFormMode !== null && (
          <div className="modal-section">
            <div className="modal-section-hd">
              <label className="input-label">{isEnglish ? 'Dislike name' : 'Нелюбима'}</label>
              <input
                className="input-field"
                value={dislikeFormValue}
                onChange={(e) => setDislikeFormValue(e.target.value)}
                placeholder={isEnglish ? 'e.g. Mushrooms' : 'напр. Гъби'}
                onKeyDown={(e) => e.key === 'Enter' && submitDislikeForm()}
                autoFocus
              />
            </div>
            <div className="row-sm">
              <button
                type="button"
                className="btn btn-primary btn-sm flex-1"
                onClick={submitDislikeForm}
              >
                {isEnglish ? 'Save' : 'Запази'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeDislikeForm}
              >
                {isEnglish ? 'Cancel' : 'Отказ'}
              </button>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('products'); }}
          >
            {isEnglish ? 'Go to Products →' : 'Към продукти →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={selectedSafeRecipe !== null}
        onClose={() => setSelectedSafeRecipe(null)}
        contentClassName="modal-recipe"
      >
        {selectedSafeRecipe && (
          <RecipeDetailView
            recipe={selectedSafeRecipe}
            allergies={allergies}
            dislikes={dislikes}
            lang={lang}
            isOwner={true}
            fridge={fridge}
            showBackButton={false}
            onBack={() => setSelectedSafeRecipe(null)}
            onEdit={onEditRecipe ? () => { onEditRecipe(selectedSafeRecipe); setSelectedSafeRecipe(null); } : undefined}
            onDelete={onDeleteRecipe ? () => { onDeleteRecipe(selectedSafeRecipe.id); toast.success(lang === 'en' ? 'Recipe deleted' : 'Рецептата е изтрита'); setSelectedSafeRecipe(null); } : undefined}
          />
        )}
      </Modal>

      <Modal
        open={selectedRecipe !== null}
        onClose={() => setSelectedRecipe(null)}
        contentClassName="modal-recipe"
      >
        {selectedRecipe && (
          <RecipeDetailView
            recipe={selectedRecipe}
            allergies={allergies}
            dislikes={dislikes}
            lang={lang}
            isOwner={false}
            fridge={fridge}
            isFavorite={favoriteIds.includes(selectedRecipe.id)}
            showBackButton={false}
            onBack={() => setSelectedRecipe(null)}
            onToggleFavorite={() => onToggleFavorite(selectedRecipe)}
            favoriteCount={communityFavoriteCounts[selectedRecipe.id]}
            onAuthorClick={selectedRecipe.authorId && onNavigateToUser ? () => { setSelectedRecipe(null); onNavigateToUser(selectedRecipe.authorId!); } : undefined}
          />
        )}
      </Modal>

      <ConfirmDeleteModal
        open={pendingDeleteRecipeId !== null}
        itemName={recipes.find(r => r.id === pendingDeleteRecipeId) ? recipeDisplayName(recipes.find(r => r.id === pendingDeleteRecipeId)!, lang) : ''}
        lang={lang}
        onConfirm={() => {
          if (pendingDeleteRecipeId) {
            onDeleteRecipe?.(pendingDeleteRecipeId);
            toast.success(isEnglish ? 'Recipe deleted' : 'Рецептата е изтрита');
          }
          setPendingDeleteRecipeId(null);
        }}
        onCancel={() => setPendingDeleteRecipeId(null)}
      />
      <ConfirmDeleteModal
        open={pendingDeleteFridgeId !== null}
        itemName={fridge.find(f => f.id === pendingDeleteFridgeId)?.name ?? ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteFridgeId) onDeleteFridgeItem(pendingDeleteFridgeId); setPendingDeleteFridgeId(null); }}
        onCancel={() => setPendingDeleteFridgeId(null)}
      />
      <ConfirmDeleteModal
        open={pendingDeleteAllergyName !== null}
        itemName={pendingDeleteAllergyName ?? ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteAllergyName) handleDeleteAllergy(pendingDeleteAllergyName); setPendingDeleteAllergyName(null); }}
        onCancel={() => setPendingDeleteAllergyName(null)}
      />
      <ConfirmDeleteModal
        open={pendingDeleteDislikeName !== null}
        itemName={pendingDeleteDislikeName ?? ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteDislikeName) handleDeleteDislike(pendingDeleteDislikeName); setPendingDeleteDislikeName(null); }}
        onCancel={() => setPendingDeleteDislikeName(null)}
      />
    </div>
  );
}
