import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { searchDatabase } from '../../fridge/utils/matchFromFridge';
import { isSafe, recipeRisk } from '../../../shared/utils/recipeUtils';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import { parseRecipeForm } from '../utils/recipeForm';
import type { Recipe, Profile, Language, Product } from '../../../shared/types';

interface RecipesScreenProps {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;
  updateRecipe: (recipe: Recipe) => void;
  favoriteRecipes: Recipe[];
  favoriteIds: string[];
  onToggleFavorite: (recipe: Recipe) => void;
  products: Product[];
  profile: Profile;
  lang: Language;
  userEmail: string;
  openRecipeId?: string | null;
  onRecipeOpened?: () => void;
}

interface RecipeFormState {
  name: string;
  emoji: string;
  time: string;
  ingredients: string;
  steps: string;
  isPublic: boolean;
}

const EMPTY_FORM: RecipeFormState = { name: '', emoji: '🍽', time: '', ingredients: '', steps: '', isPublic: false };
const PAGE_SIZE = 5;

export const RecipesScreen = ({ recipes, addRecipe, removeRecipe, updateRecipe, favoriteRecipes, favoriteIds, onToggleFavorite, products, profile, lang, userEmail, openRecipeId, onRecipeOpened }: RecipesScreenProps) => {
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (openRecipeId) {
      setDetail(openRecipeId);
      onRecipeOpened?.();
    }
  }, [openRecipeId, onRecipeOpened]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dbOpen, setDbOpen] = useState(false);
  const [filterSafe, setFilterSafe] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbResults, setDbResults] = useState<Awaited<ReturnType<typeof searchDatabase>>>([]);
  const [myRecipeResults, setMyRecipeResults] = useState<Recipe[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [myPage, setMyPage] = useState(1);
  const [dbPage, setDbPage] = useState(1);
  const [form, setForm] = useState<RecipeFormState>(EMPTY_FORM);
  const [productFilter, setProductFilter] = useState('');
  const [favoriteDetail, setFavoriteDetail] = useState<Recipe | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(true);

  const toNames = (list: { name: string; nameEn?: string }[]) =>
    list.flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]);

  const allergies = [...profile.allergies, ...toNames(products.filter(p => p.status === 'allergic'))];
  const dislikes  = [...profile.dislikes,  ...toNames(products.filter(p => p.status === 'disliked'))];
  const blocked   = [...allergies, ...dislikes];
  const filteredProducts = products.filter(p =>
    (lang === 'en' && p.nameEn ? p.nameEn : p.name).toLowerCase().includes(productFilter.toLowerCase())
  );

  const closeModal = () => {
    setAddOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setProductFilter('');
  };

  const closeDbModal = () => {
    setDbOpen(false);
    setDbSearch('');
    setDbResults([]);
    setMyRecipeResults([]);
    setMyPage(1);
    setDbPage(1);
  };

  const openEditModal = (r: Recipe) => {
    setForm({
      name: r.name,
      emoji: r.emoji,
      time: r.time.toString(),
      ingredients: r.ingredients.join('\n'),
      steps: r.steps.join('\n'),
      isPublic: r.isPublic,
    });
    setEditingId(r.id);
    setAddOpen(true);
  };

  const appendIngredient = (name: string) => {
    setForm(prev => {
      const current = prev.ingredients.trimEnd();
      return { ...prev, ingredients: current ? `${current}\n${name}` : name };
    });
  };

  const runDbSearch = async () => {
    const term = dbSearch.toLowerCase().trim();

    const matched = term
      ? recipes.filter(r => {
          const name = (recipeDisplayName(r, lang)).toLowerCase();
          return name.includes(term) || r.ingredients.some(i => i.toLowerCase().includes(term));
        })
      : [];
    setMyRecipeResults(matched);
    setMyPage(1);
    setDbPage(1);

    setDbLoading(true);
    try {
      setDbResults(await searchDatabase(dbSearch, blocked));
    } finally {
      setDbLoading(false);
    }
  };

  const viewFromModal = (r: Recipe) => {
    closeDbModal();
    setDetail(r.id);
  };

  const filtered = recipes.filter(r => !filterSafe || isSafe(r, blocked));

  const saveRecipe = () => {
    const parsed = parseRecipeForm(form);
    if (!parsed) return;
    if (editingId) {
      const existing = recipes.find(r => r.id === editingId);
      if (existing) {
        updateRecipe({ ...existing, ...parsed, id: editingId });
        toast.success(lang === 'en' ? 'Recipe updated!' : 'Рецептата е обновена!');
      }
    } else {
      addRecipe({ ...parsed, id: crypto.randomUUID(), authorName: profile.name, authorEmail: userEmail });
      toast.success(lang === 'en' ? 'Recipe added!' : 'Рецептата е добавена!');
    }
    closeModal();
  };

  const detailRecipe = detail ? recipes.find((x) => x.id === detail) : null;
  const pendingDeleteRecipe = pendingDeleteId ? (recipes.find((x) => x.id === pendingDeleteId) ?? null) : null;

  const hasNoSearchResults = !dbLoading && dbSearch.length > 0 && dbResults.length === 0 && myRecipeResults.length === 0;

  return (
    <div className="fade-in">
      {detailRecipe ? (
        <RecipeDetailView
          recipe={detailRecipe}
          allergies={allergies}
          dislikes={dislikes}
          lang={lang}
          isOwner={true}
          onBack={() => setDetail(null)}
          onEdit={() => openEditModal(detailRecipe)}
          onDelete={() => { removeRecipe(detailRecipe.id); toast.success(lang === 'en' ? 'Recipe deleted' : 'Рецептата е изтрита'); setDetail(null); }}
          onSaveTranslation={async (name, ingredients, steps) => {
            await updateRecipe({ ...detailRecipe, nameTranslated: name, ingredientsTranslated: ingredients, stepsTranslated: steps });
            toast.success(lang === 'en' ? 'Translation saved!' : 'Преводът е запазен!');
          }}
        />
      ) : favoriteDetail ? (
        <RecipeDetailView
          recipe={favoriteDetail}
          allergies={allergies}
          dislikes={dislikes}
          lang={lang}
          isOwner={false}
          isFavorite={favoriteIds.includes(favoriteDetail.id)}
          onBack={() => setFavoriteDetail(null)}
          onToggleFavorite={() => onToggleFavorite(favoriteDetail)}
        />
      ) : (
        <div>
          <div className="topbar">
            <div className="breadcrumb">
              {lang === 'en' ? 'Kitchen' : 'Кухня'} <span>/ {lang === 'en' ? 'Recipes' : 'Рецепти'}</span>
            </div>
            <div className="topbar-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setDbOpen(true)}>
                🔍 {lang === 'en' ? 'Search' : 'Търси'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
                + {lang === 'en' ? 'New recipe' : 'Нова рецепта'}
              </button>
            </div>
          </div>

          <div className="page-head">
            <div>
              <div className="eyebrow eyebrow-mb">{lang === 'en' ? 'Your cookbook' : 'Твоята книга'}</div>
              <h1 className="h-title italic">{lang === 'en' ? 'Recipes' : 'Рецепти'}</h1>
              <div className="page-head-sub mt-2">
                {recipes.length} {lang === 'en' ? 'recipes saved · filtered against' : 'рецепти · филтрирани спрямо'}{' '}
                {blocked.length} {lang === 'en' ? 'restrictions' : 'ограничения'}
              </div>
            </div>
            <div className="row-sm">
              <button className={`chip${filterSafe ? ' selected' : ''}`} onClick={() => setFilterSafe(!filterSafe)}>
                ✓ {lang === 'en' ? 'Safe only' : 'Само безопасни'}
              </button>
            </div>
          </div>

          {favoriteRecipes.length > 0 && (
            <>
              <div className="section-eyebrow">
                <button className="label label-btn" onClick={() => setFavoritesOpen(o => !o)}>
                  ♥ {lang === 'en' ? 'Favorites' : 'Любими'} {favoritesOpen ? '▲' : '▼'}
                </button>
              </div>
              {favoritesOpen && (
                <div className="grid-3 mb-6">
                  {favoriteRecipes.map((r) => {
                    const risk = recipeRisk(r, allergies, dislikes);
                    const name = recipeDisplayName(r, lang);
                    const tag = r.tags?.[0] ?? (lang === 'en' ? 'recipe' : 'рецепта');
                    return (
                      <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setFavoriteDetail(r)}>
                        <div className="recipe-image">
                          <div className="recipe-image-stripes" />
                          {r.imageUrl
                            ? <img src={r.imageUrl} alt={name} className="recipe-card-img" />
                            : <div className="recipe-image-emoji">{r.emoji}</div>}
                          <div className="recipe-image-label">{tag} · {r.time}min</div>
                          <button
                            className="btn-favorite"
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                            aria-label="Remove from favorites"
                          >♥</button>
                        </div>
                        <div className="recipe-body">
                          <div className="recipe-name italic">{name}</div>
                          <div className="recipe-meta">⏱ {r.time} {lang === 'en' ? 'min' : 'мин'}</div>
                          {r.authorName && <div className="recipe-meta">👤 {r.authorName}</div>}
                          <div className="recipe-tags">
                            {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {lang === 'en' ? 'safe' : 'безопасно'}</Badge>}
                            {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {lang === 'en' ? 'check' : 'провери'}</Badge>}
                            {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {lang === 'en' ? 'allergy' : 'алергия'}</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="divider" />
            </>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon="📖"
              title={lang === 'en' ? 'No recipes found' : 'Няма намерени рецепти'}
              subtitle={lang === 'en' ? 'Add a recipe or search the database' : 'Добави рецепта или търси в базата'}
            />
          ) : (
            <div className="grid-3">
              {filtered.map((r) => {
                const risk = recipeRisk(r, allergies, dislikes);
                const name = recipeDisplayName(r, lang);
                const tag = r.tags?.[0] ?? (lang === 'en' ? 'recipe' : 'рецепта');
                return (
                  <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setDetail(r.id)}>
                    <div className="recipe-image">
                      <div className="recipe-image-stripes" />
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={name} className="recipe-card-img" />
                        : <div className="recipe-image-emoji">{r.emoji}</div>}
                      <div className="recipe-image-label">{tag} · {r.time}min</div>
                      {r.isAI && <span className="ai-badge"><Badge type="primary">✨ AI</Badge></span>}
                    </div>
                    <div className="recipe-body">
                      <div className="recipe-name italic">{name}</div>
                      <div className="recipe-meta">⏱ {r.time} {lang === 'en' ? 'min' : 'мин'}</div>
                      <div className="recipe-tags">
                        {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {lang === 'en' ? 'safe' : 'безопасно'}</Badge>}
                        {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {lang === 'en' ? 'check' : 'провери'}</Badge>}
                        {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {lang === 'en' ? 'allergy' : 'алергия'}</Badge>}
                      </div>
                      <button
                        className="btn btn-danger btn-sm mt-2 btn-full"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(r.id); }}
                      >
                        🗑 {lang === 'en' ? 'Delete' : 'Изтрий'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        itemName={pendingDeleteRecipe ? (lang === 'en' && pendingDeleteRecipe.nameEn ? pendingDeleteRecipe.nameEn : pendingDeleteRecipe.name) : ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteId) { removeRecipe(pendingDeleteId); toast.success(lang === 'en' ? 'Recipe deleted' : 'Рецептата е изтрита'); } setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <Modal open={addOpen} onClose={closeModal} title={editingId ? (lang === 'en' ? 'Edit Recipe' : 'Редактирай рецепта') : (lang === 'en' ? 'New Recipe' : 'Нова рецепта')}>
        <div className="recipe-form-row">
          <div className="recipe-form-name">
            <label className="input-label">{lang === 'en' ? 'Name' : 'Название'}</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={lang === 'en' ? 'Recipe name' : 'Название на рецептата'} />
          </div>
          <div className="recipe-form-emoji-wrap">
            <label className="input-label">Emoji</label>
            <input className="input-field input-center" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          </div>
        </div>
        <div className="recipe-form-mb">
          <label className="input-label">{lang === 'en' ? 'Time (min)' : 'Време (мин)'}</label>
          <input className="input-field" type="number" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="15" />
        </div>
        <div className="recipe-form-mb">
          <label className="input-label">{lang === 'en' ? 'Ingredients (one per line)' : 'Съставки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            placeholder={lang === 'en' ? '3 eggs\n50g cheese' : '3 яйца\n50г кашкавал'} />
          {products.length > 0 && (
            <div className="mt-1">
              <div className="product-picker-hd">
                <span>{lang === 'en' ? 'Pick from your products:' : 'Избери от продуктите:'}</span>
                {products.length >= 10 && (
                  <span className="product-picker-count">
                    {filteredProducts.length} / {products.length}
                  </span>
                )}
              </div>
              {products.length >= 10 && (
                <input
                  className="input-field product-filter-input"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  placeholder={lang === 'en' ? 'Filter products...' : 'Филтрирай продукти...'}
                />
              )}
              <div className="tag-list">
                {filteredProducts.map(p => (
                  <button key={p.id} className="chip" onClick={() => appendIngredient(lang === 'en' && p.nameEn ? p.nameEn : p.name)}>
                    {p.emoji} {lang === 'en' && p.nameEn ? p.nameEn : p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="recipe-form-mb-lg">
          <label className="input-label">{lang === 'en' ? 'Steps (one per line)' : 'Стъпки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })}
            placeholder={lang === 'en' ? 'Beat the eggs\nHeat the pan' : 'Разбий яйцата\nЗагрей тигана'} />
        </div>
        <div className="toggle-wrap recipe-form-toggle">
          <label className="toggle">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            <span className="toggle-slider" />
          </label>
          <span className={`toggle-label${form.isPublic ? ' active' : ''}`}>
            {form.isPublic
              ? (lang === 'en' ? '🌐 Public — visible to all users' : '🌐 Публична — видима за всички')
              : (lang === 'en' ? '🔒 Private — only you can see it' : '🔒 Лична — само ти я виждаш')}
          </span>
        </div>
        <div className="recipe-form-actions">
          <button className="btn btn-primary flex-1" onClick={saveRecipe}>{lang === 'en' ? 'Save' : 'Запази'}</button>
          <button className="btn btn-ghost" onClick={closeModal}>{lang === 'en' ? 'Cancel' : 'Отказ'}</button>
        </div>
      </Modal>

      <Modal open={dbOpen} onClose={closeDbModal} title={lang === 'en' ? 'Search Recipes' : 'Търси рецепти'} contentClassName="modal-recipe">
        <div className="recipe-form-mb">
          <label className="input-label">{lang === 'en' ? 'Ingredient or recipe name' : 'Съставка или название'}</label>
          <input
            className="input-field"
            value={dbSearch}
            onChange={(e) => setDbSearch(e.target.value)}
            placeholder={lang === 'en' ? 'e.g. eggs, pasta, chicken...' : 'напр. яйца, макарони, пиле...'}
            onKeyDown={(e) => e.key === 'Enter' && runDbSearch()}
            autoFocus
          />
          {blocked.length > 0 && (
            <div className="modal-error">
              ⚠ {lang === 'en' ? 'Will exclude:' : 'Ще изключи:'} {blocked.join(', ')}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-full" onClick={runDbSearch} disabled={dbLoading}>
          {dbLoading ? (lang === 'en' ? 'Searching...' : 'Търси...') : `🔍 ${lang === 'en' ? 'Search' : 'Търси'}`}
        </button>

        {hasNoSearchResults && (
          <EmptyState icon="🔍" title={lang === 'en' ? 'No results' : 'Няма резултати'} subtitle={lang === 'en' ? 'Try another keyword' : 'Опитай друга дума'} />
        )}

        {myRecipeResults.length > 0 && (
          <div className="mt-4">
            <div className="section-title mb-3">
              📖 {lang === 'en' ? 'My Recipes' : 'Моите рецепти'} ({myRecipeResults.length})
            </div>
            <div className="stack">
              {myRecipeResults.slice(0, myPage * PAGE_SIZE).map((r) => (
                <div key={r.id} className="card-sm">
                  <div className="row-between mb-1">
                    <div className="row-sm">
                      <span className="emoji-sm">{r.emoji}</span>
                      <span className="recipe-card-name">{recipeDisplayName(r, lang)}</span>
                    </div>
                    <span className="badge badge-neutral">⏱ {r.time} {lang === 'en' ? 'min' : 'мин'}</span>
                  </div>
                  <div className="recipe-card-meta mb-2">
                    {r.ingredients.slice(0, 4).join(', ')}{r.ingredients.length > 4 ? '...' : ''}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewFromModal(r)}>
                    👁 {lang === 'en' ? 'View' : 'Виж'}
                  </button>
                </div>
              ))}
            </div>
            {myRecipeResults.length > myPage * PAGE_SIZE && (
              <button className="btn btn-ghost btn-full mt-2" onClick={() => setMyPage(p => p + 1)}>
                {lang === 'en' ? `Show more (${myRecipeResults.length - myPage * PAGE_SIZE} left)` : `Покажи още (${myRecipeResults.length - myPage * PAGE_SIZE} остават)`}
              </button>
            )}
          </div>
        )}

        {dbResults.length > 0 && (
          <div className="mt-4">
            <div className="section-title mb-3">
              🌐 {lang === 'en' ? 'From Database' : 'От базата данни'} ({dbResults.length})
            </div>
            <div className="stack">
              {dbResults.slice(0, dbPage * PAGE_SIZE).map((r) => (
                <div key={r.id} className="card-sm clickable" onClick={() => { closeDbModal(); setFavoriteDetail(r); }}>
                  <div className="row-between mb-1">
                    <div className="row-sm">
                      <span className="emoji-sm">{r.emoji}</span>
                      <span className="recipe-card-name">{r.name}</span>
                    </div>
                    <div className="row-sm">
                      <span className="badge badge-neutral">⏱ {r.time} мин</span>
                      <button
                        className="btn-heart"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                        aria-label={favoriteIds.includes(r.id) ? (lang === 'en' ? 'Remove from favorites' : 'Премахни от любими') : (lang === 'en' ? 'Add to favorites' : 'Добави в любими')}
                      >
                        {favoriteIds.includes(r.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>
                  <div className="recipe-card-meta">
                    {r.ingredients.slice(0, 4).join(', ')}{r.ingredients.length > 4 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
            {dbResults.length > dbPage * PAGE_SIZE && (
              <button className="btn btn-ghost btn-full mt-2" onClick={() => setDbPage(p => p + 1)}>
                {lang === 'en' ? `Show more (${dbResults.length - dbPage * PAGE_SIZE} left)` : `Покажи още (${dbResults.length - dbPage * PAGE_SIZE} остават)`}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
