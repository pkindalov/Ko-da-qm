import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import { CookbookPDF } from './CookbookPDF';
import { DEFAULT_SETTINGS } from '../utils/cookbookTypes';
import type { CookbookSettings } from '../utils/cookbookTypes';
import type { Recipe, Profile, Language } from '../../../shared/types';

interface CookbookEditorPanelProps {
  initialRecipes: Recipe[];
  lang: Language;
  profile: Profile;
  onClose: () => void;
  onRemoveRecipe: (id: string) => void;
}

interface PdfSnapshot {
  title: string;
  author: string;
  intro: string;
  recipes: Recipe[];
  settings: CookbookSettings;
}

export const CookbookEditorPanel = ({ initialRecipes, lang, profile, onClose, onRemoveRecipe }: CookbookEditorPanelProps) => {
  const isEnglish = lang === 'en';
  const defaultTitle = isEnglish ? 'My Cookbook' : 'Моята готварска книга';
  const defaultAuthor = profile.name || (isEnglish ? 'A quiet cook' : 'Тих готвач');

  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(defaultAuthor);
  const [intro, setIntro] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CookbookSettings>(DEFAULT_SETTINGS);
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [settingsKey, setSettingsKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [pdfSnapshot, setPdfSnapshot] = useState<PdfSnapshot>({
    title: defaultTitle,
    author: defaultAuthor,
    intro: '',
    recipes: initialRecipes,
    settings: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const flushTextToPdf = () => {
    setPdfSnapshot(prev => ({
      ...prev,
      title: title.trim() || defaultTitle,
      author: author.trim() || defaultAuthor,
      intro: intro.trim(),
    }));
  };

  const updateSettings = (next: CookbookSettings) => {
    setSettings(next);
    setPdfSnapshot(prev => ({ ...prev, settings: next }));
    setSettingsKey(k => k + 1);
  };

  const removeRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setPdfSnapshot(prev => ({ ...prev, recipes: prev.recipes.filter(r => r.id !== id) }));
    onRemoveRecipe(id);
  };

  const saveBook = async () => {
    setSaving(true);
    const snap = {
      title: title.trim() || defaultTitle,
      author: author.trim() || defaultAuthor,
      intro: intro.trim(),
      recipes,
      settings,
    };
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
    } catch {
      toast.error(isEnglish ? 'Failed to generate PDF' : 'Грешка при генериране на PDF');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cb-editor" role="dialog" aria-modal="true" aria-label={isEnglish ? 'Cookbook editor' : 'Редактор на книгата'}>
      <div className="cb-editor__topbar">
        <span className="cb-editor__book-name">{pdfSnapshot.title}</span>
        <div className="cb-editor__topbar-actions">
          <button
            className="btn btn-primary"
            onClick={saveBook}
            disabled={saving || recipes.length === 0}
          >
            {saving
              ? (isEnglish ? 'Saving…' : 'Запазване…')
              : <>{isEnglish ? 'Save as PDF' : 'Запази като PDF'} <span aria-hidden="true">↓</span></>}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {isEnglish ? 'Close' : 'Затвори'}
          </button>
        </div>
      </div>

      <div className="cb-editor__tabs">
        <div className="cb-tabs">
          <button
            className={`cb-tab${mobileTab === 'edit' ? ' active' : ''}`}
            onClick={() => setMobileTab('edit')}
          >
            {isEnglish ? 'Edit' : 'Редакция'}
          </button>
          <button
            className={`cb-tab${mobileTab === 'preview' ? ' active' : ''}`}
            onClick={() => { flushTextToPdf(); setMobileTab('preview'); }}
          >
            {isEnglish ? 'Preview' : 'Преглед'}
          </button>
        </div>
      </div>

      <div className="cb-editor__body" data-mobile-tab={mobileTab}>
        <div className="cb-editor__panel">
          <div>
            <label className="input-label">{isEnglish ? 'Book title' : 'Заглавие'}</label>
            <input
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={flushTextToPdf}
              placeholder={defaultTitle}
            />
          </div>
          <div>
            <label className="input-label">{isEnglish ? 'Author' : 'Автор'}</label>
            <input
              className="input-field"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              onBlur={flushTextToPdf}
              placeholder={isEnglish ? 'Your name' : 'Твоето име'}
            />
          </div>
          <div>
            <label className="input-label">
              {isEnglish ? 'Dedication (optional)' : 'Посвещение (по избор)'}
            </label>
            <input
              className="input-field"
              value={intro}
              onChange={e => setIntro(e.target.value)}
              onBlur={flushTextToPdf}
              placeholder={isEnglish ? 'Cooked from a small kitchen, with love.' : 'Готвено в малка кухня, с любов.'}
            />
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Body font' : 'Шрифт на текста'}</div>
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
            <div className="cb-form-label">{isEnglish ? 'Body text size' : 'Размер на текст'}</div>
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
                onBlur={e => { const raw = Number(e.target.value); const n = Math.min(18, Math.max(6, e.target.value.trim() === '' || Number.isNaN(raw) ? 11 : raw)); if (n !== pdfSnapshot.settings.bodySize) updateSettings({ ...settings, bodySize: n }); }}
              />
              <span className="cb-size-unit">pt</span>
            </div>
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Heading size' : 'Размер на заглавие'}</div>
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
                onBlur={e => { const raw = Number(e.target.value); const n = Math.min(52, Math.max(14, e.target.value.trim() === '' || Number.isNaN(raw) ? 42 : raw)); if (n !== pdfSnapshot.settings.titleSize) updateSettings({ ...settings, titleSize: n }); }}
              />
              <span className="cb-size-unit">pt</span>
            </div>
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Top/bottom margin' : 'Поле горе/долу'}</div>
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
                onBlur={e => { const raw = Number(e.target.value); const n = Math.min(80, Math.max(10, e.target.value.trim() === '' || Number.isNaN(raw) ? 54 : raw)); if (n !== pdfSnapshot.settings.pageMarginV) updateSettings({ ...settings, pageMarginV: n }); }}
              />
              <span className="cb-size-unit">pt</span>
            </div>
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Left/right margin' : 'Поле ляво/дясно'}</div>
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
                onBlur={e => { const raw = Number(e.target.value); const n = Math.min(80, Math.max(10, e.target.value.trim() === '' || Number.isNaN(raw) ? 48 : raw)); if (n !== pdfSnapshot.settings.pageMarginH) updateSettings({ ...settings, pageMarginH: n }); }}
              />
              <span className="cb-size-unit">pt</span>
            </div>
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Gap between recipes' : 'Разстояние между рецепти'}</div>
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
                onBlur={e => { const raw = Number(e.target.value); const n = Math.min(80, Math.max(0, e.target.value.trim() === '' || Number.isNaN(raw) ? 40 : raw)); if (n !== pdfSnapshot.settings.recipeGap) updateSettings({ ...settings, recipeGap: n }); }}
              />
              <span className="cb-size-unit">pt</span>
            </div>
          </div>

          <div>
            <div className="cb-form-label">{isEnglish ? 'Recipes in this book' : 'Рецепти в книгата'}</div>
            <div className="cb-editor__recipe-list">
              {recipes.length === 0 ? (
                <div className="cb-recipe-list__empty">
                  {isEnglish ? 'No recipes selected.' : 'Няма избрани рецепти.'}
                </div>
              ) : (
                recipes.map((r, i) => (
                  <div key={r.id} className="cb-recipe-item">
                    <span className="cb-recipe-item__num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="cb-recipe-item__emoji">{r.emoji}</span>
                    <span className="cb-recipe-item__name">{recipeDisplayName(r, lang)}</span>
                    <span className="cb-recipe-item__time">{r.time}{isEnglish ? 'm' : 'мин'}</span>
                    <button
                      className="cb-recipe-item__remove"
                      onClick={() => removeRecipe(r.id)}
                      aria-label={isEnglish ? 'Remove from cookbook' : 'Премахни от книгата'}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="cb-form-note">
            {isEnglish
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
  );
};
