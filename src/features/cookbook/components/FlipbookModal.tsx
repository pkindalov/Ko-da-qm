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

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const [spread, setSpread] = useState(0);
  const [flipState, setFlipState] = useState<FlipState | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const update = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Reset when switching between single-page and two-page modes (device rotation).
  // Also cancels any in-flight flip timer so it can't overwrite the reset spread,
  // and serves as the unmount cleanup via the returned teardown function.
  useEffect(() => {
    if (flipTimerRef.current !== null) clearTimeout(flipTimerRef.current);
    setSpread(0);
    setFlipState(null);
    return () => { if (flipTimerRef.current !== null) clearTimeout(flipTimerRef.current); };
  }, [isMobile]);

  // Desktop: spread 0 = blank+cover, spread k = pages[2k-1]+pages[2k]
  // Mobile:  one page per spread, left always blank
  const maxSpread = isMobile ? pages.length : Math.floor(pages.length / 2) + 1;

  const getLeftIdx = (s: number) => {
    if (isMobile) return -1;
    return s === 0 ? -1 : 2 * s - 1;
  };
  const getRightIdx = (s: number) => (isMobile ? s : 2 * s);

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
    flipTimerRef.current = setTimeout(() => {
      flipTimerRef.current = null;
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
    flipTimerRef.current = setTimeout(() => {
      flipTimerRef.current = null;
      setSpread(toSpread);
      setFlipState(null);
    }, 780);
  };

  const goForwardRef = useRef(goForward);
  const goBackwardRef = useRef(goBackward);
  goForwardRef.current = goForward;
  goBackwardRef.current = goBackward;

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only trigger if clearly horizontal (not a vertical scroll attempt)
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) goForwardRef.current();
    else goBackwardRef.current();
  };

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
          {/* Double-rule frame */}
          <div className="fbk__cover-frame" aria-hidden="true" />

          {/* Corner tick marks */}
          <div className="fbk__cover-corner fbk__cover-corner--tl" aria-hidden="true" />
          <div className="fbk__cover-corner fbk__cover-corner--tr" aria-hidden="true" />
          <div className="fbk__cover-corner fbk__cover-corner--bl" aria-hidden="true" />
          <div className="fbk__cover-corner fbk__cover-corner--br" aria-hidden="true" />

          <div className="fbk__cover-inner">
            {/* Eyebrow with fading rules */}
            <div className="fbk__cover-eyebrow">
              <div className="fbk__cover-rule" />
              <span>{isEnglish ? 'Recipe Collection' : 'Сборник рецепти'}</span>
              <div className="fbk__cover-rule" />
            </div>

            {/* Botanical ornament */}
            <svg className="fbk__cover-wreath" viewBox="0 0 120 36" fill="currentColor" aria-hidden="true">
              <path d="M8,22 Q25,15 45,18" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.45"/>
              <ellipse cx="18" cy="16" rx="9" ry="3.5" transform="rotate(-22 18 16)" opacity="0.55"/>
              <ellipse cx="30" cy="14" rx="8" ry="3" transform="rotate(-10 30 14)" opacity="0.5"/>
              <ellipse cx="41" cy="15" rx="6" ry="2.5" transform="rotate(-4 41 15)" opacity="0.42"/>
              <path d="M112,22 Q95,15 75,18" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.45"/>
              <ellipse cx="102" cy="16" rx="9" ry="3.5" transform="rotate(22 102 16)" opacity="0.55"/>
              <ellipse cx="90" cy="14" rx="8" ry="3" transform="rotate(10 90 14)" opacity="0.5"/>
              <ellipse cx="79" cy="15" rx="6" ry="2.5" transform="rotate(4 79 15)" opacity="0.42"/>
              <path d="M60,9 L66,18 L60,27 L54,18 Z" opacity="0.9"/>
            </svg>

            {/* Title */}
            <div className="fbk__cover-title">
              {isEnglish ? 'My Cookbook' : 'Моята книга'}
            </div>

            {/* Divider rule with center diamond */}
            <div className="fbk__cover-divider" aria-hidden="true">
              <div className="fbk__cover-rule" />
              <span className="fbk__cover-diamond">◆</span>
              <div className="fbk__cover-rule" />
            </div>

            {/* Recipe count */}
            <div className="fbk__cover-count">
              {recipes.length}&thinsp;{isEnglish ? 'curated recipes' : 'подбрани рецепти'}
            </div>
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

    // Mobile is scrollable so show everything; desktop is fixed height so truncate
    const maxIngredients = isMobile ? ingredients.length : 7;
    const maxSteps = isMobile ? steps.length : 3;
    const maxStepLen = isMobile ? Infinity : 90;

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
          {ingredients.slice(0, maxIngredients).map((ing, i) => (
            <li key={i}>{ing}</li>
          ))}
          {ingredients.length > maxIngredients && (
            <li className="fbk__more">
              +{ingredients.length - maxIngredients}&nbsp;{isEnglish ? 'more' : 'още'}
            </li>
          )}
        </ul>

        <div className="fbk__page-label">
          {isEnglish ? 'Method' : 'Приготвяне'}
        </div>
        <ol className="fbk__steps">
          {steps.slice(0, maxSteps).map((step, i) => (
            <li key={i}>{maxStepLen !== Infinity && step.length > maxStepLen ? step.slice(0, maxStepLen) + '…' : step}</li>
          ))}
          {steps.length > maxSteps && (
            <li className="fbk__more">
              +{steps.length - maxSteps}&nbsp;{isEnglish ? 'more steps' : 'още стъпки'}
            </li>
          )}
        </ol>

        <div className="fbk__page-folio">{index + 1}</div>
      </div>
    );
  };

  // Compute what to display in each layer
  let showLeft: number;
  let showRight: number;
  let turningFront = -1;
  let turningBack = -1;

  if (!flipState) {
    showLeft = getLeftIdx(spread);
    showRight = getRightIdx(spread);
  } else if (isMobile) {
    // Mobile: turning page is the current page flipping away; destination page is underneath
    showLeft = -1;
    showRight = getRightIdx(flipState.toSpread);
    turningFront = getRightIdx(flipState.fromSpread);
    turningBack = -1;
  } else if (flipState.dir === 'fwd') {
    showLeft = getLeftIdx(flipState.fromSpread);
    showRight = getRightIdx(flipState.toSpread);
    turningFront = getRightIdx(flipState.fromSpread);
    turningBack = getLeftIdx(flipState.toSpread);
  } else {
    showLeft = getLeftIdx(flipState.toSpread);
    showRight = getRightIdx(flipState.fromSpread);
    turningFront = getLeftIdx(flipState.fromSpread);
    turningBack = getRightIdx(flipState.toSpread);
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

        <div
          className={`fbk-book${isMobile ? ' fbk-book--single' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`fbk-half fbk-half--left${showLeft < 0 ? ' fbk-half--blank' : ''}`}>
            {renderContent(showLeft)}
          </div>

          <div className={`fbk-half fbk-half--right${showRight >= pages.length ? ' fbk-half--blank' : ''}`}>
            {renderContent(showRight)}
          </div>

          <div className="fbk-spine" aria-hidden="true" />

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
          {isEnglish
            ? '← → arrow keys to navigate · Esc to close'
            : '← → стрелки за навигация · Esc за затваряне'}
        </p>
      </div>
    </div>
  );
};
