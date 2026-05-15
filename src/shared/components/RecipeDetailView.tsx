import { Badge } from './Badge';
import { recipeRisk } from '../utils/recipeUtils';
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
  const name = L && recipe.nameEn ? recipe.nameEn : recipe.name;

  return (
    <div className="fade-in">
      {showBackButton && (
        <button className="btn btn-ghost btn-sm recipe-detail-back" onClick={onBack}>
          ← {L ? 'Back' : 'Назад'}
        </button>
      )}

      <div className="recipe-detail-hero">
        {recipe.imageUrl
          ? <img src={recipe.imageUrl} alt={name} className="recipe-detail-hero-img" />
          : <span className="recipe-detail-emoji">{recipe.emoji}</span>
        }
        <div className="recipe-detail-name">{name}</div>
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

      <div className="card recipe-detail-card">
        <div className="recipe-detail-ingredients-row">
          {recipe.imageUrl && (
            <img src={recipe.imageUrl} alt={name} className="recipe-detail-photo" />
          )}
          <div className="recipe-detail-ingredients-col">
            <div className="recipe-detail-section-label">
              {L ? 'INGREDIENTS' : 'СЪСТАВКИ'} · {recipe.ingredients.length}
            </div>
            <div className="recipe-detail-ingredients">
              {recipe.ingredients.map((ing, i) => {
                const isAllergyIng = allergies.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
                const isBlockedIng = isAllergyIng || dislikes.some((b) => ing.toLowerCase().includes(b.toLowerCase()));
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
        {recipe.steps.map((step, i) => (
          <div key={i} className="step-item">
            <div className="step-num">{i + 1}</div>
            <div className="step-text">{step}</div>
          </div>
        ))}
      </div>

      {isOwner && (onEdit || onDelete) && (
        <div className="recipe-detail-actions">
          {onEdit && (
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>
              ✏ {L ? 'Edit' : 'Редактирай'}
            </button>
          )}
          {onDelete && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              {L ? 'Delete' : 'Изтрий'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
