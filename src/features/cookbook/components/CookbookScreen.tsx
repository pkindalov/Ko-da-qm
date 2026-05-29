import { useState, lazy, Suspense } from 'react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import type { Recipe, Profile, Language } from '../../../shared/types';
import './CookbookScreen.css';

const CookbookEditorPanel = lazy(() =>
  import('./CookbookEditorPanel').then(m => ({ default: m.CookbookEditorPanel }))
);

const FlipbookModal = lazy(() =>
  import('./FlipbookModal').then(m => ({ default: m.FlipbookModal }))
);

interface CookbookScreenProps {
  recipes: Recipe[];
  favoriteIds: string[];
  profile: Profile;
  lang: Language;
}

export const CookbookScreen = ({ recipes, favoriteIds, profile, lang }: CookbookScreenProps) => {
  const isEnglish = lang === 'en';
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [selected, setSelected] = useLocalStorage<string[]>('kdq_cookbook_sel_v1', []);
  const [editorOpen, setEditorOpen] = useState(false);
  const [flipbookOpen, setFlipbookOpen] = useState(false);

  const favSet = new Set(favoriteIds);
  const visibleRecipes = filter === 'favorites'
    ? recipes.filter(r => favSet.has(r.id))
    : recipes;

  const selectedSet = new Set(selected);
  const visibleSelectedCount = visibleRecipes.filter(r => selectedSet.has(r.id)).length;
  const allVisibleSelected = visibleRecipes.length > 0 && visibleSelectedCount === visibleRecipes.length;

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      setSelected(selected.filter(x => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const selectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleRecipes.map(r => r.id));
      setSelected(selected.filter(id => !visibleIds.has(id)));
    } else {
      const current = new Set(selected);
      visibleRecipes.forEach(r => current.add(r.id));
      setSelected([...current]);
    }
  };

  const clearSelection = () => setSelected([]);

  const selectedRecipes = recipes.filter(r => selectedSet.has(r.id));
  const favCount = recipes.filter(r => favSet.has(r.id)).length;
  const blocked = [...profile.allergies, ...profile.dislikes];

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Cookbook' : 'Готварска книга'}</span>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelected(recipes.map(r => r.id))}
            disabled={recipes.length === 0}
          >
            {isEnglish ? 'Select all recipes' : 'Избери всички'}
          </button>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-mb">{isEnglish ? 'Make a book' : 'Направи книга'}</div>
          <h1 className="h-title italic">
            {isEnglish ? 'Your ' : 'Твоята '}
            <span className="cb-heading-accent">{isEnglish ? 'cookbook' : 'готварска книга'}</span>
          </h1>
          <p className="page-head-sub">
            {isEnglish
              ? 'Pick recipes from your saved collection and favorites, then export a typeset PDF — cover, contents and all.'
              : 'Избери рецепти от своята книга и любими, после генерирай PDF — корица, съдържание и всичко необходимо.'}
          </p>
        </div>
      </div>

      <div className="cb-toolbar">
        <div className="cb-tabs" role="tablist">
          <button
            className={`cb-tab${filter === 'all' ? ' active' : ''}`}
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            {isEnglish ? 'My recipes' : 'Моите рецепти'}
            <span className="count">{recipes.length}</span>
          </button>
          <button
            className={`cb-tab${filter === 'favorites' ? ' active' : ''}`}
            role="tab"
            aria-selected={filter === 'favorites'}
            onClick={() => setFilter('favorites')}
          >
            <span className="cb-fav-heart">♥</span>
            {isEnglish ? 'Favorites' : 'Любими'}
            <span className="count">{favCount}</span>
          </button>
        </div>
        <div className="cb-toolbar-actions">
          {visibleRecipes.length > 0 && (
            <button className="cb-mini-btn" onClick={selectAllVisible}>
              {allVisibleSelected
                ? isEnglish ? 'Deselect visible' : 'Размаркирай'
                : isEnglish ? 'Select visible' : 'Маркирай видимите'}
            </button>
          )}
          {selected.length > 0 && (
            <button className="cb-mini-btn" onClick={clearSelection}>
              {isEnglish ? 'Clear' : 'Изчисти'}
            </button>
          )}
        </div>
      </div>

      {visibleRecipes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{filter === 'favorites' ? '♡' : '📖'}</div>
          <div className="empty-title">
            {filter === 'favorites'
              ? isEnglish ? 'No favorites yet' : 'Все още няма любими'
              : isEnglish ? 'No recipes yet' : 'Все още няма рецепти'}
          </div>
          <div className="empty-sub">
            {filter === 'favorites'
              ? isEnglish
                ? 'Tap the heart on any recipe card to mark it as a favorite.'
                : 'Натисни сърцето на някоя рецепта, за да я добавиш в любимите.'
              : isEnglish
                ? 'Add a recipe from the Recipes tab to start your book.'
                : 'Добави рецепта от страницата „Рецепти", за да започнеш книгата.'}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {visibleRecipes.map(r => {
            const isSel = selectedSet.has(r.id);
            const flagged = (r.requiredIngredients ?? []).some(ing =>
              blocked.some(b => ing.toLowerCase().includes(b.toLowerCase())),
            );
            const displayName = recipeDisplayName(r, lang);
            return (
              <article
                key={r.id}
                className={`cb-card${isSel ? ' selected' : ''}${flagged ? ' flagged' : ''}`}
                onClick={() => toggle(r.id)}
                aria-pressed={isSel}
              >
                <span className="cb-check" aria-hidden="true" />
                {favSet.has(r.id) && (
                  <span className="cb-fav-tag">♥ {isEnglish ? 'fav' : 'любима'}</span>
                )}
                <div className="recipe-image">
                  <div className="recipe-image-stripes" />
                  <div className="recipe-image-emoji">{r.emoji}</div>
                  <div className="recipe-image-label">PHOTO · {r.time}MIN</div>
                </div>
                <div className="recipe-body">
                  <div className="recipe-name italic">{displayName}</div>
                  <div className="recipe-meta">
                    {r.tags?.[0] ?? (isEnglish ? 'recipe' : 'рецепта')} · {r.time} {isEnglish ? 'min' : 'мин'} · {(r.requiredIngredients ?? []).length} {isEnglish ? 'ings' : 'съст.'}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedRecipes.length > 0 && (
        <div className="cb-bar">
          <div className="cb-bar__info">
            <div className="cb-bar__count">
              <b>{selectedRecipes.length}</b>
              {isEnglish
                ? selectedRecipes.length === 1 ? 'recipe selected' : 'recipes selected'
                : selectedRecipes.length === 1 ? 'избрана рецепта' : 'избрани рецепти'}
            </div>
            <button className="cb-bar__btn-clear" onClick={clearSelection}>
              {isEnglish ? 'Clear' : 'Изчисти'}
            </button>
          </div>
          <div className="cb-bar__btns">
            <button
              className="cb-bar__btn-flipbook"
              onClick={() => setFlipbookOpen(true)}
            >
              📖 {isEnglish ? 'Flipbook' : 'Флипбук'}
            </button>
            <button
              className="cb-bar__btn-create"
              onClick={() => setEditorOpen(true)}
            >
              {isEnglish ? 'Create a Recipe Book' : 'Създай готварска книга'}
              <span className="cb-bar__arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {flipbookOpen && selectedRecipes.length > 0 && (
        <Suspense fallback={null}>
          <FlipbookModal
            recipes={selectedRecipes}
            lang={lang}
            onClose={() => setFlipbookOpen(false)}
          />
        </Suspense>
      )}

      {editorOpen && selectedRecipes.length > 0 && (
        <Suspense fallback={null}>
          <CookbookEditorPanel
            initialRecipes={selectedRecipes}
            lang={lang}
            profile={profile}
            onClose={() => setEditorOpen(false)}
            onRemoveRecipe={id => setSelected(selected.filter(sid => sid !== id))}
          />
        </Suspense>
      )}
    </div>
  );
};
