import { useState } from 'react';
import { Badge } from './Badge';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { recipeRisk } from '../utils/recipeUtils';
import { translateRecipe, type TranslatedRecipe } from '../utils/translateRecipe';
import { isLimitReached } from '../utils/translateUsage';
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
}: RecipeDetailViewProps) => {
  const L = lang === 'en';
  const risk = recipeRisk(recipe, allergies, dislikes);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<TranslatedRecipe | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(() => isLimitReached());
  const [compareMode, setCompareMode] = useState(false);

  const showTranslateButton = lang === 'bg' && !recipe.isAI && recipe.nameEn != null && recipe.nameEn !== '';

  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const result = await translateRecipe({
        name: recipe.nameEn ?? recipe.name,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      });
      setTranslatedContent(result);
    } catch {
      setTranslateError('Преводът не успя. Опитайте отново.');
    } finally {
      setIsTranslating(false);
      setLimitReached(isLimitReached());
    }
  };

  const displayName = translatedContent?.name ?? (L && recipe.nameEn ? recipe.nameEn : recipe.name);
  const displayIngredients = translatedContent?.ingredients ?? recipe.ingredients;
  const displaySteps = translatedContent?.steps ?? recipe.steps;

  return (
    <div className="fade-in">
      {showBackButton && (
        <button className="btn btn-ghost btn-sm recipe-detail-back" onClick={onBack}>
          ← {L ? 'Back' : 'Назад'}
        </button>
      )}

      <div className="recipe-detail-hero">
        {recipe.imageUrl
          ? <img src={recipe.imageUrl} alt={displayName} className="recipe-detail-hero-img" />
          : <span className="recipe-detail-emoji">{recipe.emoji}</span>
        }
        <div className="recipe-detail-name">{displayName}</div>
        <div className="recipe-detail-badges">
          <Badge type={risk === 'safe' ? 'safe' : risk === 'allergy' ? 'allergy' : 'dislike'}>
            {risk === 'safe'    && (L ? '✓ Safe for you'          : '✓ Безопасно')}
            {risk === 'dislike' && (L ? '⚠ Contains restrictions' : '⚠ Съдържа ограничения')}
            {risk === 'allergy' && (L ? '⚠ Contains allergens!'   : '⚠ Съдържа алергени!')}
          </Badge>
          <span className="badge badge-neutral">⏱ {recipe.time} {L ? 'min' : 'мин'}</span>
          {recipe.isAI && <Badge type="primary">✨ AI</Badge>}
          {recipe.isPublic && !isOwner && (
            <span className="badge badge-neutral">🌐 {L ? 'Community' : 'Общност'}</span>
          )}
        </div>
        {recipe.authorName && !isOwner && (
          <div className="recipe-detail-author">
            👤 {L ? 'by' : 'от'}{' '}
            {onAuthorClick
              ? <button onClick={onAuthorClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--primary)', padding: 0 }}>{recipe.authorName}</button>
              : <strong>{recipe.authorName}</strong>
            }
          </div>
        )}
        {!isOwner && onToggleFavorite && (
          <button className="btn btn-ghost btn-sm" onClick={onToggleFavorite} style={{ marginTop: 12 }}>
            {isFavorite
              ? (L ? '♥ Saved' : '♥ Запазена')
              : (L ? '♡ Save to favorites' : '♡ Запази в любими')}
            {favoriteCount != null && favoriteCount > 0 && (
              <span style={{ marginLeft: 6, color: 'var(--text2)', fontWeight: 600 }}>({favoriteCount})</span>
            )}
          </button>
        )}
      </div>

      {showTranslateButton && (
        <div className="translate-section">
          {limitReached ? (
            <span className="translate-limit-msg">
              🌐 Преводът е недостъпен днес. Опитайте утре.
            </span>
          ) : translatedContent ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => { setTranslatedContent(null); setCompareMode(false); }}>
                ↩ Оригинал
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCompareMode((m) => !m)}>
                {compareMode ? '⇄ Затвори' : '⇄ Сравни'}
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              {isTranslating ? 'Превежда...' : '🌐 Преведи на български'}
            </button>
          )}
          {translateError && <span className="translate-error">{translateError}</span>}
        </div>
      )}

      {compareMode && translatedContent ? (
        <>
          <div className="card recipe-detail-card">
            <div className="compare-grid">
              <div className="compare-col">
                <div className="compare-col-label">🔤 Оригинал · СЪСТАВКИ</div>
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="compare-item">{ing}</div>
                ))}
              </div>
              <div className="compare-col">
                <div className="compare-col-label">🇧🇬 Превод · СЪСТАВКИ</div>
                {translatedContent.ingredients.map((ing, i) => (
                  <div key={i} className="compare-item">{ing}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="card recipe-detail-card">
            <div className="compare-grid">
              <div className="compare-col">
                <div className="compare-col-label">🔤 Оригинал · СТЪПКИ</div>
                {recipe.steps.map((s, i) => (
                  <div key={i} className="compare-item">{i + 1}. {s}</div>
                ))}
              </div>
              <div className="compare-col">
                <div className="compare-col-label">🇧🇬 Превод · СТЪПКИ</div>
                {translatedContent.steps.map((s, i) => (
                  <div key={i} className="compare-item">{i + 1}. {s}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card recipe-detail-card">
            <div className="recipe-detail-ingredients-row">
              {recipe.imageUrl && (
                <img src={recipe.imageUrl} alt={displayName} className="recipe-detail-photo" />
              )}
              <div className="recipe-detail-ingredients-col">
                <div className="recipe-detail-section-label">
                  {L ? 'INGREDIENTS' : 'СЪСТАВКИ'} · {displayIngredients.length}
                </div>
                <div className="recipe-detail-ingredients">
                  {displayIngredients.map((ing, i) => {
                    const originalIng = recipe.ingredients[i] ?? ing;
                    const isAllergyIng = allergies.some((b) => originalIng.toLowerCase().includes(b.toLowerCase()));
                    const isBlockedIng = isAllergyIng || dislikes.some((b) => originalIng.toLowerCase().includes(b.toLowerCase()));
                    return (
                      <div key={i} className="recipe-detail-ingredient">
                        <span className={`ingredient-bullet ${isBlockedIng ? 'ingredient-bullet-blocked' : 'ingredient-bullet-safe'}`} />
                        <span className={isBlockedIng ? 'ingredient-text-blocked' : ''}>
                          {ing}
                        </span>
                        {isBlockedIng && (
                          <Badge type={isAllergyIng ? 'allergy' : 'dislike'}>
                            {isAllergyIng ? (L ? 'Allergy' : 'Алергия') : (L ? 'Dislike' : 'Нелюбимо')}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="card recipe-detail-card">
            <div className="recipe-detail-section-label">{L ? 'STEPS' : 'СТЪПКИ'}</div>
            {displaySteps.map((step, i) => (
              <div key={i} className="step-item">
                <div className="step-num">{i + 1}</div>
                <div className="step-text">{step}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {isOwner && (onEdit || onDelete) && (
        <div className="recipe-detail-actions">
          {onEdit && (
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>
              ✏ {L ? 'Edit' : 'Редактирай'}
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteOpen(true)}>
              {L ? 'Delete' : 'Изтрий'}
            </button>
          )}
        </div>
      )}

      {onDelete && (
        <ConfirmDeleteModal
          open={confirmDeleteOpen}
          itemName={L && recipe.nameEn ? recipe.nameEn : recipe.name}
          lang={lang}
          onConfirm={() => { setConfirmDeleteOpen(false); onDelete(); }}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      )}
    </div>
  );
};
