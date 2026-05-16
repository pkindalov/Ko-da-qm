import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { recipeRisk } from '../../../shared/utils/recipeUtils';
import { useFavorites } from '../../recipes/hooks/useFavorites';
import { useFollows } from '../hooks/useFollows';
import { useFeedRecipes } from '../hooks/useFeedRecipes';
import type { Language, Recipe } from '../../../shared/types';

interface FeedScreenProps {
  lang: Language;
}

export const FeedScreen = ({ lang }: FeedScreenProps) => {
  const navigate = useNavigate();
  const isEnglish = lang === 'en';

  const { followingIds, loading: followsLoading } = useFollows(lang);
  const { recipes, loading: recipesLoading } = useFeedRecipes(followingIds);
  const { favoriteIds, toggleFavorite } = useFavorites(lang);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const isLoading = followsLoading || recipesLoading;

  if (isLoading) {
    return (
      <div className="fade-in" style={{ padding: 24 }}>
        <span>{isEnglish ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  if (followingIds.length === 0) {
    return (
      <div className="fade-in">
        <div className="section-title">{isEnglish ? 'YOUR FEED' : 'ВАШАТА ЛЕНТА'}</div>
        <EmptyState
          icon="👥"
          title={isEnglish ? 'You are not following anyone yet' : 'Все още не следвате никого'}
          subtitle={
            isEnglish
              ? 'Visit a user profile to start following them and see their recipes here'
              : 'Посетете профил на потребител, за да го последвате и да виждате рецептите му тук'
          }
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            {isEnglish ? 'Discover users' : 'Открийте потребители'}
          </button>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="fade-in">
        <div className="section-title">{isEnglish ? 'YOUR FEED' : 'ВАШАТА ЛЕНТА'}</div>
        <EmptyState
          icon="🍽"
          title={isEnglish ? 'Nothing here yet' : 'Все още няма рецепти'}
          subtitle={
            isEnglish
              ? 'The people you follow haven\'t shared any recipes yet'
              : 'Потребителите, които следвате, не са споделили рецепти все още'
          }
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="section-title">{isEnglish ? 'YOUR FEED' : 'ВАШАТА ЛЕНТА'}</div>
      <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
        {isEnglish
          ? `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} from people you follow`
          : `${recipes.length} рецепт${recipes.length === 1 ? 'а' : 'и'} от хора, които следвате`}
      </div>

      <div className="grid-2">
        {recipes.map((recipe) => {
          const risk = recipeRisk(recipe, [], []);
          const isFavorited = favoriteIds.includes(recipe.id);

          return (
            <div
              key={recipe.id}
              className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`}
              onClick={() => setSelectedRecipe(recipe)}
            >
              <button
                className="btn-favorite"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorited ? '♥' : '♡'}
              </button>

              {recipe.imageUrl
                ? <img src={recipe.imageUrl} alt={isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name} className="recipe-card-img" />
                : <div className="recipe-emoji">{recipe.emoji}</div>
              }

              <div className="recipe-name">{isEnglish && recipe.nameEn ? recipe.nameEn : recipe.name}</div>
              <div className="recipe-meta">⏱ {recipe.time} {isEnglish ? 'min' : 'мин'}</div>

              {recipe.authorName && recipe.authorId && (
                <div className="recipe-meta">
                  <button
                    className="btn-link"
                    onClick={(e) => { e.stopPropagation(); navigate(`/user/${recipe.authorId}`); }}
                  >
                    👤 {recipe.authorName}
                  </button>
                </div>
              )}

              <div style={{ marginTop: 6 }}>
                {recipe.isAI && <Badge type="primary">✨ AI</Badge>}
              </div>
            </div>
          );
        })}
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
            lang={lang}
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
