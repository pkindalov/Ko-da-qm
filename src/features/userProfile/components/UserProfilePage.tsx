import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/Badge';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { useUserProfile } from '../hooks/useUserProfile';
import { useRecipeFavoriteCounts } from '../hooks/useRecipeFavoriteCounts';
import { useFavorites } from '../../recipes/hooks/useFavorites';
import { recipeRisk } from '../../../shared/utils/recipeUtils';
import { DEFAULT_TWEAKS } from '../../../shared/constants/defaults';
import type { Recipe } from '../../../shared/types';

export const UserProfilePage = () => {
  const { id: userId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
  const isEnglish = tweaks.lang === 'en';

  const { userName, recipes, loading } = useUserProfile(userId);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const recipeIds = useMemo(() => recipes.map((r) => r.id), [recipes]);
  const favoriteCounts = useRecipeFavoriteCounts(recipeIds);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const themeClass =
    tweaks.theme === 'cool' ? 'theme-cool' : tweaks.theme === 'dark' ? 'theme-dark' : '';

  const displayName = userName || (isEnglish ? 'Anonymous User' : 'Анонимен потребител');

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div className={`app-shell ${themeClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>{isEnglish ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  return (
    <div className={`app-shell ${themeClass}`}>
      <main className="main-content" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="fade-in">
          <button className="btn btn-ghost btn-sm" onClick={handleBack} style={{ marginBottom: 20 }}>
            ← {isEnglish ? 'Back' : 'Назад'}
          </button>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
              👤 {displayName}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 15, marginTop: 4, fontWeight: 600 }}>
              {isEnglish
                ? `${recipes.length} public recipe${recipes.length !== 1 ? 's' : ''}`
                : `${recipes.length} публична${recipes.length !== 1 ? ' рецепти' : ' рецепта'}`}
            </div>
          </div>

          <div className="divider" />
          <div className="section-title">
            {isEnglish ? 'PUBLIC RECIPES' : 'ПУБЛИЧНИ РЕЦЕПТИ'}
          </div>

          {recipes.length === 0 ? (
            <EmptyState
              icon="🍽"
              title={isEnglish ? 'No public recipes yet' : 'Все още няма публични рецепти'}
              subtitle={isEnglish ? 'This user has not shared any recipes' : 'Този потребител не е споделил рецепти'}
            />
          ) : (
            <div className="grid-2">
              {recipes.map((r) => {
                const risk = recipeRisk(r, [], []);
                const count = favoriteCounts[r.id] ?? 0;
                return (
                  <div
                    key={r.id}
                    className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`}
                    onClick={() => setSelectedRecipe(r)}
                  >
                    <button
                      className="btn-favorite"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(r); }}
                      aria-label={favoriteIds.includes(r.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favoriteIds.includes(r.id) ? '♥' : '♡'}
                    </button>
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={isEnglish && r.nameEn ? r.nameEn : r.name} className="recipe-card-img" />
                      : <div className="recipe-emoji">{r.emoji}</div>
                    }
                    <div className="recipe-name">{isEnglish && r.nameEn ? r.nameEn : r.name}</div>
                    <div className="recipe-meta">⏱ {r.time} {isEnglish ? 'min' : 'мин'}</div>
                    {count > 0 && (
                      <div className="recipe-meta">♥ {count}</div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      {r.isAI && <Badge type="primary">✨ AI</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Modal
          open={selectedRecipe !== null}
          onClose={() => setSelectedRecipe(null)}
          contentClassName="modal-recipe"
        >
          {selectedRecipe && (
            <RecipeDetailView
              recipe={selectedRecipe}
              allergies={[]}
              dislikes={[]}
              lang={tweaks.lang}
              isOwner={false}
              isFavorite={favoriteIds.includes(selectedRecipe.id)}
              showBackButton={false}
              onBack={() => setSelectedRecipe(null)}
              onToggleFavorite={() => toggleFavorite(selectedRecipe)}
            />
          )}
        </Modal>
      </main>
    </div>
  );
};
