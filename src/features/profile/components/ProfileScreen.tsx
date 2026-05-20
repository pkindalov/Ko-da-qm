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

export const ProfileScreen = ({ profile, setProfile, products, lang, onLogout, onTweaksToggle, onNavigateToProducts, onViewPublicProfile }: ProfileScreenProps) => {
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
    <button className="btn btn-ghost btn-sm mt-2" onClick={onNavigateToProducts}>
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
          <div className="eyebrow eyebrow-mb">{L ? 'Your shape of hunger' : 'Твоята форма на глад'}</div>
          <h1 className="h-title italic">{L ? 'Profile' : 'Профил'}</h1>
          <div className="page-head-sub mt-2">
            {L ? 'Tell the kitchen what to avoid. The cookbook will quietly remember.' : 'Кажи на кухнята какво да избягва. Книгата ще го помни.'}
          </div>
        </div>
      </div>

      <div className="card card-mb">
        <div className="section-title">{L ? 'DISPLAY NAME' : 'ИМЕ'}</div>
        <div className="row">
          <input
            className="input-field flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={L ? 'Your name' : 'Твоето име'}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
          <button className="btn btn-secondary btn-sm" onClick={saveName}>{L ? 'Save' : 'Запази'}</button>
        </div>
      </div>

      <div className="card card-mb card-allergy">
        <div className="section-title section-title-allergy">⚠ {L ? 'ALLERGIES (SERIOUS)' : 'АЛЕРГИИ (СЕРИОЗНИ)'}</div>
        <p className="card-hint">
          {L ? 'These ingredients will always be flagged as dangerous.' : 'Тези съставки ще бъдат маркирани като опасни.'}
        </p>
        {allergicProducts.length > 0 ? (
          <div className="chip-group">
            {allergicProducts.map(p => (
              <span key={p.id} className="chip selected chip-allergy">
                {p.emoji} {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="card-note">
            {L ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card card-mb card-warn">
        <div className="section-title section-title-warn">✗ {L ? 'DISLIKES' : 'НЕЛЮБИМИ'}</div>
        <p className="card-hint">
          {L ? "Foods you simply don't enjoy." : 'Храни, които просто не харесваш.'}
        </p>
        {dislikedProducts.length > 0 ? (
          <div className="chip-group">
            {dislikedProducts.map(p => (
              <span key={p.id} className="chip selected chip-warn">
                {p.emoji} {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="card-note">
            {L ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card card-mb">
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

      <div className="card card-summary">
        <div className="card-summary-title">📊 {L ? 'Summary' : 'Обобщение'}</div>
        <div className="card-summary-text">
          {L ? 'Allergies' : 'Алергии'}: <strong className="count-allergy">{allergicProducts.length}</strong><br />
          {L ? 'Dislikes' : 'Нелюбими'}: <strong className="count-warn">{dislikedProducts.length}</strong><br />
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
