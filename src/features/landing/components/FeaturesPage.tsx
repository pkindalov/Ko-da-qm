import { Link } from 'react-router-dom';
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import { AppFooter } from '../../../shared/components/AppFooter';
import './LandingPage.css';

export const FeaturesPage = () => {
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

      <section className="landing-features">
        <div className="landing-section-label">{t.featuresLabel}</div>
        <h1 className="landing-section-title">{t.featuresTitle}</h1>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🧊</div>
            <h3 className="landing-feature-name">{t.feature1Name}</h3>
            <p className="landing-feature-desc">{t.feature1Desc}</p>
          </div>
          <div className="landing-feature-card landing-feature-card--accent">
            <div className="landing-feature-icon">📖</div>
            <h3 className="landing-feature-name">{t.feature2Name}</h3>
            <p className="landing-feature-desc">{t.feature2Desc}</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🛡️</div>
            <h3 className="landing-feature-name">{t.feature3Name}</h3>
            <p className="landing-feature-desc">{t.feature3Desc}</p>
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
