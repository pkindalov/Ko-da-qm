import { useState } from 'react';
import { toast } from 'sonner';
import type { Profile, Product, Language } from '../../../shared/types';

const DIETARY_PREFS = [
  { id: 'Вегетарианец', labelEn: 'Vegetarian' },
  { id: 'Веган',        labelEn: 'Vegan'       },
  { id: 'Без глутен',   labelEn: 'Gluten-free' },
  { id: 'Без лактоза',  labelEn: 'Lactose-free'},
  { id: 'Халал',        labelEn: 'Halal'       },
  { id: 'Кошер',        labelEn: 'Kosher'      },
];

interface ProfileScreenProps {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  products: Product[];
  lang: Language;
  onLogout?: () => void;
  onTweaksToggle?: () => void;
  onNavigateToProducts?: () => void;
  onViewPublicProfile?: () => void;
}

export function ProfileScreen({ profile, setProfile, products, lang, onLogout, onTweaksToggle, onNavigateToProducts, onViewPublicProfile }: ProfileScreenProps) {
  const L = lang === 'en';
  const [name, setName] = useState(profile.name);

  const saveName = () => {
    if (name.trim() === profile.name) return;
    setProfile({ ...profile, name: name.trim() });
    toast.success(L ? 'Name saved' : 'Името е запазено');
  };

  const allergicProducts = products.filter(p => p.status === 'allergic');
  const dislikedProducts = products.filter(p => p.status === 'disliked');

  const manageButton = onNavigateToProducts && (
    <button className="btn btn-ghost btn-sm" onClick={onNavigateToProducts} style={{ marginTop: 8 }}>
      {L ? '→ Manage in Products' : '→ Управлявай в Продукти'}
    </button>
  );

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {L ? 'Kitchen' : 'Кухня'} <span>/ {L ? 'Profile' : 'Профил'}</span>
        </div>
        {onViewPublicProfile && (
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={onViewPublicProfile}>
              {L ? 'Public profile →' : 'Публичен профил →'}
            </button>
          </div>
        )}
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{L ? 'Your shape of hunger' : 'Твоята форма на глад'}</div>
          <h1 className="h-title italic">{L ? 'Profile' : 'Профил'}</h1>
          <div className="page-head-sub" style={{ marginTop: 8 }}>
            {L ? 'Tell the kitchen what to avoid. The cookbook will quietly remember.' : 'Кажи на кухнята какво да избягва. Книгата ще го помни.'}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">{L ? 'DISPLAY NAME' : 'ИМЕ'}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={L ? 'Your name' : 'Твоето име'}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={saveName}>{L ? 'Save' : 'Запази'}</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)', borderWidth: 2 }}>
        <div className="section-title" style={{ color: 'var(--danger)' }}>⚠ {L ? 'ALLERGIES (SERIOUS)' : 'АЛЕРГИИ (СЕРИОЗНИ)'}</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>
          {L ? 'These ingredients will always be flagged as dangerous.' : 'Тези съставки ще бъдат маркирани като опасни.'}
        </p>
        {allergicProducts.length > 0 ? (
          <div className="chip-group">
            {allergicProducts.map(p => (
              <span key={p.id} className="chip selected" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                {p.emoji} {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>
            {L ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--warn)', borderWidth: 2 }}>
        <div className="section-title" style={{ color: 'var(--warn)' }}>✗ {L ? 'DISLIKES' : 'НЕЛЮБИМИ'}</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>
          {L ? "Foods you simply don't enjoy." : 'Храни, които просто не харесваш.'}
        </p>
        {dislikedProducts.length > 0 ? (
          <div className="chip-group">
            {dislikedProducts.map(p => (
              <span key={p.id} className="chip selected" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
                {p.emoji} {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>
            {L ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">{L ? 'DIETARY PREFERENCES' : 'ДИЕТИЧНИ ПРЕДПОЧИТАНИЯ'}</div>
        <div className="chip-group">
          {DIETARY_PREFS.map(({ id, labelEn }) => {
            const sel = profile.dietaryPrefs.includes(id);
            return (
              <span
                key={id}
                className={`chip${sel ? ' selected' : ''}`}
                onClick={() =>
                  setProfile({
                    ...profile,
                    dietaryPrefs: sel
                      ? profile.dietaryPrefs.filter((p) => p !== id)
                      : [...profile.dietaryPrefs, id],
                  })
                }
              >
                {L ? labelEn : id}
              </span>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ background: 'var(--bg)', borderStyle: 'dashed' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📊 {L ? 'Summary' : 'Обобщение'}</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600, lineHeight: 2 }}>
          {L ? 'Allergies' : 'Алергии'}: <strong style={{ color: 'var(--danger)' }}>{allergicProducts.length}</strong><br />
          {L ? 'Dislikes' : 'Нелюбими'}: <strong style={{ color: 'var(--warn)' }}>{dislikedProducts.length}</strong><br />
          {L ? 'Dietary prefs' : 'Диетични предпочит.'}: <strong>{profile.dietaryPrefs.length}</strong>
        </div>
      </div>

      {onTweaksToggle && (
        <button className="btn btn-ghost settings-btn-mobile" onClick={onTweaksToggle}>
          ⚙ {L ? 'Settings' : 'Настройки'}
        </button>
      )}

      {onLogout && (
        <button className="btn btn-danger logout-btn-mobile" onClick={onLogout}>
          🚪 {L ? 'Log out' : 'Изход'}
        </button>
      )}
    </div>
  );
}
