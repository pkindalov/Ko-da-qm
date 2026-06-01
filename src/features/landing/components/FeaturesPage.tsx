import { Link } from 'react-router-dom';
import { useLang } from '../../../shared/hooks/useLang';
import { useSession } from '../../../shared/hooks/useSession';
import { translations } from '../../../shared/i18n/translations';
import { AppFooter } from '../../../shared/components/AppFooter';
import './LandingPage.css';

export const FeaturesPage = () => {
  const [lang, toggleLang] = useLang();
  const session = useSession();
  const t = translations.landing[lang];

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-logo">{t.appName}</Link>
        <div className="landing-nav-mid">
          <Link to="/features" className="landing-nav-mid-link landing-nav-mid-link--active">{t.footerNavFeatures}</Link>
          <Link to="/how-it-works" className="landing-nav-mid-link">{t.footerNavHow}</Link>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLang}>
            {lang === 'bg' ? 'EN' : 'BG'}
          </button>
          <Link to="/login" className="btn btn-ghost btn-sm">{t.navLogin}</Link>
          <Link to="/register" className="btn btn-primary btn-sm">{t.navRegister}</Link>
        </div>
      </nav>

      <header className="landing-phero">
        <span className="landing-phero-label">{t.featuresLabel}</span>
        <h1 className="landing-phero-title">{t.featuresTitlePlain} <em>{t.featuresTitleEm}</em></h1>
        <p className="landing-phero-sub">{t.featuresPageSub}</p>
      </header>

      <section className="landing-feat-page">
        <div className="landing-feat-page-grid">
          <article className="landing-feature-card">
            <span className="landing-feature-num">01</span>
            <div className="landing-feature-icon">🧊</div>
            <h2 className="landing-feature-name">{t.feature1Name}</h2>
            <p className="landing-feature-desc">{t.feature1Desc}</p>
            <span className="landing-feature-tag">
              <span className="landing-feat-pip" aria-hidden="true" />
              {t.feature1Tag}
            </span>
          </article>

          <article className="landing-feature-card landing-feature-card--accent">
            <span className="landing-feature-num">02</span>
            <div className="landing-feature-icon">📖</div>
            <h2 className="landing-feature-name">{t.feature2Name}</h2>
            <p className="landing-feature-desc">{t.feature2Desc}</p>
            <span className="landing-feature-tag">
              <span className="landing-feat-pip" aria-hidden="true" />
              {t.feature2Tag}
            </span>
          </article>

          <article className="landing-feature-card">
            <span className="landing-feature-num">03</span>
            <div className="landing-feature-icon">🛡️</div>
            <h2 className="landing-feature-name">{t.feature3Name}</h2>
            <p className="landing-feature-desc">{t.feature3Desc}</p>
            <span className="landing-feature-tag">
              <span className="landing-feat-pip" aria-hidden="true" />
              {t.feature3Tag}
            </span>
          </article>
        </div>

        <div className="landing-page-cta">
          <div className="landing-page-cta-card">
            <h2 className="landing-cta-title">{t.ctaTitle}</h2>
            <p className="landing-cta-sub">{t.ctaSub}</p>
            <Link to="/register" className="btn landing-cta-btn">{t.ctaBtn}</Link>
          </div>
        </div>

        <div className="landing-page-next">
          <Link to="/how-it-works">
            {t.featuresNextLabel} · <strong>{t.footerNavHow}</strong> →
          </Link>
        </div>
      </section>

      <AppFooter
        lang={lang}
        onLangToggle={toggleLang}
        navLinks={session != null ? undefined : (
          <>
            <Link to="/features">{t.footerNavFeatures}</Link>
            <Link to="/how-it-works">{t.footerNavHow}</Link>
            <Link to="/login">{t.navLogin}</Link>
            <Link to="/register">{t.navRegister}</Link>
          </>
        )}
      />
    </div>
  );
};
