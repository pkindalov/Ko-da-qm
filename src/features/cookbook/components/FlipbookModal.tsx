import { useState, useEffect, useRef } from 'react';
import type { Recipe, Language } from '../../../shared/types';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';

interface FlipbookModalProps {
  recipes: Recipe[];
  lang: Language;
  onClose: () => void;
}

type PageContent =
  | { type: 'cover' }
  | { type: 'recipe'; recipe: Recipe; index: number };

interface FlipState {
  dir: 'fwd' | 'bwd';
  fromSpread: number;
  toSpread: number;
  active: boolean;
}

export const FlipbookModal = ({ recipes, lang, onClose }: FlipbookModalProps) => {
  const isEnglish = lang === 'en';

  const pages: PageContent[] = [
    { type: 'cover' },
    ...recipes.map((r, i) => ({ type: 'recipe' as const, recipe: r, index: i })),
  ];

  const maxSpread = Math.floor(pages.length / 2) + 1;
  const [spread, setSpread] = useState(0);
  const [flipState, setFlipState] = useState<FlipState | null>(null);

  const getLeftIdx = (s: number) => (s === 0 ? -1 : 2 * s - 1);
  const getRightIdx = (s: number) => 2 * s;

  const goForward = () => {
    if (flipState !== null || spread >= maxSpread - 1) return;
    const fromSpread = spread;
    const toSpread = spread + 1;
    setFlipState({ dir: 'fwd', fromSpread, toSpread, active: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setFlipState(prev => (prev ? { ...prev, active: true } : null)),
      ),
    );
    setTimeout(() => {
      setSpread(toSpread);
      setFlipState(null);
    }, 780);
  };

  const goBackward = () => {
    if (flipState !== null || spread <= 0) return;
    const fromSpread = spread;
    const toSpread = spread - 1;
    setFlipState({ dir: 'bwd', fromSpread, toSpread, active: false });
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setFlipState(prev => (prev ? { ...prev, active: true } : null)),
      ),
    );
    setTimeout(() => {
      setSpread(toSpread);
      setFlipState(null);
    }, 780);
  };

  const goForwardRef = useRef(goForward);
  const goBackwardRef = useRef(goBackward);
  goForwardRef.current = goForward;
  goBackwardRef.current = goBackward;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goForwardRef.current();
      else if (e.key === 'ArrowLeft') goBackwardRef.current();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const renderContent = (pageIdx: number) => {
    if (pageIdx < 0 || pageIdx >= pages.length) return null;
    const page = pages[pageIdx];

    if (page.type === 'cover') {
      return (
        <div className="fbk__cover">
          <div className="fbk__cover-border" />
          <div className="fbk__cover-emoji">📖</div>
          <div className="fbk__cover-title">
            {isEnglish ? 'My Cookbook' : 'Моята книга'}
          </div>
          <div className="fbk__cover-rule" />
          <div className="fbk__cover-sub">
            {isEnglish ? 'Recipe Collection' : 'Сборник с рецепти'}
          </div>
          <div className="fbk__cover-count">
            {recipes.length}&nbsp;{isEnglish ? 'recipes' : 'рецепти'}
          </div>
        </div>
      );
    }

    const { recipe, index } = page;
    const name = recipeDisplayName(recipe, lang);
    const ingredients = isEnglish
      ? (recipe.ingredientsTranslated ?? recipe.ingredients)
      : recipe.ingredients;
    const steps = isEnglish
      ? (recipe.stepsTranslated ?? recipe.steps)
      : recipe.steps;

    return (
      <div className="fbk__page">
        <div className="fbk__page-header">
          <span className="fbk__page-num">{String(index + 1).padStart(2, '0')}</span>
          <span className="fbk__page-tag">{recipe.tags?.[0] ?? ''}</span>
          <span className="fbk__page-emoji">{recipe.emoji}</span>
        </div>

        <div className="fbk__page-title">{name}</div>
        <div className="fbk__page-meta">
          {recipe.time}&nbsp;{isEnglish ? 'min' : 'мин'}
          {(recipe.requiredIngredients ?? []).length > 0
            ? ` · ${(recipe.requiredIngredients ?? []).length} ${isEnglish ? 'ingredients' : 'съставки'}`
            : ''}
        </div>

        <div className="fbk__page-label">
          {isEnglish ? 'Ingredients' : 'Съставки'}
        </div>
        <ul className="fbk__ingredients">
          {ingredients.slice(0, 7).map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
          {ingredients.length > 7 && (
            <li className="fbk__more">
              +{ingredients.length - 7}&nbsp;{isEnglish ? 'more' : 'още'}
            </li>
          )}
        </ul>

        <div className="fbk__page-label">
          {isEnglish ? 'Method' : 'Приготвяне'}
        </div>
        <ol className="fbk__steps">
          {steps.slice(0, 3).map((step, i) => (
            <li key={i}>{step.length > 90 ? step.slice(0, 90) + '…' : step}</li>
          ))}
          {steps.length > 3 && (
            <li className="fbk__more">
              +{steps.length - 3}&nbsp;{isEnglish ? 'more steps' : 'още стъпки'}
            </li>
          )}
        </ol>

        <div className="fbk__page-folio">{index + 1}</div>
      </div>
    );
  };

  // Determine static layer indices
  let showLeft: number;
  let showRight: number;

  if (!flipState) {
    showLeft = getLeftIdx(spread);
    showRight = getRightIdx(spread);
  } else if (flipState.dir === 'fwd') {
    showLeft = getLeftIdx(flipState.fromSpread);
    showRight = getRightIdx(flipState.toSpread);
  } else {
    showLeft = getLeftIdx(flipState.toSpread);
    showRight = getRightIdx(flipState.fromSpread);
  }

  // Turning page faces
  let turningFront = -1;
  let turningBack = -1;

  if (flipState) {
    if (flipState.dir === 'fwd') {
      turningFront = getRightIdx(flipState.fromSpread);
      turningBack = getLeftIdx(flipState.toSpread);
    } else {
      turningFront = getLeftIdx(flipState.fromSpread);
      turningBack = getRightIdx(flipState.toSpread);
    }
  }

  const canBack = spread > 0 && flipState === null;
  const canFwd = spread < maxSpread - 1 && flipState === null;

  return (
    <div className="fbk-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fbk-scene" onClick={e => e.stopPropagation()}>
        <button
          className="fbk-close"
          onClick={onClose}
          aria-label={isEnglish ? 'Close flipbook' : 'Затвори книгата'}
        >
          ✕
        </button>

        <div className="fbk-book">
          {/* Left static page */}
          <div className={`fbk-half fbk-half--left${showLeft < 0 ? ' fbk-half--blank' : ''}`}>
            {renderContent(showLeft)}
          </div>

          {/* Right static page */}
          <div className={`fbk-half fbk-half--right${showRight >= pages.length ? ' fbk-half--blank' : ''}`}>
            {renderContent(showRight)}
          </div>

          {/* Spine */}
          <div className="fbk-spine" aria-hidden="true" />

          {/* Turning page during animation */}
          {flipState && (
            <div
              className={`fbk-turn fbk-turn--${flipState.dir}${flipState.active ? ' fbk-turn--active' : ''}`}
              aria-hidden="true"
            >
              <div className="fbk-turn__front">{renderContent(turningFront)}</div>
              <div className="fbk-turn__back">{renderContent(turningBack)}</div>
            </div>
          )}
        </div>

        <div className="fbk-nav">
          <button
            className="fbk-nav__btn"
            onClick={goBackward}
            disabled={!canBack}
            aria-label={isEnglish ? 'Previous page' : 'Предишна страница'}
          >
            ←
          </button>
          <span className="fbk-nav__label">
            {spread + 1}&thinsp;/&thinsp;{maxSpread}
          </span>
          <button
            className="fbk-nav__btn"
            onClick={goForward}
            disabled={!canFwd}
            aria-label={isEnglish ? 'Next page' : 'Следваща страница'}
          >
            →
          </button>
        </div>

        <p className="fbk-hint">
          {isEnglish ? '← → arrow keys to navigate · Esc to close' : '← → стрелки за навигация · Esc за затваряне'}
        </p>
      </div>
    </div>
  );
};
