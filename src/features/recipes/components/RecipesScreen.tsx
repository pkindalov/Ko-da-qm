import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { searchDatabase } from '../../fridge/utils/matchFromFridge';
import { isSafe } from '../../../shared/utils/recipeUtils';
import { parseRecipeForm } from '../utils/recipeForm';
import type { Recipe, Profile, Language, Product } from '../../../shared/types';

interface RecipesScreenProps {
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;
  updateRecipe: (recipe: Recipe) => void;
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

export function RecipesScreen({ recipes, addRecipe, removeRecipe, updateRecipe, products, profile, lang, userEmail }: RecipesScreenProps) {
  const L = lang === 'en';
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dbOpen, setDbOpen] = useState(false);
  const [filterSafe, setFilterSafe] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbResults, setDbResults] = useState<Awaited<ReturnType<typeof searchDatabase>>>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [form, setForm] = useState<RecipeFormState>(EMPTY_FORM);

  const blocked = [...profile.allergies, ...profile.dislikes];

  const closeModal = () => {
    setAddOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
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
    setDbLoading(true);
    try {
      setDbResults(await searchDatabase(dbSearch, blocked));
    } finally {
      setDbLoading(false);
    }
  };

  const importFromDb = (r: Recipe) => {
    if (!recipes.find((x) => x.id === r.id || x.name === r.name)) {
      addRecipe({ ...r, isAI: false, isPublic: false, authorName: undefined, authorEmail: undefined });
    }
    setDbOpen(false);
    setDbSearch('');
    setDbResults([]);
  };

  const filtered = recipes.filter((r) => {
    const n = L && r.nameEn ? r.nameEn : r.name;
    return n.toLowerCase().includes(search.toLowerCase()) && (!filterSafe || isSafe(r, blocked));
  });

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

  return (
    <div className="fade-in">
      {detailRecipe ? (
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setDetail(null)}>
            ← {L ? 'Back' : 'Назад'}
          </button>

          <div className="detail-header">
            <div className="detail-emoji">{detailRecipe.emoji}</div>
            <div className="detail-title">{L && detailRecipe.nameEn ? detailRecipe.nameEn : detailRecipe.name}</div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Badge type={isSafe(detailRecipe, blocked) ? 'safe' : 'dislike'}>
                {isSafe(detailRecipe, blocked) ? (L ? '✓ Safe for you' : '✓ Безопасно') : (L ? '⚠ Contains restrictions' : '⚠ Съдържа ограничения')}
              </Badge>
              <span className="badge badge-neutral">⏱ {detailRecipe.time} {L ? 'min' : 'мин'}</span>
              {detailRecipe.isAI && <Badge type="primary">✨ AI</Badge>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">{L ? 'INGREDIENTS' : 'СЪСТАВКИ'}</div>
            <div className="stack" style={{ gap: 6 }}>
              {detailRecipe.ingredients.map((ing, i) => {
                const isBlockedIng = blocked.some((b) => ing.toLowerCase().includes(b));
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                    <span style={{ color: isBlockedIng ? 'var(--danger)' : 'var(--secondary)' }}>
                      {isBlockedIng ? '✕' : '✓'}
                    </span>
                    <span style={{ color: isBlockedIng ? 'var(--danger)' : 'var(--text)', textDecoration: isBlockedIng ? 'line-through' : 'none' }}>
                      {ing}
                    </span>
                    {isBlockedIng && (
                      <Badge type={profile.allergies.some((a) => ing.toLowerCase().includes(a)) ? 'allergy' : 'dislike'}>
                        {profile.allergies.some((a) => ing.toLowerCase().includes(a))
                          ? (L ? 'Allergy' : 'Алергия')
                          : (L ? 'Dislike' : 'Нелюбимо')}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">{L ? 'STEPS' : 'СТЪПКИ'}</div>
            {detailRecipe.steps.map((s, i) => (
              <div key={i} className="step-item">
                <div className="step-num">{i + 1}</div>
                <div className="step-text">{s}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(detailRecipe)}>
              ✏ {L ? 'Edit' : 'Редактирай'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { removeRecipe(detailRecipe.id); setDetail(null); }}>
              {L ? 'Delete' : 'Изтрий'}
            </button>
          </div>
        </div>
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

            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L ? 'Search recipes...' : 'Търси рецепти...'}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className={`chip${filterSafe ? ' selected' : ''}`} onClick={() => setFilterSafe(!filterSafe)}>
                ✓ {L ? 'Safe for me' : 'Безопасни за мен'}
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="📖"
              title={L ? 'No recipes found' : 'Няма намерени рецепти'}
              subtitle={L ? 'Add a recipe or search the database' : 'Добави рецепта или търси в базата'}
            />
          ) : (
            <div className="grid-2">
              {filtered.map((r) => {
                const safe = isSafe(r, blocked);
                return (
                  <div key={r.id} className="recipe-card" onClick={() => setDetail(r.id)}>
                    {r.isAI && <div style={{ position: 'absolute', top: 12, right: 12 }}><Badge type="primary">✨ AI</Badge></div>}
                    <div className="recipe-emoji">{r.emoji}</div>
                    <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                    <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                    <div style={{ marginTop: 6 }}>
                      <Badge type={safe ? 'safe' : 'dislike'}>{safe ? (L ? 'Safe' : 'Безопасно') : (L ? 'Check' : 'Провери!')}</Badge>
                    </div>
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
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 6 }}>
                {L ? 'Pick from your products:' : 'Избери от продуктите:'}
              </div>
              <div className="tag-list">
                {products.map(p => (
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

      <Modal open={dbOpen} onClose={() => { setDbOpen(false); setDbSearch(''); setDbResults([]); }} title={L ? 'Search Recipes' : 'Търси рецепти'}>
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
        {dbSearch.length > 0 && dbResults.length === 0 && (
          <EmptyState icon="🔍" title={L ? 'No results' : 'Няма резултати'} subtitle={L ? 'Try another keyword' : 'Опитай друга дума'} />
        )}
        {dbResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>{dbResults.length} {L ? 'results' : 'резултата'}</div>
            <div className="stack">
              {dbResults.map((r) => (
                <div key={r.id} className="card-sm">
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{r.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</span>
                    </div>
                    <span className="badge badge-neutral">⏱ {r.time} мин</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>
                    {r.ingredients.slice(0, 4).join(', ')}{r.ingredients.length > 4 ? '...' : ''}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => importFromDb(r)}>
                    + {L ? 'Add to my recipes' : 'Добави в моите рецепти'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
