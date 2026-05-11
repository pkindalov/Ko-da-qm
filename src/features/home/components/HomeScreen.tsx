import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { isSafe } from '../../../shared/utils/recipeUtils';
import { getGreeting } from '../../../shared/utils/greeting';
import type { Profile, Recipe, FridgeItem, Language, Tab } from '../../../shared/types';

interface HomeScreenProps {
  profile: Profile;
  recipes: Recipe[];
  fridge: FridgeItem[];
  publicRecipes: Recipe[];
  setTab: (tab: Tab) => void;
  lang: Language;
}

export function HomeScreen({ profile, recipes, fridge, publicRecipes, setTab, lang }: HomeScreenProps) {
  const L = lang === 'en';

  const blocked = [...profile.allergies, ...profile.dislikes];
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

      {safeRecipes.length === 0 ? (
        <EmptyState
          icon="😔"
          title={L ? 'No safe recipes yet' : 'Все още няма безопасни рецепти'}
          subtitle={L ? 'Add recipes or update your restrictions' : 'Добави рецепти или промени ограниченията си'}
        />
      ) : (
        <div className="grid-2">
          {safeRecipes.slice(0, 4).map((r) => (
            <div key={r.id} className="recipe-card" onClick={() => setTab('recipes')}>
              <div className="recipe-emoji">{r.emoji}</div>
              <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
              <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
            </div>
          ))}
        </div>
      )}

      {publicRecipes.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-title">{L ? 'FROM THE COMMUNITY' : 'ОТ ОБЩНОСТТА'}</div>
          <div className="grid-2">
            {publicRecipes.slice(0, 4).map((r) => (
              <div key={r.id} className="recipe-card">
                <div className="recipe-emoji">{r.emoji}</div>
                <div className="recipe-name">{L && r.nameEn ? r.nameEn : r.name}</div>
                <div className="recipe-meta">⏱ {r.time} {L ? 'min' : 'мин'}</div>
                {r.authorName && (
                  <div className="recipe-meta">👤 {r.authorName}</div>
                )}
              </div>
            ))}
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
    </div>
  );
}
