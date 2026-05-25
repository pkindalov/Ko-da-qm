import { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { buildCookbookHTML } from '../utils/buildCookbookHTML';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import type { Recipe, Profile, Language } from '../../../shared/types';

interface CookbookScreenProps {
  recipes: Recipe[];
  favoriteIds: string[];
  profile: Profile;
  lang: Language;
}

export const CookbookScreen = ({ recipes, favoriteIds, profile, lang }: CookbookScreenProps) => {
  const L = lang === 'en';
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [selected, setSelected] = useLocalStorage<string[]>('kdq_cookbook_sel_v1', []);
  const [setupOpen, setSetupOpen] = useState(false);
  const [title, setTitle] = useState(L ? 'My Cookbook' : 'Моята готварска книга');
  const [author, setAuthor] = useState(profile.name || (L ? 'A quiet cook' : 'Тих готвач'));
  const [intro, setIntro] = useState('');

  useEffect(() => {
    setAuthor(profile.name || (L ? 'A quiet cook' : 'Тих готвач'));
  }, [profile.name, L]);

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

  const createBook = () => {
    const html = buildCookbookHTML({
      title: title.trim() || (L ? 'My Cookbook' : 'Моята готварска книга'),
      author: author.trim() || (L ? 'A quiet cook' : 'Тих готвач'),
      intro: intro.trim(),
      recipes: selectedRecipes,
      lang,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'cookbook').replace(/[^\p{L}\p{N}_ -]/gu, '').trim() || 'cookbook'}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setSetupOpen(false);
  };

  const favCount = recipes.filter(r => favSet.has(r.id)).length;
  const blocked = [...profile.allergies, ...profile.dislikes];

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {L ? 'Kitchen' : 'Кухня'} <span>/ {L ? 'Cookbook' : 'Готварска книга'}</span>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelected(recipes.map(r => r.id))}
            disabled={recipes.length === 0}
          >
            {L ? 'Select all recipes' : 'Избери всички'}
          </button>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-mb">{L ? 'Make a book' : 'Направи книга'}</div>
          <h1 className="h-title italic">
            {L ? 'Your ' : 'Твоята '}
            <span className="cb-heading-accent">{L ? 'cookbook' : 'готварска книга'}</span>
          </h1>
          <p className="page-head-sub">
            {L
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
            {L ? 'My recipes' : 'Моите рецепти'}
            <span className="count">{recipes.length}</span>
          </button>
          <button
            className={`cb-tab${filter === 'favorites' ? ' active' : ''}`}
            role="tab"
            aria-selected={filter === 'favorites'}
            onClick={() => setFilter('favorites')}
          >
            <span className="cb-fav-heart">♥</span>
            {L ? 'Favorites' : 'Любими'}
            <span className="count">{favCount}</span>
          </button>
        </div>
        <div className="cb-toolbar-actions">
          {visibleRecipes.length > 0 && (
            <button className="cb-mini-btn" onClick={selectAllVisible}>
              {allVisibleSelected
                ? L ? 'Deselect visible' : 'Размаркирай'
                : L ? 'Select visible' : 'Маркирай видимите'}
            </button>
          )}
          {selected.length > 0 && (
            <button className="cb-mini-btn" onClick={clearSelection}>
              {L ? 'Clear' : 'Изчисти'}
            </button>
          )}
        </div>
      </div>

      {visibleRecipes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{filter === 'favorites' ? '♡' : '📖'}</div>
          <div className="empty-title">
            {filter === 'favorites'
              ? L ? 'No favorites yet' : 'Все още няма любими'
              : L ? 'No recipes yet' : 'Все още няма рецепти'}
          </div>
          <div className="empty-sub">
            {filter === 'favorites'
              ? L
                ? 'Tap the heart on any recipe card to mark it as a favorite.'
                : 'Натисни сърцето на някоя рецепта, за да я добавиш в любимите.'
              : L
                ? 'Add a recipe from the Recipes tab to start your book.'
                : 'Добави рецепта от страницата „Рецепти", за да започнеш книгата.'}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {visibleRecipes.map(r => {
            const isSel = selectedSet.has(r.id);
            const flagged = (r.requiredIngredients ?? []).some(ing =>
              blocked.some(b => ing.toLowerCase().includes(b)),
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
                  <span className="cb-fav-tag">♥ {L ? 'fav' : 'любима'}</span>
                )}
                <div className="recipe-image">
                  <div className="recipe-image-stripes" />
                  <div className="recipe-image-emoji">{r.emoji}</div>
                  <div className="recipe-image-label">PHOTO · {r.time}MIN</div>
                </div>
                <div className="recipe-body">
                  <div className="recipe-name italic">{displayName}</div>
                  <div className="recipe-meta">
                    {r.tags?.[0] ?? (L ? 'recipe' : 'рецепта')} · {r.time} {L ? 'min' : 'мин'} · {(r.requiredIngredients ?? []).length} {L ? 'ings' : 'съст.'}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="cb-bar">
          <div className="cb-bar__count">
            <b>{selected.length}</b>
            {L
              ? selected.length === 1 ? 'recipe selected' : 'recipes selected'
              : selected.length === 1 ? 'избрана рецепта' : 'избрани рецепти'}
          </div>
          <button className="cb-bar__btn-clear" onClick={clearSelection}>
            {L ? 'Clear' : 'Изчисти'}
          </button>
          <button
            className="cb-bar__btn-create"
            onClick={() => setSetupOpen(true)}
            disabled={selected.length === 0}
          >
            {L ? 'Create a Recipe Book' : 'Създай готварска книга'}
            <span className="cb-bar__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      )}

      <Modal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title={L ? 'A new cookbook' : 'Нова готварска книга'}
      >
        <p className="modal-sub">
          {L
            ? `${selectedRecipes.length} recipes — cover, contents, and a page for each.`
            : `${selectedRecipes.length} рецепти — корица, съдържание и страница за всяка.`}
        </p>
        <div className="cb-cover">
          <div className="cb-cover__eyebrow">Ко-да-ям · {L ? 'Volume I' : 'Том I'}</div>
          <div className="cb-cover__title">{title || (L ? 'Untitled' : 'Без име')}</div>
          <div className="cb-cover__author">{L ? 'by' : 'от'} {author || (L ? 'a quiet cook' : 'тих готвач')}</div>
          <div className="cb-cover__meta">
            <span>{selectedRecipes.length} {L ? 'recipes' : 'рецепти'}</span>
            <span>{new Date().toLocaleDateString(L ? 'en-GB' : 'bg-BG', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="cb-form-row">
          <div>
            <label className="input-label">{L ? 'Book title' : 'Заглавие'}</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={L ? 'My Cookbook' : 'Моята готварска книга'}
            />
          </div>
          <div>
            <label className="input-label">{L ? 'Author' : 'Автор'}</label>
            <input
              className="input"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder={L ? 'Your name' : 'Твоето име'}
            />
          </div>
        </div>
        <div className="cb-form-row full">
          <div>
            <label className="input-label">
              {L ? 'A short dedication (optional)' : 'Кратко посвещение (по избор)'}
            </label>
            <input
              className="input"
              value={intro}
              onChange={e => setIntro(e.target.value)}
              placeholder={L ? 'Cooked from a small kitchen, with love.' : 'Готвено в малка кухня, с любов.'}
            />
          </div>
        </div>

        <div className="cb-form-label">{L ? 'Included recipes' : 'Включени рецепти'}</div>
        <div className="cb-recipe-list">
          {selectedRecipes.length === 0 ? (
            <div className="cb-recipe-list__empty">
              {L ? 'No recipes selected yet.' : 'Все още няма избрани рецепти.'}
            </div>
          ) : (
            selectedRecipes.map((r, i) => (
              <div key={r.id} className="cb-recipe-item">
                <span className="cb-recipe-item__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="cb-recipe-item__emoji">{r.emoji}</span>
                <span className="cb-recipe-item__name">{recipeDisplayName(r, lang)}</span>
                <span className="cb-recipe-item__time">{r.time}{L ? 'm' : 'мин'}</span>
              </div>
            ))
          )}
        </div>

        <div className="cb-form-actions">
          <button
            className="btn btn-primary"
            onClick={createBook}
            disabled={selectedRecipes.length === 0}
          >
            {L ? 'Open print view' : 'Отвори за печат'} <span aria-hidden="true">↗</span>
          </button>
          <button className="btn btn-ghost" onClick={() => setSetupOpen(false)}>
            {L ? 'Cancel' : 'Отказ'}
          </button>
        </div>
        <p className="cb-form-note">
          {L
            ? "Opens a print-ready cookbook in a new tab. Use your browser's \"Save as PDF\" option to export."
            : 'Отваря книгата в нов раздел. Използвай „Запази като PDF" от диалога за печат.'}
        </p>
      </Modal>
    </div>
  );
};
