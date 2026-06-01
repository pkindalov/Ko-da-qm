import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import { AppFooter } from '../../../shared/components/AppFooter';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [lang, toggleLang] = useLang();
  const t = translations.landing[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home', { replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-logo">{t.appName}</div>
        <div className="landing-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={toggleLang}>
            {lang === 'bg' ? 'EN' : 'BG'}
          </button>
          <Link to="/login" className="btn btn-ghost btn-sm">{t.navLogin}</Link>
          <Link to="/register" className="btn btn-primary btn-sm">{t.navRegister}</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-bg-emojis" aria-hidden="true">
          <span>🍕</span>
          <span>🥗</span>
          <span>🍜</span>
          <span>🥩</span>
          <span>🍱</span>
          <span>🥘</span>
        </div>
        <div className="landing-hero-content">
          <div className="landing-hero-badge">{t.heroBadge}</div>
          <h1 className="landing-hero-title">{t.appName}</h1>
          <p className="landing-hero-sub">
            {t.heroSub1}<br />
            {t.heroSub2}
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary landing-btn-lg">{t.heroCta1}</Link>
            <Link to="/login" className="btn btn-ghost landing-btn-lg">{t.heroCta2}</Link>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-label">{t.featuresLabel}</div>
        <h2 className="landing-section-title">{t.featuresTitle}</h2>
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

      <section className="landing-steps">
        <div className="landing-section-label">{t.stepsLabel}</div>
        <h2 className="landing-section-title">{t.stepsTitle}</h2>
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
