import { useState } from 'react';
import { Badge } from './Badge';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { SaveTranslationModal } from './SaveTranslationModal';
import { recipeRisk } from '../utils/recipeUtils';
import { toast } from 'sonner';
import { openGoogleTranslate } from '../utils/openGoogleTranslate';
import type { Recipe, Language } from '../types';

interface RecipeDetailViewProps {
  recipe: Recipe;
  allergies: string[];
  dislikes: string[];
  lang: Language;
  isOwner: boolean;
  isFavorite?: boolean;
  favoriteCount?: number;
  showBackButton?: boolean;
  onBack: () => void;
  onToggleFavorite?: () => void;
  onAuthorClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSaveTranslation?: (name: string, ingredients: string[], steps: string[]) => Promise<void>;
}

export const RecipeDetailView = ({
  recipe,
  allergies,
  dislikes,
  lang,
  isOwner,
  isFavorite = false,
  favoriteCount,
  showBackButton = true,
  onBack,
  onToggleFavorite,
  onAuthorClick,
  onEdit,
  onDelete,
  onSaveTranslation,
}: RecipeDetailViewProps) => {
  const isEnglish = lang === 'en';
  const risk = recipeRisk(recipe, allergies, dislikes);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [saveTranslationOpen, setSaveTranslationOpen] = useState(false);
  const hasTranslation = recipe.ingredientsTranslated != null && recipe.ingredientsTranslated.length > 0;
  const [showTranslated, setShowTranslated] = useState(lang === 'bg' && hasTranslation);

  const showTranslateButton = lang === 'bg' && !recipe.isAI && recipe.nameEn != null && recipe.nameEn !== '';

  const handleTranslate = async () => {
    const { clipboardUsed } = await openGoogleTranslate(recipe);
    if (clipboardUsed) {
      toast.info('Рецептата е копирана. Натисни Ctrl+V в Google Translate.');
    }
  };

  const displayName = lang === 'bg' && showTranslated && recipe.nameTranslated
    ? recipe.nameTranslated
    : (isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name);
  const displayIngredients = lang === 'bg' && showTranslated && recipe.ingredientsTranslated
    ? recipe.ingredientsTranslated
    : recipe.ingredients;
  const displaySteps = lang === 'bg' && showTranslated && recipe.stepsTranslated
    ? recipe.stepsTranslated
    : recipe.steps;

  return (
    <div className="fade-in">
      {showBackButton && (
        <button className="detail-back" onClick={onBack}>
          ← {isEnglish ? 'Back to recipes' : 'Към рецептите'}
        </button>
      )}

      <div className="detail-hero">
        <div className="detail-image">
          <div className="recipe-image-stripes" />
          {recipe.imageUrl
            ? <img src={recipe.imageUrl} alt={displayName} />
            : <span className="detail-image-emoji">{recipe.emoji}</span>
          }
        </div>
        <div className="detail-head">
          <div className="eyebrow">
            {recipe.tags?.[0] ?? (isEnglish ? 'recipe' : 'рецепта')} · {recipe.time} {isEnglish ? 'min' : 'мин'}
          </div>
          <h1 className="h-title italic">{displayName}</h1>
          <div className="detail-head-badges">
            <Badge type={risk === 'safe' ? 'safe' : risk === 'allergy' ? 'allergy' : 'dislike'}>
              <span className={`dot dot-${risk === 'safe' ? 'safe' : 'danger'}`} />
              {risk === 'safe'    && (isEnglish ? 'Safe for you'          : 'Безопасно')}
              {risk === 'dislike' && (isEnglish ? 'Contains restrictions' : 'Съдържа ограничения')}
              {risk === 'allergy' && (isEnglish ? 'Contains allergens!'   : 'Съдържа алергени!')}
            </Badge>
            <span className="badge badge-neutral">{recipe.time} {isEnglish ? 'minutes' : 'минути'}</span>
            {recipe.isAI && <Badge type="primary">AI</Badge>}
            {recipe.isPublic && !isOwner && (
              <span className="badge badge-neutral">{isEnglish ? 'Community' : 'Общност'}</span>
            )}
          </div>
          {recipe.authorName && !isOwner && (
            <div className="detail-head-author">
              {isEnglish ? 'by' : 'от'}{' '}
              {onAuthorClick
                ? <button onClick={onAuthorClick} className="author-link">{recipe.authorName}</button>
                : <strong>{recipe.authorName}</strong>
              }
            </div>
          )}
          {!isOwner && onToggleFavorite && (
            <button className="btn btn-secondary btn-sm" onClick={onToggleFavorite}>
              {isFavorite
                ? (isEnglish ? '♥ Saved' : '♥ Запазена')
                : (isEnglish ? '♡ Save to favorites' : '♡ Запази в любими')}
              {favoriteCount != null && favoriteCount > 0 && (
                <span className="favorite-count">({favoriteCount})</span>
              )}
            </button>
          )}
          {lang === 'bg' && hasTranslation && (
            <div className="lang-toggle">
              <button
                className={`chip${!showTranslated ? ' selected' : ''}`}
                onClick={() => setShowTranslated(false)}
              >
                Оригинал
              </button>
              <button
                className={`chip${showTranslated ? ' selected' : ''}`}
                onClick={() => setShowTranslated(true)}
              >
                Превод
              </button>
            </div>
          )}
          {showTranslateButton && (
            <button className="btn btn-ghost btn-sm mt-2" onClick={handleTranslate}>
              🌐 Преведи на български
            </button>
          )}
          {isOwner && onSaveTranslation != null && showTranslateButton && (
            <button
              className="btn btn-ghost btn-sm mt-1"
              onClick={() => setSaveTranslationOpen(true)}
            >
              💾 {hasTranslation ? 'Обнови превода' : 'Запази превод'}
            </button>
          )}
          {isOwner && (onEdit || onDelete) && (
            <div className="detail-actions">
              {onEdit && (
                <button className="btn btn-secondary btn-sm" onClick={onEdit}>
                  ✏ {isEnglish ? 'Edit' : 'Редактирай'}
                </button>
              )}
              {onDelete && (
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteOpen(true)}>
                  {isEnglish ? 'Delete' : 'Изтрий'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2 recipe-detail-grid">
        <div>
          <div className="section-eyebrow">
            <span className="label">{isEnglish ? 'Ingredients' : 'Съставки'}</span>
          </div>
          {displayIngredients.map((ing) => {
            const isAllergyIng = allergies.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
            const isBlockedIng = isAllergyIng || dislikes.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
            return (
              <div key={ing} className={`ing-row${isBlockedIng ? ' blocked' : ''}`}>
                <span className={`dot ${isBlockedIng ? 'dot-danger' : 'dot-safe'}`} />
                <span className="ing-name">{ing}</span>
                {isBlockedIng && (
                  <Badge type={isAllergyIng ? 'allergy' : 'dislike'}>
                    {isAllergyIng ? (isEnglish ? 'allergy' : 'алергия') : (isEnglish ? 'dislike' : 'нелюб.')}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        <div>
          <div className="section-eyebrow">
            <span className="label">{isEnglish ? 'Method' : 'Метод'}</span>
          </div>
          <div className="step-grid">
            {displaySteps.map((step, stepIndex) => (
              <div key={step} className="step">
                <span className="step-num">{String(stepIndex + 1).padStart(2, '0')}</span>
                <div className="step-text">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {onDelete && (
        <ConfirmDeleteModal
          open={confirmDeleteOpen}
          itemName={isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name}
          lang={lang}
          onConfirm={() => { setConfirmDeleteOpen(false); onDelete(); }}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}

      {onSaveTranslation != null && (
        <SaveTranslationModal
          open={saveTranslationOpen}
          lang={lang}
          onConfirm={onSaveTranslation}
          onCancel={() => setSaveTranslationOpen(false)}
        />
      )}
    </div>
  );
};
