import { Link } from 'react-router-dom';
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import { AppFooter } from '../../../shared/components/AppFooter';
import './LandingPage.css';

export const HowItWorksPage = () => {
  const [lang, toggleLang] = useLang();
  const t = translations.landing[lang];

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-logo">{t.appName}</Link>
        <div className="landing-nav-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLang}>
            {lang === 'bg' ? 'EN' : 'BG'}
          </button>
          <Link to="/login" className="btn btn-ghost btn-sm">{t.navLogin}</Link>
          <Link to="/register" className="btn btn-primary btn-sm">{t.navRegister}</Link>
        </div>
      </nav>

      <section className="landing-steps">
        <div className="landing-section-label">{t.stepsLabel}</div>
        <h1 className="landing-section-title">{t.stepsTitle}</h1>
        <div className="landing-steps-list">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">{t.step1Title}</h3>
              <p className="landing-step-desc">{t.step1Desc}</p>
            </div>
          </div>
          <div className="landing-step-connector" aria-hidden="true" />
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">{t.step2Title}</h3>
              <p className="landing-step-desc">{t.step2Desc}</p>
            </div>
          </div>
          <div className="landing-step-connector" aria-hidden="true" />
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">{t.step3Title}</h3>
              <p className="landing-step-desc">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2 className="landing-cta-title">{t.ctaTitle}</h2>
        <p className="landing-cta-sub">{t.ctaSub}</p>
        <Link to="/register" className="btn landing-cta-btn">{t.ctaBtn}</Link>
      </section>

      <AppFooter
        lang={lang}
        onLangToggle={toggleLang}
        navLinks={
          <>
            <Link to="/features">{t.footerNavFeatures}</Link>
            <Link to="/how-it-works">{t.footerNavHow}</Link>
            <Link to="/login">{t.navLogin}</Link>
            <Link to="/register">{t.navRegister}</Link>
          </>
        }
      />
    </div>
  );
};
