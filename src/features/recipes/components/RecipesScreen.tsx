import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { searchDatabase } from '../../fridge/utils/matchFromFridge';
import { isSafe } from '../../../shared/utils/recipeUtils';
import { parseRecipeForm } from '../utils/recipeForm';
import type { Recipe, Profile, Language } from '../../../shared/types';

interface RecipesScreenProps {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  profile: Profile;
  lang: Language;
}

interface NewRecipeForm {
  name: string;
  emoji: string;
  time: string;
  ingredients: string;
  steps: string;
}

export function RecipesScreen({ recipes, setRecipes, profile, lang }: RecipesScreenProps) {
  const L = lang === 'en';
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dbOpen, setDbOpen] = useState(false);
  const [filterSafe, setFilterSafe] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbResults, setDbResults] = useState<Awaited<ReturnType<typeof searchDatabase>>>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [newR, setNewR] = useState<NewRecipeForm>({ name: '', emoji: '🍽', time: '', ingredients: '', steps: '' });

  const blocked = [...profile.allergies, ...profile.dislikes];

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
      setRecipes([...recipes, { ...r, isAI: false }]);
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
    const parsed = parseRecipeForm(newR);
    if (!parsed) return;
    setRecipes([...recipes, { ...parsed, id: 'r' + Date.now() }]);
    setNewR({ name: '', emoji: '🍽', time: '', ingredients: '', steps: '' });
    setAddOpen(false);
  };

  if (detail) {
    const r = recipes.find((x) => x.id === detail);
    if (!r) { setDetail(null); return null; }
    const safe = isSafe(r, blocked);

    return (
      <div className="fade-in">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setDetail(null)}>
          ← {L ? 'Back' : 'Назад'}
        </button>

        <div className="detail-header">
          <div className="detail-emoji">{r.emoji}</div>
          <div className="detail-title">{L && r.nameEn ? r.nameEn : r.name}</div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Badge type={safe ? 'safe' : 'dislike'}>
              {safe ? (L ? '✓ Safe for you' : '✓ Безопасно') : (L ? '⚠ Contains restrictions' : '⚠ Съдържа ограничения')}
            </Badge>
            <span className="badge badge-neutral">⏱ {r.time} {L ? 'min' : 'мин'}</span>
            {r.isAI && <Badge type="primary">✨ AI</Badge>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">{L ? 'INGREDIENTS' : 'СЪСТАВКИ'}</div>
          <div className="stack" style={{ gap: 6 }}>
            {r.ingredients.map((ing, i) => {
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
          {r.steps.map((s, i) => (
            <div key={i} className="step-item">
              <div className="step-num">{i + 1}</div>
              <div className="step-text">{s}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-danger btn-sm"
          onClick={() => { setRecipes(recipes.filter((x) => x.id !== r.id)); setDetail(null); }}
        >
          {L ? 'Delete Recipe' : 'Изтрий рецептата'}
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={L ? 'New Recipe' : 'Нова рецепта'}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">{L ? 'Name' : 'Название'}</label>
            <input className="input-field" value={newR.name} onChange={(e) => setNewR({ ...newR, name: e.target.value })}
              placeholder={L ? 'Recipe name' : 'Название на рецептата'} />
          </div>
          <div style={{ width: 80 }}>
            <label className="input-label">Emoji</label>
            <input className="input-field" value={newR.emoji} onChange={(e) => setNewR({ ...newR, emoji: e.target.value })}
              style={{ textAlign: 'center', fontSize: 20 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="input-label">{L ? 'Time (min)' : 'Време (мин)'}</label>
          <input className="input-field" type="number" value={newR.time} onChange={(e) => setNewR({ ...newR, time: e.target.value })} placeholder="15" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="input-label">{L ? 'Ingredients (one per line)' : 'Съставки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={newR.ingredients} onChange={(e) => setNewR({ ...newR, ingredients: e.target.value })}
            placeholder={L ? '3 eggs\n50g cheese' : '3 яйца\n50г кашкавал'} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="input-label">{L ? 'Steps (one per line)' : 'Стъпки (по един ред)'}</label>
          <textarea className="input-field" rows={4} value={newR.steps} onChange={(e) => setNewR({ ...newR, steps: e.target.value })}
            placeholder={L ? 'Beat the eggs\nHeat the pan' : 'Разбий яйцата\nЗагрей тигана'} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveRecipe}>{L ? 'Save' : 'Запази'}</button>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{L ? 'Cancel' : 'Отказ'}</button>
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
