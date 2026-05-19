import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/Badge';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { useUserProfile } from '../hooks/useUserProfile';
import { recipeDisplayName } from '../../../shared/utils/recipeDisplayName';
import { useRecipeFavoriteCounts } from '../hooks/useRecipeFavoriteCounts';
import { useFavorites } from '../../recipes/hooks/useFavorites';
import { useFollows } from '../../feed/hooks/useFollows';
import { useFollowerCount } from '../../feed/hooks/useFollowerCount';
import { DEFAULT_TWEAKS } from '../../../shared/constants/defaults';
import type { Recipe } from '../../../shared/types';

export const UserProfilePage = () => {
  const { id: userId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tweaks] = useLocalStorage('kdq_tweaks', DEFAULT_TWEAKS);
  const L = tweaks.lang === 'en';

  const { userName, recipes, loading } = useUserProfile(userId);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const recipeIds = useMemo(() => recipes.map((r) => r.id), [recipes]);
  const favoriteCounts = useRecipeFavoriteCounts(recipeIds);
  const { followingIds, currentUserId, toggleFollow } = useFollows(tweaks.lang);
  const followerCount = useFollowerCount(userId);

  const isFollowing = followingIds.includes(userId);
  const isOwnProfile = Boolean(currentUserId) && currentUserId === userId;

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const themeClass = tweaks.theme === 'cool' ? 'theme-cool' : tweaks.theme === 'dark' ? 'theme-dark' : '';
  const displayName = userName || (L ? 'Anonymous User' : 'Анонимен потребител');

  if (loading) {
    return (
      <div className={themeClass} style={{ minHeight: '100dvh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="eyebrow">{L ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  return (
    <div className={themeClass} style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <div className="main-content">
        <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
          <button className="detail-back" onClick={() => navigate(-1)}>
            ← {L ? 'Back' : 'Назад'}
          </button>

          <div className="page-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                {L ? 'Profile' : 'Профил'}
              </div>
              <h1 className="h-title italic">{displayName}</h1>
              <div className="page-head-sub">
                {recipes.length}{' '}
                {L
                  ? `public recipe${recipes.length !== 1 ? 's' : ''}`
                  : `публична${recipes.length !== 1 ? ' рецепти' : ' рецепта'}`}
                {' · '}
                {followerCount}{' '}
                {L
                  ? `follower${followerCount !== 1 ? 's' : ''}`
                  : `последовател${followerCount !== 1 ? 'и' : ''}`}
              </div>
            </div>
            {!isOwnProfile && (
              <div>
                <button
                  className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => toggleFollow(userId)}
                >
                  {isFollowing ? (L ? 'Unfollow' : 'Отписване') : (L ? 'Follow' : 'Следвай')}
                </button>
              </div>
            )}
          </div>

          {recipes.length > 0 && (
            <div className="section-eyebrow">
              <span className="label">{L ? 'Public recipes' : 'Публични рецепти'}</span>
            </div>
          )}

          {recipes.length === 0 ? (
            <EmptyState
              icon="🍽"
              title={L ? 'No public recipes yet' : 'Все още няма публични рецепти'}
              subtitle={L ? 'This user has not shared any recipes' : 'Този потребител не е споделил рецепти'}
            />
          ) : (
            <div className="grid-3">
              {recipes.map((r) => {
                const name = recipeDisplayName(r, tweaks.lang);
                const tag = r.tags?.[0] ?? (L ? 'recipe' : 'рецепта');
                const count = favoriteCounts[r.id] ?? 0;
                return (
                  <div key={r.id} className="recipe-card" onClick={() => setSelectedRecipe(r)}>
                    <div className="recipe-image">
                      <div className="recipe-image-stripes" />
                      {r.imageUrl
                        ? <img src={r.imageUrl} alt={name} className="recipe-card-img" />
                        : <div className="recipe-image-emoji">{r.emoji}</div>
                      }
                      <div className="recipe-image-label">{tag} · {r.time}min</div>
                      <button
                        className="btn-favorite"
                        style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(r); }}
                        aria-label={favoriteIds.includes(r.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {favoriteIds.includes(r.id) ? '♥' : '♡'}
                      </button>
                    </div>
                    <div className="recipe-body">
                      <div className="recipe-name italic">{name}</div>
                      <div className="recipe-meta">{r.time} {L ? 'min' : 'мин'}</div>
                      <div className="recipe-tags">
                        {r.isAI && <Badge type="primary">AI</Badge>}
                        {count > 0 && <span className="badge badge-neutral">♥ {count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
    </div>
  );
};
