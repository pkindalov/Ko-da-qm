import type { Tweaks } from '../../shared/types';
import './TweaksPanel.css';

interface TweaksPanelProps {
  open: boolean;
  tweaks: Tweaks;
  setTweaks: (tweaks: Tweaks) => void;
  onClose: () => void;
}

const THEMES = [
  { id: 'warm' as const, label: '☀ Топло', labelEn: '☀ Warm' },
  { id: 'cool' as const, label: '🌿 Свежо', labelEn: '🌿 Fresh' },
  { id: 'dark' as const, label: '🌙 Нощ', labelEn: '🌙 Night' },
];

export const TweaksPanel = ({ open, tweaks, setTweaks, onClose }: TweaksPanelProps) => {
  const isEnglish = tweaks.lang === 'en';

  return (
    <div className={`tweaks-panel${open ? ' open' : ''}`}>
      <div className="tweaks-title">
        <span>{isEnglish ? 'Settings' : 'Настройки'}</span>
        <button className="tweaks-close" onClick={onClose} aria-label="Close settings">✕</button>
      </div>

      <div className="tweak-row">
        <span className="tweak-label">{isEnglish ? 'Theme' : 'Тема'}</span>
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            className={`theme-btn${tweaks.theme === theme.id ? ' active' : ''}`}
            onClick={() => setTweaks({ ...tweaks, theme: theme.id })}
          >
            {isEnglish ? theme.labelEn : theme.label}
          </button>
        ))}
      </div>

      <div className="tweak-row">
        <span className="tweak-label">{isEnglish ? 'Language' : 'Език'}</span>
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
