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
  const isEnglish = lang === 'en';
  const [name, setName] = useState(profile.name);

  const saveName = () => {
    if (name.trim() === profile.name) return;
    setProfile({ ...profile, name: name.trim() });
    toast.success(isEnglish ? 'Name saved' : 'Името е запазено');
  };

  const allergicProducts = products.filter(p => p.status === 'allergic');
  const dislikedProducts = products.filter(p => p.status === 'disliked');

  const manageButton = onNavigateToProducts && (
    <button className="btn btn-ghost btn-sm mt-2" onClick={onNavigateToProducts}>
      {isEnglish ? '→ Manage in Products' : '→ Управлявай в Продукти'}
    </button>
  );

  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Profile' : 'Профил'}</span>
        </div>
        {onViewPublicProfile && (
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={onViewPublicProfile}>
              {isEnglish ? 'Public profile →' : 'Публичен профил →'}
            </button>
          </div>
        )}
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-mb">{isEnglish ? 'Your shape of hunger' : 'Твоята форма на глад'}</div>
          <h1 className="h-title italic">{isEnglish ? 'Profile' : 'Профил'}</h1>
          <div className="page-head-sub mt-2">
            {isEnglish ? 'Tell the kitchen what to avoid. The cookbook will quietly remember.' : 'Кажи на кухнята какво да избягва. Книгата ще го помни.'}
          </div>
        </div>
      </div>

      <div className="card card-mb">
        <div className="section-title">{isEnglish ? 'DISPLAY NAME' : 'ИМЕ'}</div>
        <div className="row">
          <input
            className="input-field flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isEnglish ? 'Your name' : 'Твоето име'}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
          <button className="btn btn-secondary btn-sm" onClick={saveName}>{isEnglish ? 'Save' : 'Запази'}</button>
        </div>
      </div>

      <div className="card card-mb card-allergy">
        <div className="section-title section-title-allergy">⚠ {isEnglish ? 'ALLERGIES (SERIOUS)' : 'АЛЕРГИИ (СЕРИОЗНИ)'}</div>
        <p className="card-hint">
          {isEnglish ? 'These ingredients will always be flagged as dangerous.' : 'Тези съставки ще бъдат маркирани като опасни.'}
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
            {isEnglish ? 'No allergies set.' : 'Няма зададени алергии.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card card-mb card-warn">
        <div className="section-title section-title-warn">✗ {isEnglish ? 'DISLIKES' : 'НЕЛЮБИМИ'}</div>
        <p className="card-hint">
          {isEnglish ?"Foods you simply don't enjoy." : 'Храни, които просто не харесваш.'}
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
            {isEnglish ? 'No dislikes set.' : 'Няма зададени нелюбими.'}
          </p>
        )}
        {manageButton}
      </div>

      <div className="card card-mb">
        <div className="section-title">{isEnglish ? 'DIETARY PREFERENCES' : 'ДИЕТИЧНИ ПРЕДПОЧИТАНИЯ'}</div>
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
                {isEnglish ?labelEn : id}
              </span>
            );
          })}
        </div>
      </div>

      <div className="card card-summary">
        <div className="card-summary-title">📊 {isEnglish ? 'Summary' : 'Обобщение'}</div>
        <div className="card-summary-text">
          {isEnglish ? 'Allergies' : 'Алергии'}: <strong className="count-allergy">{allergicProducts.length}</strong><br />
          {isEnglish ? 'Dislikes' : 'Нелюбими'}: <strong className="count-warn">{dislikedProducts.length}</strong><br />
          {isEnglish ? 'Dietary prefs' : 'Диетични предпочит.'}: <strong>{profile.dietaryPrefs.length}</strong>
        </div>
      </div>

      {onTweaksToggle && (
        <button className="btn btn-ghost settings-btn-mobile" onClick={onTweaksToggle}>
          ⚙ {isEnglish ? 'Settings' : 'Настройки'}
        </button>
      )}

      {onLogout && (
        <button className="btn btn-danger logout-btn-mobile" onClick={onLogout}>
          🚪 {isEnglish ? 'Log out' : 'Изход'}
        </button>
      )}
    </div>
  );
}
