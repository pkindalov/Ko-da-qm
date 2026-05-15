import { useState } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { isSafe, recipeRisk } from '../../../shared/utils/recipeUtils';
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
}

const RECIPES_PREVIEW_SIZE = 4;
const COMMUNITY_PAGE_SIZE = 4;

export function HomeScreen({ profile, recipes, fridge, publicRecipes, favoriteIds, onToggleFavorite, products, setTab, lang, onDeleteFridgeItem, onAddFridgeItem, onEditFridgeItem, onRemoveAllergy, onAddAllergy, onEditAllergy, onRemoveDislike, onAddDislike, onEditDislike, onUpdateProductStatus, communityFavoriteCounts = {}, onNavigateToUser }: HomeScreenProps) {
  const isEnglish = lang === 'en';
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedSafeRecipe, setSelectedSafeRecipe] = useState<Recipe | null>(null);
  const [communityPage, setCommunityPage] = useState(1);
  const [openStatModal, setOpenStatModal] = useState<'safeRecipes' | 'fridge' | 'allergies' | 'dislikes' | null>(null);
  const [allergiesExpanded, setAllergiesExpanded] = useState(false);

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
    const newName = allergyFormValue.trim();

    if (allergyFormMode === 'add') {
      onAddAllergy(newName);
    } else if (allergyFormMode === 'edit') {
      const oldName = allergyFormOriginal;
      const contributingProducts = products.filter(
        p => p.status === 'allergic' && (p.name === oldName || p.nameEn === oldName)
      );

      if (profile.allergies.includes(oldName)) {
        onEditAllergy(oldName, newName);
      } else {
        onAddAllergy(newName);
      }

      contributingProducts.forEach(p => onUpdateProductStatus(p.id, 'liked'));
    }

    closeAllergyForm();
  };

  const handleDeleteAllergy = (name: string) => {
    onRemoveAllergy(name);
    products
      .filter(p => p.status === 'allergic' && (p.name === name || p.nameEn === name))
      .forEach(p => onUpdateProductStatus(p.id, 'liked'));
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
    const newName = dislikeFormValue.trim();

    if (dislikeFormMode === 'add') {
      onAddDislike(newName);
    } else if (dislikeFormMode === 'edit') {
      const oldName = dislikeFormOriginal;
      const contributingProducts = products.filter(
        p => p.status === 'disliked' && (p.name === oldName || p.nameEn === oldName)
      );

      if (profile.dislikes.includes(oldName)) {
        onEditDislike(oldName, newName);
      } else {
        onAddDislike(newName);
      }

      contributingProducts.forEach(p => onUpdateProductStatus(p.id, 'liked'));
    }

    closeDislikeForm();
  };

  const handleDeleteDislike = (name: string) => {
    onRemoveDislike(name);
    products
      .filter(p => p.status === 'disliked' && (p.name === name || p.nameEn === name))
      .forEach(p => onUpdateProductStatus(p.id, 'liked'));
  };

  const toNames = (list: Product[]) => list.flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]);
  const allergies = [...new Set([...profile.allergies, ...toNames(products.filter(p => p.status === 'allergic'))])];
  const dislikes  = [...new Set([...profile.dislikes,  ...toNames(products.filter(p => p.status === 'disliked'))])];
  const blocked   = [...allergies, ...dislikes];
  const safeRecipes = recipes.filter((r) => isSafe(r, blocked));
  const greeting = getGreeting(new Date().getHours(), lang);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
          {greeting}{profile.name ? `, ${profile.name}` : ''}! 👋
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 15, marginTop: 4, fontWeight: 600 }}>
          {isEnglish ? 'What are we eating today?' : 'Какво ядем днес?'}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('safeRecipes')}>
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{safeRecipes.length}</div>
          <div className="stat-label">{isEnglish ? 'safe recipes' : 'безопасни рецепти'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('fridge')}>
          <div className="stat-num" style={{ color: 'var(--secondary)' }}>{fridge.length}</div>
          <div className="stat-label">{isEnglish ? 'fridge items' : 'в хладилника'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('allergies')}>
          <div className="stat-num" style={{ color: 'var(--danger)' }}>{allergies.length}</div>
          <div className="stat-label">{isEnglish ? 'allergies' : 'алергии'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('dislikes')}>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>{dislikes.length}</div>
          <div className="stat-label">{isEnglish ? 'dislikes' : 'нелюбими'}</div>
        </div>
      </div>

      {allergies.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setAllergiesExpanded(v => !v)}
            aria-expanded={allergiesExpanded}
          >
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--danger)' }}>
              ⚠ {isEnglish ? 'Active Allergies' : 'Активни алергии'} ({allergies.length})
            </span>
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>
              {allergiesExpanded ? '▲' : '▼'}
            </span>
          </button>
          {allergiesExpanded && (
            <div className="tag-list" style={{ marginTop: 8 }}>
              {allergies.map((a) => (
                <Badge type="allergy" key={a}>{a}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="divider" />
      <div className="section-title">{isEnglish ? 'QUICK IDEAS' : 'БЪРЗИ ИДЕИ'}</div>

      {recipes.length === 0 ? (
        <EmptyState
          icon="😔"
          title={isEnglish ? 'No recipes yet' : 'Все още няма рецепти'}
          subtitle={isEnglish ? 'Add recipes or update your restrictions' : 'Добави рецепти или промени ограниченията си'}
        />
      ) : (
        <div className="grid-2">
          {recipes.slice(0, RECIPES_PREVIEW_SIZE).map((r) => {
            const risk = recipeRisk(r, allergies, dislikes);
            return (
              <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setTab('recipes')}>
                {r.imageUrl
                  ? <img src={r.imageUrl} alt={isEnglish && r.nameEn ? r.nameEn : r.name} className="recipe-card-img" />
                  : <div className="recipe-emoji">{r.emoji}</div>
                }
                <div className="recipe-name">{isEnglish && r.nameEn ? r.nameEn : r.name}</div>
                <div className="recipe-meta">⏱ {r.time} {isEnglish ? 'min' : 'мин'}</div>
                <div style={{ marginTop: 6 }}>
                  {risk === 'safe'    && <Badge type="safe">{isEnglish ? 'Safe' : 'Безопасно'}</Badge>}
                  {risk === 'dislike' && <Badge type="dislike">{isEnglish ? 'Check' : 'Провери!'}</Badge>}
                  {risk === 'allergy' && <Badge type="allergy">⚠ {isEnglish ? 'Allergy risk!' : 'Алергия!'}</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {publicRecipes.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-title">{isEnglish ? 'FROM THE COMMUNITY' : 'ОТ ОБЩНОСТТА'}</div>
          <div className="grid-2">
            {publicRecipes.slice(0, communityPage * COMMUNITY_PAGE_SIZE).map((r) => {
              const risk = recipeRisk(r, allergies, dislikes);
              return (
                <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setSelectedRecipe(r)}>
                  <button
                    className="btn-favorite"
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                    aria-label={favoriteIds.includes(r.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteIds.includes(r.id) ? '♥' : '♡'}
                  </button>
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt={isEnglish && r.nameEn ? r.nameEn : r.name} className="recipe-card-img" />
                    : <div className="recipe-emoji">{r.emoji}</div>
                  }
                  <div className="recipe-name">{isEnglish && r.nameEn ? r.nameEn : r.name}</div>
                  <div className="recipe-meta">⏱ {r.time} {isEnglish ? 'min' : 'мин'}</div>
                  {communityFavoriteCounts[r.id] > 0 && (
                    <div className="recipe-meta">♥ {communityFavoriteCounts[r.id]}</div>
                  )}
                  {r.authorName && r.authorId && onNavigateToUser && (
                    <button
                      className="recipe-meta"
                      onClick={(e) => { e.stopPropagation(); onNavigateToUser(r.authorId!); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)', fontWeight: 700, textAlign: 'left' }}
                    >
                      👤 {r.authorName}
                    </button>
                  )}
                  {r.authorName && (!r.authorId || !onNavigateToUser) && (
                    <div className="recipe-meta">👤 {r.authorName}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    {risk === 'safe'    && <Badge type="safe">{isEnglish ? 'Safe' : 'Безопасно'}</Badge>}
                    {risk === 'dislike' && <Badge type="dislike">{isEnglish ? 'Check' : 'Провери!'}</Badge>}
                    {risk === 'allergy' && <Badge type="allergy">⚠ {isEnglish ? 'Allergy risk!' : 'Алергия!'}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
          {publicRecipes.length > communityPage * COMMUNITY_PAGE_SIZE && (
            <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setCommunityPage(p => p + 1)}>
              {isEnglish ? `Show more (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} left)` : `Покажи още (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} остават)`}
            </button>
          )}
        </>
      )}

      <div className="divider" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setTab('fridge')}>
          🧊 {isEnglish ? 'Open Fridge' : 'Отвори хладилника'}
        </button>
        <button className="btn btn-ghost" onClick={() => setTab('recipes')}>
          📖 {isEnglish ? 'All Recipes' : 'Всички рецепти'}
        </button>
      </div>

      <Modal
        open={openStatModal === 'safeRecipes'}
        onClose={() => setOpenStatModal(null)}
        title={isEnglish ? `Safe Recipes (${safeRecipes.length})` : `Безопасни рецепти (${safeRecipes.length})`}
        contentStyle={{ maxWidth: 360 }}
      >
        {safeRecipes.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {isEnglish ? 'No safe recipes yet.' : 'Все още няма безопасни рецепти.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {safeRecipes.map(r => {
              const recipeName = isEnglish && r.nameEn ? r.nameEn : r.name;
              return (
                <button
                  key={r.id}
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', width: '100%', textAlign: 'left', color: 'inherit' }}
                  onClick={() => { setOpenStatModal(null); setSelectedSafeRecipe(r); }}
                  aria-label={recipeName}
                >
                  <span style={{ fontSize: 20 }}>{r.emoji}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{recipeName}</span>
                  <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>⏱ {r.time} {isEnglish ? 'min' : 'мин'}</span>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
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
        contentStyle={{ maxWidth: 360 }}
      >
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddForm}
          >
            + {isEnglish ? 'Add item' : 'Добави'}
          </button>
        </div>
        {fridge.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {isEnglish ? 'Your fridge is empty.' : 'Хладилникът е празен.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {fridge.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{item.name}</span>
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
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ marginBottom: 10 }}>
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
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">{isEnglish ? 'Pick an emoji' : 'Избери емоджи'}</label>
              <div className="chip-group">
                {FRIDGE_MODAL_EMOJIS.map((emoji) => (
                  <span
                    key={emoji}
                    className={`chip${fridgeFormEmoji === emoji ? ' selected' : ''}`}
                    style={{ fontSize: 20, padding: '4px 8px' }}
                    onClick={() => setFridgeFormEmoji(emoji)}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {isEnglish ? 'or type your own:' : 'или въведи свое:'}
                </span>
                <input
                  className="input-field"
                  value={fridgeFormEmoji}
                  onChange={(e) => setFridgeFormEmoji(e.target.value)}
                  aria-label={isEnglish ? 'Custom emoji' : 'Персонален емоджи'}
                  style={{ width: 64, textAlign: 'center', fontSize: 20, padding: '4px 8px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
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
        <div style={{ marginTop: 16 }}>
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
        contentStyle={{ maxWidth: 360 }}
      >
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddAllergyForm}
          >
            + {isEnglish ? 'Add allergy' : 'Добави алергия'}
          </button>
        </div>
        {allergies.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {isEnglish ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        ) : (
          <div className="tag-list">
            {allergies.map(a => (
              <span key={a} className="badge badge-allergy">
                {a}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, fontSize: 11, lineHeight: 1, color: 'inherit' }}
                  onClick={() => openEditAllergyForm(a)}
                  aria-label={`${isEnglish ? 'Edit allergy' : 'Редактирай алергия'} ${a}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, fontSize: 11, lineHeight: 1, color: 'inherit' }}
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
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ marginBottom: 10 }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
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
        <div style={{ marginTop: 16 }}>
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
        contentStyle={{ maxWidth: 360 }}
      >
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openAddDislikeForm}
          >
            + {isEnglish ? 'Add dislike' : 'Добави нелюбима'}
          </button>
        </div>
        {dislikes.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {isEnglish ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        ) : (
          <div className="tag-list">
            {dislikes.map(d => (
              <span key={d} className="badge badge-dislike">
                {d}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, fontSize: 11, lineHeight: 1, color: 'inherit' }}
                  onClick={() => openEditDislikeForm(d)}
                  aria-label={`${isEnglish ? 'Edit dislike' : 'Редактирай нелюбима'} ${d}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, fontSize: 11, lineHeight: 1, color: 'inherit' }}
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
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ marginBottom: 10 }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
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
        <div style={{ marginTop: 16 }}>
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
            isOwner={false}
            showBackButton={false}
            onBack={() => setSelectedSafeRecipe(null)}
            onAuthorClick={selectedSafeRecipe.authorId && onNavigateToUser
              ? () => { setSelectedSafeRecipe(null); onNavigateToUser(selectedSafeRecipe.authorId!); }
              : undefined}
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
