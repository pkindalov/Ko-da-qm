import { KofiModal } from './KofiModal';
import { useKofiSupport } from '../hooks/useKofiSupport';
import { translations } from '../i18n/translations';
import type { Language } from '../types';

interface AppFooterProps {
  lang: Language;
}

export const AppFooter = ({ lang }: AppFooterProps) => {
  const { open, openSupport, close } = useKofiSupport();
  const t = translations.landing[lang];

  return (
    <>
      <footer className="app-footer">
        <span>{t.appName} © 2025</span>
        <button className="app-footer__support" onClick={openSupport}>{t.supportKofi}</button>
        <span>{t.footerTagline}</span>
      </footer>
      <KofiModal open={open} onClose={close} lang={lang} />
    </>
  );
};
