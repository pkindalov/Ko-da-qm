import type { Tweaks } from '../../shared/types';

interface TweaksPanelProps {
  open: boolean;
  tweaks: Tweaks;
  setTweaks: (tweaks: Tweaks) => void;
}

const THEMES = [
  { id: 'warm' as const, label: '🌿 Топло' },
  { id: 'cool' as const, label: '💙 Хладно' },
  { id: 'dark' as const, label: '🌙 Тъмно' },
];

export function TweaksPanel({ open, tweaks, setTweaks }: TweaksPanelProps) {
  return (
    <div className={`tweaks-panel${open ? ' open' : ''}`}>
      <div className="tweaks-title">⚙ Tweaks</div>

      <div className="tweak-row">
        <span className="tweak-label">Тема / Theme</span>
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-btn${tweaks.theme === t.id ? ' active' : ''}`}
            onClick={() => setTweaks({ ...tweaks, theme: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tweak-row">
        <span className="tweak-label">Език / Language</span>
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
