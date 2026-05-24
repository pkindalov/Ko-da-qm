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
import type { Recipe, Profile, Language, Product, FridgeItem } from '../../../shared/types';

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
  fridge?: FridgeItem[];
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

export const RecipesScreen = ({ recipes, addRecipe, removeRecipe, updateRecipe, favoriteRecipes, favoriteIds, onToggleFavorite, products, profile, lang, userEmail, fridge, openRecipeId, onRecipeOpened }: RecipesScreenProps) => {
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
    list.flatMap(product => product.nameEn ? [product.name, product.nameEn] : [product.name]);

  const allergies = [...profile.allergies, ...toNames(products.filter(product => product.status === 'allergic'))];
  const dislikes  = [...profile.dislikes,  ...toNames(products.filter(product => product.status === 'disliked'))];
  const blocked   = [...allergies, ...dislikes];
  const filteredProducts = products.filter(product =>
    (lang === 'en' && product.nameEn ? product.nameEn : product.name).toLowerCase().includes(productFilter.toLowerCase())
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

  const openEditModal = (recipe: Recipe) => {
    setForm({
      name: recipe.name,
      emoji: recipe.emoji,
      time: recipe.time.toString(),
      ingredients: recipe.ingredients.join('\n'),
      steps: recipe.steps.join('\n'),
      isPublic: recipe.isPublic,
    });
    setEditingId(recipe.id);
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
      ? recipes.filter(recipe => {
          const name = (recipeDisplayName(recipe, lang)).toLowerCase();
          return name.includes(term) || recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(term));
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

  const viewFromModal = (recipe: Recipe) => {
    closeDbModal();
    setDetail(recipe.id);
  };

  const filtered = recipes.filter(recipe => !filterSafe || isSafe(recipe, blocked));

  const saveRecipe = () => {
    const parsed = parseRecipeForm(form);
    if (!parsed) return;
    if (editingId) {
      const existing = recipes.find(recipe => recipe.id === editingId);
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

  const detailRecipe = detail ? recipes.find((recipe) => recipe.id === detail) : null;
  const pendingDeleteRecipe = pendingDeleteId ? (recipes.find((recipe) => recipe.id === pendingDeleteId) ?? null) : null;

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
          fridge={fridge}
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
          fridge={fridge}
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
                  {favoriteRecipes.map((recipe) => {
                    const risk = recipeRisk(recipe, allergies, dislikes);
                    const name = recipeDisplayName(recipe, lang);
                    const tag = recipe.tags?.[0] ?? (lang === 'en' ? 'recipe' : 'рецепта');
                    return (
                      <div key={recipe.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setFavoriteDetail(recipe)}>
                        <div className="recipe-image">
                          <div className="recipe-image-stripes" />
                          {recipe.imageUrl
                            ? <img src={recipe.imageUrl} alt={name} className="recipe-card-img" />
                            : <div className="recipe-image-emoji">{recipe.emoji}</div>}
                          <div className="recipe-image-label">{tag} · {recipe.time}min</div>
                          <button
                            className="btn-favorite"
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
                            aria-label="Remove from favorites"
                          >♥</button>
                        </div>
                        <div className="recipe-body">
                          <div className="recipe-name italic">{name}</div>
                          <div className="recipe-meta">⏱ {recipe.time} {lang === 'en' ? 'min' : 'мин'}</div>
                          {recipe.authorName && <div className="recipe-meta">👤 {recipe.authorName}</div>}
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
              {filtered.map((recipe) => {
                const risk = recipeRisk(recipe, allergies, dislikes);
                const name = recipeDisplayName(recipe, lang);
                const tag = recipe.tags?.[0] ?? (lang === 'en' ? 'recipe' : 'рецепта');
                return (
                  <div key={recipe.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setDetail(recipe.id)}>
                    <div className="recipe-image">
                      <div className="recipe-image-stripes" />
                      {recipe.imageUrl
                        ? <img src={recipe.imageUrl} alt={name} className="recipe-card-img" />
                        : <div className="recipe-image-emoji">{recipe.emoji}</div>}
                      <div className="recipe-image-label">{tag} · {recipe.time}min</div>
                      {recipe.isAI && <span className="ai-badge"><Badge type="primary">✨ AI</Badge></span>}
                    </div>
                    <div className="recipe-body">
                      <div className="recipe-name italic">{name}</div>
                      <div className="recipe-meta">⏱ {recipe.time} {lang === 'en' ? 'min' : 'мин'}</div>
                      <div className="recipe-tags">
                        {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {lang === 'en' ? 'safe' : 'безопасно'}</Badge>}
                        {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {lang === 'en' ? 'check' : 'провери'}</Badge>}
                        {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {lang === 'en' ? 'allergy' : 'алергия'}</Badge>}
                      </div>
                      <button
                        className="btn btn-danger btn-sm mt-2 btn-full"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(recipe.id); }}
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
          <label className="input-label" htmlFor="recipe-form-ingredients">{lang === 'en' ? 'Ingredients (one per line)' : 'Съставки (по един ред)'}</label>
          <textarea id="recipe-form-ingredients" className="input-field" rows={4} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            placeholder={lang === 'en' ? '3 eggs\n230ml milk\n100g butter\n1 tsp salt' : '3 яйца\n230мл мляко\n100г масло\n1 ч.л. сол'} />
          <p className="recipe-form-hint">
            {lang === 'en'
              ? 'Start each line with the quantity, then the ingredient — e.g. "3 eggs" or "100g butter". Avoid section headings like "For the dough:" — those break the shopping list.'
              : 'Всеки ред започва с количеството, след това съставката — напр. "3 яйца" или "100г масло". Избягвай заглавия като "За тестото:" — те нарушават списъка за пазар.'}</p>
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
                {filteredProducts.map(product => (
                  <button key={product.id} className="chip" onClick={() => appendIngredient(lang === 'en' && product.nameEn ? product.nameEn : product.name)}>
                    {product.emoji} {lang === 'en' && product.nameEn ? product.nameEn : product.name}
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
              {myRecipeResults.slice(0, myPage * PAGE_SIZE).map((recipe) => (
                <div key={recipe.id} className="card-sm">
                  <div className="row-between mb-1">
                    <div className="row-sm">
                      <span className="emoji-sm">{recipe.emoji}</span>
                      <span className="recipe-card-name">{recipeDisplayName(recipe, lang)}</span>
                    </div>
                    <span className="badge badge-neutral">⏱ {recipe.time} {lang === 'en' ? 'min' : 'мин'}</span>
                  </div>
                  <div className="recipe-card-meta mb-2">
                    {recipe.ingredients.slice(0, 4).join(', ')}{recipe.ingredients.length > 4 ? '...' : ''}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewFromModal(recipe)}>
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
              {dbResults.slice(0, dbPage * PAGE_SIZE).map((recipe) => (
                <div key={recipe.id} className="card-sm clickable" onClick={() => { closeDbModal(); setFavoriteDetail(recipe); }}>
                  <div className="row-between mb-1">
                    <div className="row-sm">
                      <span className="emoji-sm">{recipe.emoji}</span>
                      <span className="recipe-card-name">{recipe.name}</span>
                    </div>
                    <div className="row-sm">
                      <span className="badge badge-neutral">⏱ {recipe.time} мин</span>
                      <button
                        className="btn-heart"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
                        aria-label={favoriteIds.includes(recipe.id) ? (lang === 'en' ? 'Remove from favorites' : 'Премахни от любими') : (lang === 'en' ? 'Add to favorites' : 'Добави в любими')}
                      >
                        {favoriteIds.includes(recipe.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>
                  <div className="recipe-card-meta">
                    {recipe.ingredients.slice(0, 4).join(', ')}{recipe.ingredients.length > 4 ? '...' : ''}
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
