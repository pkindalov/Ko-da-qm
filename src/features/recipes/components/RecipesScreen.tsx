import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { searchDatabase } from '../../fridge/utils/matchFromFridge';
import { isSafe, recipeRisk } from '../../../shared/utils/recipeUtils';
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

export function RecipesScreen({ recipes, addRecipe, removeRecipe, updateRecipe, favoriteRecipes, favoriteIds, onToggleFavorite, products, profile, lang, userEmail }: RecipesScreenProps) {
  const L = lang === 'en';
  const [detail, setDetail] = useState<string | null>(null);
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
    (L && p.nameEn ? p.nameEn : p.name).toLowerCase().includes(productFilter.toLowerCase())
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
          const name = (L && r.nameEn ? r.nameEn : r.name).toLowerCase();
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
      if (existing) updateRecipe({ ...parsed, id: editingId, authorName: existing.authorName, authorEmail: existing.authorEmail });
    } else {
      addRecipe({ ...parsed, id: crypto.randomUUID(), authorName: profile.name, authorEmail: userEmail });
    }
    closeModal();
  };

  const detailRecipe = detail ? recipes.find((x) => x.id === detail) : null;

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
          onDelete={() => { removeRecipe(detailRecipe.id); setDetail(null); }}
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
          <div className="page-header">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="page-title">📖 {L ? 'Recipes' : 'Рецепти'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setDbOpen(true)}>
                  🔍 {L ? 'Search' : 'Търси'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`chip${filterSafe ? ' selected' : ''}`} onClick={() => setFilterSafe(!filterSafe)}>
                ✓ {L ? 'Safe for me' : 'Безопасни за мен'}
              </button>
            </div>
          </div>

          {favoriteRecipes.length > 0 && (
            <>
              <button className="section-title-toggle" onClick={() => setFavoritesOpen(o => !o)}>
                ♥ {L ? 'FAVORITES' : 'ЛЮБИМИ'} <span className="section-title-chevron">{favoritesOpen ? '▲' : '▼'}</span>
              </button>
              {favoritesOpen && (
                <div className="grid-2">
                  {favoriteRecipes.map((r) => {
                    const risk = recipeRisk(r, allergies, dislikes);
                    return (
                      <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setFavoriteDetail(r)}>
                        <button
                          className="btn-favorite"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                          aria-label="Remove from favorites"
                        >
                          ♥
                        </button>
                        {r.imageUrl
                          ? <img src={r.imageUrl} alt={L && r.nameEn ? r.nameEn : r.name} className="recipe-card-img" />
                          : <div className="recipe-emoji">{r.emoji}</div>
                        }
                        <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                        <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                        {r.authorName && (
                          <div className="recipe-meta">👤 {r.authorName}</div>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {risk === 'safe'    && <Badge type="safe">{L ? 'Safe' : 'Безопасно'}</Badge>}
                          {risk === 'dislike' && <Badge type="dislike">{L ? 'Check' : 'Провери!'}</Badge>}
                          {risk === 'allergy' && <Badge type="allergy">⚠ {L ? 'Allergy risk!' : 'Алергия!'}</Badge>}
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
              title={L ? 'No recipes found' : 'Няма намерени рецепти'}
              subtitle={L ? 'Add a recipe or search the database' : 'Добави рецепта или търси в базата'}
            />
          ) : (
            <div className="grid-2">
              {filtered.map((r) => {
                const risk = recipeRisk(r, allergies, dislikes);
                return (
                  <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setDetail(r.id)}>
                    {r.isAI && <div style={{ position: 'absolute', top: 12, right: 12 }}><Badge type="primary">✨ AI</Badge></div>}
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={L && r.nameEn ? r.nameEn : r.name} className="recipe-card-img" />
                      : <div className="recipe-emoji">{r.emoji}</div>
                    }
                    <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                    <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                    <div style={{ marginTop: 6 }}>
                      {risk === 'safe'    && <Badge type="safe">{L ? 'Safe' : 'Безопасно'}</Badge>}
                      {risk === 'dislike' && <Badge type="dislike">{L ? 'Check' : 'Провери!'}</Badge>}
                      {risk === 'allergy' && <Badge type="allergy">⚠ {L ? 'Allergy risk!' : 'Алергия!'}</Badge>}
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: 8, width: '100%' }}
                      onClick={(e) => { e.stopPropagation(); removeRecipe(r.id); }}
                    >
                      🗑 {L ? 'Delete' : 'Изтрий'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={closeModal} title={editingId ? (L ? 'Edit Recipe' : 'Редактирай рецепта') : (L ? 'New Recipe' : 'Нова рецепта')}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">{L ? 'Name' : 'Название'}</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={L ? 'Recipe name' : 'Название на рецептата'} />
          </div>
          <div style={{ width: 80 }}>
            <label className="input-label">Emoji</label>
            <input className="input-field" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              style={{ textAlign: 'center', fontSize: 20 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="input-label">{L ? 'Time (min)' : 'Време (мин)'}</label>
          <input className="input-field" type="number" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="15" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="input-label">{L ? 'Ingredients (one per line)' : 'Съставки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            placeholder={L ? '3 eggs\n50g cheese' : '3 яйца\n50г кашкавал'} />
          {products.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>{L ? 'Pick from your products:' : 'Избери от продуктите:'}</span>
                {products.length >= 10 && (
                  <span style={{ fontWeight: 400 }}>
                    {filteredProducts.length} / {products.length}
                  </span>
                )}
              </div>
              {products.length >= 10 && (
                <input
                  className="input-field"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  placeholder={L ? 'Filter products...' : 'Филтрирай продукти...'}
                  style={{ marginBottom: 6, fontSize: 13 }}
                />
              )}
              <div className="tag-list">
                {filteredProducts.map(p => (
                  <button key={p.id} className="chip" onClick={() => appendIngredient(L && p.nameEn ? p.nameEn : p.name)}>
                    {p.emoji} {L && p.nameEn ? p.nameEn : p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="input-label">{L ? 'Steps (one per line)' : 'Стъпки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })}
            placeholder={L ? 'Beat the eggs\nHeat the pan' : 'Разбий яйцата\nЗагрей тигана'} />
        </div>
        <div className="toggle-wrap" style={{ marginBottom: 20 }}>
          <label className="toggle">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            <span className="toggle-slider" />
          </label>
          <span className={`toggle-label${form.isPublic ? ' active' : ''}`}>
            {form.isPublic
              ? (L ? '🌐 Public — visible to all users' : '🌐 Публична — видима за всички')
              : (L ? '🔒 Private — only you can see it' : '🔒 Лична — само ти я виждаш')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveRecipe}>{L ? 'Save' : 'Запази'}</button>
          <button className="btn btn-ghost" onClick={closeModal}>{L ? 'Cancel' : 'Отказ'}</button>
        </div>
      </Modal>

      <Modal open={dbOpen} onClose={closeDbModal} title={L ? 'Search Recipes' : 'Търси рецепти'} contentClassName="modal-recipe">
        <div style={{ marginBottom: 12 }}>
          <label className="input-label">{L ? 'Ingredient or recipe name' : 'Съставка или название'}</label>
          <input
            className="input-field"
            value={dbSearch}
            onChange={(e) => setDbSearch(e.target.value)}
            placeholder={L ? 'e.g. eggs, pasta, chicken...' : 'напр. яйца, макарони, пиле...'}
            onKeyDown={(e) => e.key === 'Enter' && runDbSearch()}
            autoFocus
          />
          {blocked.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
              ⚠ {L ? 'Will exclude:' : 'Ще изключи:'} {blocked.join(', ')}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-full" onClick={runDbSearch} disabled={dbLoading}>
          {dbLoading ? (L ? 'Searching...' : 'Търси...') : `🔍 ${L ? 'Search' : 'Търси'}`}
        </button>

        {hasNoSearchResults && (
          <EmptyState icon="🔍" title={L ? 'No results' : 'Няма резултати'} subtitle={L ? 'Try another keyword' : 'Опитай друга дума'} />
        )}

        {myRecipeResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>
              📖 {L ? 'My Recipes' : 'Моите рецепти'} ({myRecipeResults.length})
            </div>
            <div className="stack">
              {myRecipeResults.slice(0, myPage * PAGE_SIZE).map((r) => (
                <div key={r.id} className="card-sm">
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{r.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{L && r.nameEn ? r.nameEn : r.name}</span>
                    </div>
                    <span className="badge badge-neutral">⏱ {r.time} {L ? 'min' : 'мин'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>
                    {r.ingredients.slice(0, 4).join(', ')}{r.ingredients.length > 4 ? '...' : ''}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => viewFromModal(r)}>
                    👁 {L ? 'View' : 'Виж'}
                  </button>
                </div>
              ))}
            </div>
            {myRecipeResults.length > myPage * PAGE_SIZE && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setMyPage(p => p + 1)}>
                {L ? `Show more (${myRecipeResults.length - myPage * PAGE_SIZE} left)` : `Покажи още (${myRecipeResults.length - myPage * PAGE_SIZE} остават)`}
              </button>
            )}
          </div>
        )}

        {dbResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>
              🌐 {L ? 'From Database' : 'От базата данни'} ({dbResults.length})
            </div>
            <div className="stack">
              {dbResults.slice(0, dbPage * PAGE_SIZE).map((r) => (
                <div key={r.id} className="card-sm" style={{ cursor: 'pointer' }} onClick={() => { closeDbModal(); setFavoriteDetail(r); }}>
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{r.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</span>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge badge-neutral">⏱ {r.time} мин</span>
                      <button
                        className="btn-heart"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                        aria-label={favoriteIds.includes(r.id) ? (L ? 'Remove from favorites' : 'Премахни от любими') : (L ? 'Add to favorites' : 'Добави в любими')}
                      >
                        {favoriteIds.includes(r.id) ? '♥' : '♡'}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    {r.ingredients.slice(0, 4).join(', ')}{r.ingredients.length > 4 ? '...' : ''}
                  </div>
                </div>
              ))}
            </div>
            {dbResults.length > dbPage * PAGE_SIZE && (
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setDbPage(p => p + 1)}>
                {L ? `Show more (${dbResults.length - dbPage * PAGE_SIZE} left)` : `Покажи още (${dbResults.length - dbPage * PAGE_SIZE} остават)`}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
