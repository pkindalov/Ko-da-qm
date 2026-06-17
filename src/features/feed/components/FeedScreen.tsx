import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import { toImgurThumbnail } from '../../../shared/utils/imageUrl';
import './FeedScreen.css';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { recipeRisk } from '../../../shared/utils/recipeUtils';
import { recipeDisplayName, localizeMealTag } from '../../../shared/utils/recipeDisplayName';
import { useFavorites } from '../../recipes/hooks/useFavorites';
import { useFollows } from '../hooks/useFollows';
import { useFeedRecipes } from '../hooks/useFeedRecipes';
import type { Language, Recipe } from '../../../shared/types';

interface FeedScreenProps {
  lang: Language;
  allergies: string[];
  dislikes: string[];
}

export const FeedScreen = ({ lang, allergies, dislikes }: FeedScreenProps) => {
  const navigate = useNavigate();
  const isEnglish = lang === 'en';

  const { followingIds, loading: followsLoading } = useFollows(lang);
  const { recipes, loading: recipesLoading } = useFeedRecipes(followingIds, !followsLoading);
  const { favoriteIds, toggleFavorite } = useFavorites(lang);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const isLoading = followsLoading || recipesLoading;

  if (isLoading) {
    return (
      <div className="fade-in feed-loading">
        <span>{isEnglish ? 'Loading…' : 'Зареждане…'}</span>
      </div>
    );
  }

  if (followingIds.length === 0) {
    return (
      <div className="fade-in">
        <div className="topbar">
          <div className="breadcrumb">{isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Feed' : 'Лента'}</span></div>
        </div>
        <EmptyState
          icon="👥"
          title={isEnglish ? 'You are not following anyone yet' : 'Все още не следвате никого'}
          subtitle={
            isEnglish
              ? 'Visit a user profile to start following them and see their recipes here'
              : 'Посетете профил на потребител, за да го последвате и да виждате рецептите му тук'
          }
        />
        <div className="feed-discover-actions">
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
        <div className="topbar">
          <div className="breadcrumb">{isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Feed' : 'Лента'}</span></div>
        </div>
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
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Feed' : 'Лента'}</span>
        </div>
        <div className="topbar-actions">
          <div className="topbar-date feed-recipe-count">
            {isEnglish
              ? `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} from people you follow`
              : `${recipes.length} рецепт${recipes.length === 1 ? 'а' : 'и'} от хора, които следвате`}
          </div>
        </div>
      </div>

      <div className="grid-3">
        {recipes.map((recipe) => {
          const risk = recipeRisk(recipe, allergies, dislikes);
          const isFavorited = favoriteIds.includes(recipe.id);
          const name = recipeDisplayName(recipe, lang);
          const tag = localizeMealTag(recipe.tags?.[0], isEnglish, isEnglish ? 'recipe' : 'рецепта');

          return (
            <div
              key={recipe.id}
              className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`}
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="recipe-image">
                <div className="recipe-image-stripes" />
                {(recipe.imageUrls?.[0] ?? recipe.imageUrl)
                  ? <img src={toImgurThumbnail(recipe.imageUrls?.[0] ?? recipe.imageUrl ?? '')} alt={name} className="recipe-card-img" loading="lazy" />
                  : <div className="recipe-image-emoji">{recipe.emoji}</div>}
                <div className="recipe-image-label">{tag} · {recipe.time}min</div>
                <button
                  className="btn-favorite"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}
                  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavorited ? '♥' : '♡'}
                </button>
              </div>
              <div className="recipe-body">
                <div className="recipe-name italic">{name}</div>
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
                <div className="recipe-tags">
                  {recipe.isAI && <Badge type="primary">✨ AI</Badge>}
                  {risk === 'safe'    && <Badge type="safe"><span className="dot dot-safe" /> {isEnglish ? 'safe' : 'безопасно'}</Badge>}
                  {risk === 'dislike' && <Badge type="dislike"><span className="dot dot-warn" /> {isEnglish ? 'check' : 'провери'}</Badge>}
                  {risk === 'allergy' && <Badge type="allergy"><span className="dot dot-danger" /> {isEnglish ? 'allergy' : 'алергия'}</Badge>}
                </div>
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
            allergies={allergies}
            dislikes={dislikes}
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
