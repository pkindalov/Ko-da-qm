import type { Tweaks } from '../../shared/types';

interface TweaksPanelProps {
  open: boolean;
  tweaks: Tweaks;
  setTweaks: (tweaks: Tweaks) => void;
  onClose: () => void;
}

const THEMES = [
  { id: 'warm' as const, label: '🌿 Топло', labelEn: '🌿 Warm' },
  { id: 'cool' as const, label: '💙 Хладно', labelEn: '💙 Cool' },
  { id: 'dark' as const, label: '🌙 Тъмно', labelEn: '🌙 Dark' },
];

export function TweaksPanel({ open, tweaks, setTweaks, onClose }: TweaksPanelProps) {
  const L = tweaks.lang === 'en';

  return (
    <div className={`tweaks-panel${open ? ' open' : ''}`}>
      <div className="tweaks-title">
        <span>⚙ {L ? 'Settings' : 'Настройки'}</span>
        <button className="tweaks-close" onClick={onClose} aria-label="Close settings">✕</button>
      </div>

      <div className="tweak-row">
        <span className="tweak-label">{L ? 'Theme' : 'Тема'}</span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-btn${tweaks.theme === t.id ? ' active' : ''}`}
            onClick={() => setTweaks({ ...tweaks, theme: t.id })}
          >
            {L ? t.labelEn : t.label}
          </button>
        ))}
      </div>

      <div className="tweak-row">
        <span className="tweak-label">{L ? 'Language' : 'Език'}</span>
        <button
          className={`theme-btn${tweaks.lang === 'bg' ? ' active' : ''}`}
          onClick={() => setTweaks({ ...tweaks, lang: 'bg' })}
        >
          БГ
        </button>
        <button
          className={`theme-btn${tweaks.lang === 'en' ? ' active' : ''}`}
          onClick={() => setTweaks({ ...tweaks, lang: 'en' })}
        >
          EN
        </button>
      </div>
    </div>
  );
}
