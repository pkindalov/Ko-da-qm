import { useState } from 'react';
import { TagInput } from '../../../shared/components/TagInput';
import type { Profile, Language } from '../../../shared/types';

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
  lang: Language;
  onLogout?: () => void;
  onTweaksToggle?: () => void;
}

export function ProfileScreen({ profile, setProfile, lang, onLogout, onTweaksToggle }: ProfileScreenProps) {
  const L = lang === 'en';
  const [name, setName] = useState(profile.name);

  const saveName = () => setProfile({ ...profile, name: name.trim() });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">👤 {L ? 'My Profile' : 'Моят профил'}</div>
        <div className="page-sub">{L ? 'Manage your food restrictions' : 'Управлявай хранителните си ограничения'}</div>
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
        <TagInput
          value={profile.allergies}
          type="danger"
          onChange={(v) => setProfile({ ...profile, allergies: v })}
          placeholder={L ? 'Add allergen (press Enter)' : 'Добави алерген (Enter)'}
        />
      </div>

      <div className="card" style={{ marginBottom: 16, borderColor: 'var(--warn)', borderWidth: 2 }}>
        <div className="section-title" style={{ color: 'var(--warn)' }}>✗ {L ? 'DISLIKES' : 'НЕЛЮБИМИ'}</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, fontWeight: 600 }}>
          {L ? "Foods you simply don't enjoy." : 'Храни, които просто не харесваш.'}
        </p>
        <TagInput
          value={profile.dislikes}
          type="warn"
          onChange={(v) => setProfile({ ...profile, dislikes: v })}
          placeholder={L ? 'Add disliked food (press Enter)' : 'Добави нелюбима храна (Enter)'}
        />
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
          {L ? 'Allergies' : 'Алергии'}: <strong style={{ color: 'var(--danger)' }}>{profile.allergies.length}</strong><br />
          {L ? 'Dislikes' : 'Нелюбими'}: <strong style={{ color: 'var(--warn)' }}>{profile.dislikes.length}</strong><br />
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
