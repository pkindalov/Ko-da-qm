import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppFooter } from '../../../shared/components/AppFooter';
import { translations } from '../../../shared/i18n/translations';
import type { Language } from '../../../shared/types';

interface AuthLayoutProps {
  lang: Language;
  onLangToggle: () => void;
  children: ReactNode;
}

const BG_EMOJIS = ['🍕', '🥗', '🍜', '🥩', '🍱', '🥘'];

export const AuthLayout = ({ lang, onLangToggle, children }: AuthLayoutProps) => {
  const t = translations.landing[lang];

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/" className="auth-nav__logo">{t.appName}</Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLangToggle}>
          {lang === 'bg' ? 'EN' : 'BG'}
        </button>
      </nav>
      <div className="auth-page__body">
        <div className="auth-page__bg-emojis" aria-hidden="true">
          {BG_EMOJIS.map((emoji) => <span key={emoji}>{emoji}</span>)}
        </div>
        {children}
      </div>
      <AppFooter
        lang={lang}
        onLangToggle={onLangToggle}
        navLinks={
          <>
            <a href="#features">{t.footerNavFeatures}</a>
            <a href="#how">{t.footerNavHow}</a>
            <Link to="/login">{t.navLogin}</Link>
            <Link to="/register">{t.navRegister}</Link>
          </>
        }
      />
    </div>
  );
};
