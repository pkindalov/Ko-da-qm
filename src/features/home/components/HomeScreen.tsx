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
  favoriteIds: string[];
  onToggleFavorite: (recipe: Recipe) => void;
  products: Product[];
  setTab: (tab: Tab) => void;
  lang: Language;
  onDeleteFridgeItem: (id: string) => void;
  onRemoveAllergy: (name: string) => void;
  onRemoveDislike: (name: string) => void;
}

const RECIPES_PREVIEW_SIZE = 4;
const COMMUNITY_PAGE_SIZE = 4;

export function HomeScreen({ profile, recipes, fridge, publicRecipes, favoriteIds, onToggleFavorite, products, setTab, lang, onDeleteFridgeItem, onRemoveAllergy, onRemoveDislike }: HomeScreenProps) {
  const L = lang === 'en';
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [communityPage, setCommunityPage] = useState(1);
  const [openStatModal, setOpenStatModal] = useState<'safeRecipes' | 'fridge' | 'allergies' | 'dislikes' | null>(null);
  const [allergiesExpanded, setAllergiesExpanded] = useState(false);

  const toNames = (list: Product[]) => list.flatMap(p => p.nameEn ? [p.name, p.nameEn] : [p.name]);
  const allergies = [...new Set([...profile.allergies, ...toNames(products.filter(p => p.status === 'allergic'))])];
  const dislikes  = [...new Set([...profile.dislikes,  ...toNames(products.filter(p => p.status === 'disliked'))])];
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
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('safeRecipes')}>
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{safeRecipes.length}</div>
          <div className="stat-label">{L ? 'safe recipes' : 'безопасни рецепти'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('fridge')}>
          <div className="stat-num" style={{ color: 'var(--secondary)' }}>{fridge.length}</div>
          <div className="stat-label">{L ? 'fridge items' : 'в хладилника'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('allergies')}>
          <div className="stat-num" style={{ color: 'var(--danger)' }}>{allergies.length}</div>
          <div className="stat-label">{L ? 'allergies' : 'алергии'}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setOpenStatModal('dislikes')}>
          <div className="stat-num" style={{ color: 'var(--warn)' }}>{dislikes.length}</div>
          <div className="stat-label">{L ? 'dislikes' : 'нелюбими'}</div>
        </div>
      </div>

      {allergies.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setAllergiesExpanded(v => !v)}
            aria-expanded={allergiesExpanded}
          >
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--danger)' }}>
              ⚠ {L ? 'Active Allergies' : 'Активни алергии'} ({allergies.length})
            </span>
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>
              {allergiesExpanded ? '▲' : '▼'}
            </span>
          </button>
          {allergiesExpanded && (
            <div className="tag-list" style={{ marginTop: 8 }}>
              {allergies.map((a) => (
                <Badge type="allergy" key={a}>{a}</Badge>
              ))}
            </div>
          )}
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
          {recipes.slice(0, RECIPES_PREVIEW_SIZE).map((r) => {
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
            {publicRecipes.slice(0, communityPage * COMMUNITY_PAGE_SIZE).map((r) => {
              const risk = recipeRisk(r, allergies, dislikes);
              return (
                <div key={r.id} className={`recipe-card${risk === 'allergy' ? ' allergy' : ''}`} onClick={() => setSelectedRecipe(r)}>
                  <button
                    className="btn-favorite"
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(r); }}
                    aria-label={favoriteIds.includes(r.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favoriteIds.includes(r.id) ? '♥' : '♡'}
                  </button>
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
          {publicRecipes.length > communityPage * COMMUNITY_PAGE_SIZE && (
            <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setCommunityPage(p => p + 1)}>
              {L ? `Show more (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} left)` : `Покажи още (${publicRecipes.length - communityPage * COMMUNITY_PAGE_SIZE} остават)`}
            </button>
          )}
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
        open={openStatModal === 'safeRecipes'}
        onClose={() => setOpenStatModal(null)}
        title={L ? `Safe Recipes (${safeRecipes.length})` : `Безопасни рецепти (${safeRecipes.length})`}
        contentStyle={{ maxWidth: 360 }}
      >
        {safeRecipes.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {L ? 'No safe recipes yet.' : 'Все още няма безопасни рецепти.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {safeRecipes.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 20 }}>{r.emoji}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{L && r.nameEn ? r.nameEn : r.name}</span>
                <span style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>⏱ {r.time} {L ? 'min' : 'мин'}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('recipes'); }}
          >
            {L ? 'Go to Recipes →' : 'Към рецепти →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'fridge'}
        onClose={() => setOpenStatModal(null)}
        title={L ? `Fridge (${fridge.length})` : `Хладилник (${fridge.length})`}
        contentStyle={{ maxWidth: 360 }}
      >
        {fridge.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {L ? 'Your fridge is empty.' : 'Хладилникът е празен.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {fridge.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{item.name}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => onDeleteFridgeItem(item.id)}
                  aria-label={`${L ? 'Remove' : 'Премахни'} ${item.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('fridge'); }}
          >
            {L ? 'Go to Fridge →' : 'Към хладилника →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'allergies'}
        onClose={() => setOpenStatModal(null)}
        title={L ? `Allergies (${allergies.length})` : `Алергии (${allergies.length})`}
        contentStyle={{ maxWidth: 360 }}
      >
        {allergies.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {L ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        ) : (
          <div className="tag-list">
            {allergies.map(a => (
              <button
                key={a}
                type="button"
                className="badge badge-allergy tag-removable"
                onClick={() => onRemoveAllergy(a)}
                aria-label={`${L ? 'Remove allergy' : 'Премахни алергия'} ${a}`}
              >
                {a} <span className="rm">✕</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('products'); }}
          >
            {L ? 'Go to Products →' : 'Към продукти →'}
          </button>
        </div>
      </Modal>

      <Modal
        open={openStatModal === 'dislikes'}
        onClose={() => setOpenStatModal(null)}
        title={L ? `Dislikes (${dislikes.length})` : `Нелюбими (${dislikes.length})`}
        contentStyle={{ maxWidth: 360 }}
      >
        {dislikes.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {L ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        ) : (
          <div className="tag-list">
            {dislikes.map(d => (
              <button
                key={d}
                type="button"
                className="badge badge-dislike tag-removable"
                onClick={() => onRemoveDislike(d)}
                aria-label={`${L ? 'Remove dislike' : 'Премахни нелюбима'} ${d}`}
              >
                {d} <span className="rm">✕</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-full btn-sm"
            onClick={() => { setOpenStatModal(null); setTab('products'); }}
          >
            {L ? 'Go to Products →' : 'Към продукти →'}
          </button>
        </div>
      </Modal>

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
            onToggleFavorite={() => onToggleFavorite(selectedRecipe)}
          />
        )}
      </Modal>
    </div>
  );
}
