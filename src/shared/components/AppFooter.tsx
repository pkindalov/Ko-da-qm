import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { KofiModal } from './KofiModal';
import { useKofiSupport } from '../hooks/useKofiSupport';
import { translations } from '../i18n/translations';
import type { Language } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

interface AppFooterProps {
  lang: Language;
  onLangToggle: () => void;
  navLinks?: ReactNode;
}

export const AppFooter = ({ lang, onLangToggle, navLinks }: AppFooterProps) => {
  const { open, openSupport, close } = useKofiSupport();
  const t = translations.landing[lang];

  const defaultNavLinks = (
    <>
      <Link to="/home">{t.footerNavHome}</Link>
      <Link to="/recipes">{t.footerNavRecipes}</Link>
      <Link to="/fridge">{t.footerNavFridge}</Link>
      <Link to="/profile">{t.footerNavProfile}</Link>
      <Link to="/features">{t.footerNavFeatures}</Link>
      <Link to="/how-it-works">{t.footerNavHow}</Link>
    </>
  );

  return (
    <>
      <footer className="app-footer">
        <div className="app-footer__top">
          <div>
            <div className="app-footer__mark">{t.appName}</div>
            <p className="app-footer__manifesto">
              {t.footerManifestoPre} <em>{t.footerManifestoEm}</em>.
            </p>
          </div>
          <div className="app-footer__support-col">
            <p className="app-footer__support-label">{t.footerSupportLabel}</p>
            <p className="app-footer__support-note">{t.footerSupportNote}</p>
            <button type="button" className="app-footer__kofi" onClick={openSupport}>
              <span className="app-footer__cup">☕</span> {lang === 'bg' ? 'Подкрепи проекта' : 'Support this project'}
            </button>
          </div>
        </div>
        <div className="app-footer__bar">
          <div className="app-footer__bar-links">
            {navLinks ?? defaultNavLinks}
          </div>
          <div className="app-footer__bar-right">
            <span>{t.appName} © {CURRENT_YEAR}</span>
            <span>{t.footerTaglineShort} <i className="app-footer__heart">♥</i></span>
            <button type="button" className="app-footer__lang" onClick={onLangToggle}>
              {lang === 'bg' ? 'EN' : 'BG'}
            </button>
          </div>
        </div>
      </footer>
      <KofiModal open={open} onClose={close} lang={lang} />
    </>
  );
};
