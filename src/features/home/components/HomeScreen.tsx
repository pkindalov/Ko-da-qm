import { useState } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Modal } from '../../../shared/components/Modal';
import { RecipeDetailView } from '../../../shared/components/RecipeDetailView';
import { isSafe, recipeRisk } from '../../../shared/utils/recipeUtils';
import { getGreeting } from '../../../shared/utils/greeting';
import type { Profile, Recipe, FridgeItem, Language, Tab, Product } from '../../../shared/types';

interface HomeScreenProps {
  profile: Profile;
  recipes: Recipe[];
  fridge: FridgeItem[];
  publicRecipes: Recipe[];
  products: Product[];
  setTab: (tab: Tab) => void;
  lang: Language;
}

export function HomeScreen({ profile, recipes, fridge, publicRecipes, products, setTab, lang }: HomeScreenProps) {
  const L = lang === 'en';
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const toNames = (list: Product[]) => list.flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]);
  const allergies = [...profile.allergies, ...toNames(products.filter(p => p.status === 'allergic'))];
  const dislikes  = [...profile.dislikes,  ...toNames(products.filter(p => p.status === 'disliked'))];
  const blocked   = [...allergies, ...dislikes];
  const safeRecipes = recipes.filter((r) => isSafe(r, blocked));
  const greeting = getGreeting(new Date().getHours(), lang);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>
          {greeting}{profile.name ? `, ${profile.name}` : ''}! 👋
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 15, marginTop: 4, fontWeight: 600 }}>
          {L ? 'What are we eating today?' : 'Какво ядем днес?'}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{safeRecipes.length}</div>
          <div className="stat-label">{L ? 'safe recipes' : 'безопасни рецепти'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--secondary)' }}>{fridge.length}</div>
          <div className="stat-label">{L ? 'fridge items' : 'в хладилника'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('profile')}>
          <div className="stat-num" style={{ color: 'var(--danger)' }}>{profile.allergies.length}</div>
          <div className="stat-label">{L ? 'allergies' : 'алергии'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setTab('profile')}>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>{profile.dislikes.length}</div>
          <div className="stat-label">{L ? 'dislikes' : 'нелюбими'}</div>
        </div>
      </div>

      {profile.allergies.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)', background: 'var(--danger-light)' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--danger)', marginBottom: 6 }}>
            ⚠ {L ? 'Active Allergies' : 'Активни алергии'}
          </div>
          <div className="tag-list">
            {profile.allergies.map((a) => (
              <Badge type="allergy" key={a}>{a}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="divider" />
      <div className="section-title">{L ? 'QUICK IDEAS' : 'БЪРЗИ ИДЕИ'}</div>

      {recipes.length === 0 ? (
        <EmptyState
          icon="😔"
          title={L ? 'No recipes yet' : 'Все още няма рецепти'}
          subtitle={L ? 'Add recipes or update your restrictions' : 'Добави рецепти или промени ограниченията си'}
        />
      ) : (
        <div className="grid-2">
          {recipes.slice(0, 4).map((r) => {
            const risk = recipeRisk(r, allergies, dislikes);
            return (
              <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setTab('recipes')}>
                <div className="recipe-emoji">{r.emoji}</div>
                <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                <div style={{ marginTop: 6 }}>
                  {risk === 'safe'    && <Badge type="safe">{L ? 'Safe' : 'Безопасно'}</Badge>}
                  {risk === 'dislike' && <Badge type="dislike">{L ? 'Check' : 'Провери!'}</Badge>}
                  {risk === 'allergy' && <Badge type="allergy">⚠ {L ? 'Allergy risk!' : 'Алергия!'}</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {publicRecipes.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-title">{L ? 'FROM THE COMMUNITY' : 'ОТ ОБЩНОСТТА'}</div>
          <div className="grid-2">
            {publicRecipes.slice(0, 4).map((r) => {
              const risk = recipeRisk(r, allergies, dislikes);
              return (
                <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setSelectedRecipe(r)}>
                  <div className="recipe-emoji">{r.emoji}</div>
                  <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                  <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                  {r.authorName && (
                    <div className="recipe-meta">👤 {r.authorName}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    {risk === 'safe'    && <Badge type="safe">{L ? 'Safe' : 'Безопасно'}</Badge>}
                    {risk === 'dislike' && <Badge type="dislike">{L ? 'Check' : 'Провери!'}</Badge>}
                    {risk === 'allergy' && <Badge type="allergy">⚠ {L ? 'Allergy risk!' : 'Алергия!'}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="divider" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setTab('fridge')}>
          🧊 {L ? 'Open Fridge' : 'Отвори хладилника'}
        </button>
        <button className="btn btn-ghost" onClick={() => setTab('recipes')}>
          📖 {L ? 'All Recipes' : 'Всички рецепти'}
        </button>
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
            showBackButton={false}
            onBack={() => setSelectedRecipe(null)}
          />
        )}
      </Modal>
    </div>
  );
}
