import { useState, useEffect } from 'react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import { CookbookPDF, DEFAULT_SETTINGS } from './CookbookPDF';
import type { CookbookSettings } from './CookbookPDF';
import type { Recipe, Profile, Language } from '../../../shared/types';

interface CookbookScreenProps {
  recipes: Recipe[];
  favoriteIds: string[];
  profile: Profile;
  lang: Language;
}

interface PdfSnapshot {
  title: string;
  author: string;
  intro: string;
  recipes: Recipe[];
  settings: CookbookSettings;
}

export const CookbookScreen = ({ recipes, favoriteIds, profile, lang }: CookbookScreenProps) => {
  const L = lang === 'en';
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [selected, setSelected] = useLocalStorage<string[]>('kdq_cookbook_sel_v1', []);
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState(L ? 'My Cookbook' : 'Моята готварска книга');
  const [author, setAuthor] = useState(profile.name || (L ? 'A quiet cook' : 'Тих готвач'));
  const [intro, setIntro] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CookbookSettings>(DEFAULT_SETTINGS);
  const [pdfSnapshot, setPdfSnapshot] = useState<PdfSnapshot | null>(null);
  const [settingsKey, setSettingsKey] = useState(0);

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

  const buildSnapshot = (): PdfSnapshot => ({
    title: title.trim() || (L ? 'My Cookbook' : 'Моята готварска книга'),
    author: author.trim() || (L ? 'A quiet cook' : 'Тих готвач'),
    intro: intro.trim(),
    recipes: selectedRecipes,
    settings,
  });

  const updateSettings = (next: CookbookSettings) => {
    setSettings(next);
    setPdfSnapshot(prev => prev ? { ...prev, settings: next } : null);
    setSettingsKey(k => k + 1);
  };

  const openEditor = () => {
    setPdfSnapshot(buildSnapshot());
    setEditorOpen(true);
  };

  const removeFromBook = (id: string) => {
    setSelected(selected.filter(sid => sid !== id));
    setPdfSnapshot(prev => prev ? { ...prev, recipes: prev.recipes.filter(r => r.id !== id) } : null);
  };

  const flushTextToPdf = () => {
    setPdfSnapshot(prev => prev ? {
      ...prev,
      title: title.trim() || (L ? 'My Cookbook' : 'Моята готварска книга'),
      author: author.trim() || (L ? 'A quiet cook' : 'Тих готвач'),
      intro: intro.trim(),
    } : null);
  };

  useEffect(() => {
    if (!editorOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditorOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editorOpen]);

  const saveBook = async () => {
    setSaving(true);
    const snap = buildSnapshot();
    try {
      const blob = await pdf(
        <CookbookPDF
          title={snap.title}
          author={snap.author}
          intro={snap.intro}
          recipes={snap.recipes}
          lang={lang}
          settings={snap.settings}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snap.title.replace(/[^\p{L}\p{N}_ -]/gu, '').trim() || 'cookbook'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setSaving(false);
    }
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
            onClick={openEditor}
            disabled={selected.length === 0}
          >
            {L ? 'Create a Recipe Book' : 'Създай готварска книга'}
            <span className="cb-bar__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {editorOpen && pdfSnapshot !== null && (
        <div className="cb-editor" role="dialog" aria-modal="true" aria-label={L ? 'Cookbook editor' : 'Редактор на книгата'}>
          <div className="cb-editor__topbar">
            <span className="cb-editor__book-name">{pdfSnapshot.title}</span>
            <div className="cb-editor__topbar-actions">
              <button
                className="btn btn-primary"
                onClick={saveBook}
                disabled={saving || selectedRecipes.length === 0}
              >
                {saving
                  ? (L ? 'Saving…' : 'Запазване…')
                  : <>{L ? 'Save as PDF' : 'Запази като PDF'} <span aria-hidden="true">↓</span></>}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditorOpen(false)}>
                {L ? 'Close' : 'Затвори'}
              </button>
            </div>
          </div>

          <div className="cb-editor__body">
            <div className="cb-editor__panel">
              <div>
                <label className="input-label">{L ? 'Book title' : 'Заглавие'}</label>
                <input
                  className="input-field"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={flushTextToPdf}
                  placeholder={L ? 'My Cookbook' : 'Моята готварска книга'}
                />
              </div>
              <div>
                <label className="input-label">{L ? 'Author' : 'Автор'}</label>
                <input
                  className="input-field"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  onBlur={flushTextToPdf}
                  placeholder={L ? 'Your name' : 'Твоето име'}
                />
              </div>
              <div>
                <label className="input-label">
                  {L ? 'Dedication (optional)' : 'Посвещение (по избор)'}
                </label>
                <input
                  className="input-field"
                  value={intro}
                  onChange={e => setIntro(e.target.value)}
                  onBlur={flushTextToPdf}
                  placeholder={L ? 'Cooked from a small kitchen, with love.' : 'Готвено в малка кухня, с любов.'}
                />
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Body font' : 'Шрифт на текста'}</div>
                <div className="cb-option-row">
                  {(['sans', 'serif', 'mono'] as const).map(f => (
                    <button
                      key={f}
                      className={`cb-option-btn${settings.bodyFont === f ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, bodyFont: f })}
                    >
                      {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Body text size' : 'Размер на текст'}</div>
                <div className="cb-option-row">
                  {[9, 11, 13].map(n => (
                    <button
                      key={n}
                      className={`cb-option-btn${settings.bodySize === n ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, bodySize: n })}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="cb-size-input"
                    min={6}
                    max={18}
                    value={settings.bodySize}
                    onChange={e => setSettings(s => ({ ...s, bodySize: Number(e.target.value) }))}
                    onBlur={e => updateSettings({ ...settings, bodySize: Math.min(18, Math.max(6, Number(e.target.value) || 11)) })}
                  />
                  <span className="cb-size-unit">pt</span>
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Heading size' : 'Размер на заглавие'}</div>
                <div className="cb-option-row">
                  {[24, 32, 42].map(n => (
                    <button
                      key={n}
                      className={`cb-option-btn${settings.titleSize === n ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, titleSize: n })}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="cb-size-input"
                    min={14}
                    max={52}
                    value={settings.titleSize}
                    onChange={e => setSettings(s => ({ ...s, titleSize: Number(e.target.value) }))}
                    onBlur={e => updateSettings({ ...settings, titleSize: Math.min(52, Math.max(14, Number(e.target.value) || 42)) })}
                  />
                  <span className="cb-size-unit">pt</span>
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Top/bottom margin' : 'Поле горе/долу'}</div>
                <div className="cb-option-row">
                  {[20, 38, 54].map(n => (
                    <button
                      key={n}
                      className={`cb-option-btn${settings.pageMarginV === n ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, pageMarginV: n })}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="cb-size-input"
                    min={10}
                    max={80}
                    value={settings.pageMarginV}
                    onChange={e => setSettings(s => ({ ...s, pageMarginV: Number(e.target.value) }))}
                    onBlur={e => updateSettings({ ...settings, pageMarginV: Math.min(80, Math.max(10, Number(e.target.value) || 54)) })}
                  />
                  <span className="cb-size-unit">pt</span>
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Left/right margin' : 'Поле ляво/дясно'}</div>
                <div className="cb-option-row">
                  {[20, 36, 48].map(n => (
                    <button
                      key={n}
                      className={`cb-option-btn${settings.pageMarginH === n ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, pageMarginH: n })}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="cb-size-input"
                    min={10}
                    max={80}
                    value={settings.pageMarginH}
                    onChange={e => setSettings(s => ({ ...s, pageMarginH: Number(e.target.value) }))}
                    onBlur={e => updateSettings({ ...settings, pageMarginH: Math.min(80, Math.max(10, Number(e.target.value) || 48)) })}
                  />
                  <span className="cb-size-unit">pt</span>
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Gap between recipes' : 'Разстояние между рецепти'}</div>
                <div className="cb-option-row">
                  {[10, 24, 40].map(n => (
                    <button
                      key={n}
                      className={`cb-option-btn${settings.recipeGap === n ? ' active' : ''}`}
                      onClick={() => updateSettings({ ...settings, recipeGap: n })}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    className="cb-size-input"
                    min={0}
                    max={80}
                    value={settings.recipeGap}
                    onChange={e => setSettings(s => ({ ...s, recipeGap: Number(e.target.value) }))}
                    onBlur={e => updateSettings({ ...settings, recipeGap: Math.min(80, Math.max(0, Number(e.target.value) || 40)) })}
                  />
                  <span className="cb-size-unit">pt</span>
                </div>
              </div>

              <div>
                <div className="cb-form-label">{L ? 'Recipes in this book' : 'Рецепти в книгата'}</div>
                <div className="cb-editor__recipe-list">
                  {selectedRecipes.length === 0 ? (
                    <div className="cb-recipe-list__empty">
                      {L ? 'No recipes selected.' : 'Няма избрани рецепти.'}
                    </div>
                  ) : (
                    selectedRecipes.map((r, i) => (
                      <div key={r.id} className="cb-recipe-item">
                        <span className="cb-recipe-item__num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="cb-recipe-item__emoji">{r.emoji}</span>
                        <span className="cb-recipe-item__name">{recipeDisplayName(r, lang)}</span>
                        <span className="cb-recipe-item__time">{r.time}{L ? 'm' : 'мин'}</span>
                        <button
                          className="cb-recipe-item__remove"
                          onClick={() => removeFromBook(r.id)}
                          aria-label={L ? 'Remove from cookbook' : 'Премахни от книгата'}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="cb-form-note">
                {L
                  ? 'Preview updates when you remove a recipe or click away from a text field.'
                  : 'Прегледът се обновява при премахване на рецепта или след излизане от текстово поле.'}
              </p>
            </div>

            <div className="cb-editor__preview">
              <PDFViewer key={settingsKey} width="100%" height="100%">
                <CookbookPDF
                  title={pdfSnapshot.title}
                  author={pdfSnapshot.author}
                  intro={pdfSnapshot.intro}
                  recipes={pdfSnapshot.recipes}
                  lang={lang}
                  settings={pdfSnapshot.settings}
                />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
