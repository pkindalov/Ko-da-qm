import { Link } from 'react-router-dom';
import { useLang } from '../../../shared/hooks/useLang';
import { useSession } from '../../../shared/hooks/useSession';
import { translations } from '../../../shared/i18n/translations';
import { AppFooter } from '../../../shared/components/AppFooter';
import './LandingPage.css';

const STEP_CHIPS = {
  bg: {
    step1: ['🥕 Зеленчуци', '🧀 Мляко & яйца', '🍝 Основни'],
    step2: ['🥜 Без ядки', '🌾 Без глутен', '🚫 Нелюбими'],
    step3: ['✨ Лични предложения', '⏱️ За минути'],
  },
  en: {
    step1: ['🥕 Vegetables', '🧀 Dairy & eggs', '🍝 Staples'],
    step2: ['🥜 No nuts', '🌾 Gluten-free', '🚫 Dislikes'],
    step3: ['✨ Personal picks', '⏱️ In minutes'],
  },
};

export const HowItWorksPage = () => {
  const [lang, toggleLang] = useLang();
  const session = useSession();
  const t = translations.landing[lang];
  const chips = STEP_CHIPS[lang];

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-logo">{t.appName}</Link>
        <div className="landing-nav-mid">
          <Link to="/features" className="landing-nav-mid-link">{t.footerNavFeatures}</Link>
          <Link to="/how-it-works" className="landing-nav-mid-link landing-nav-mid-link--active">{t.footerNavHow}</Link>
        </div>
        <div className="landing-nav-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLang}>
            {lang === 'bg' ? 'EN' : 'BG'}
          </button>
          {session != null ? (
            <Link to="/home" className="btn btn-primary btn-sm">{t.footerNavHome}</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">{t.navLogin}</Link>
              <Link to="/register" className="btn btn-primary btn-sm">{t.navRegister}</Link>
            </>
          )}
        </div>
      </nav>

      <header className="landing-phero">
        <span className="landing-phero-label">{t.stepsLabel}</span>
        <h1 className="landing-phero-title">{t.stepsTitlePlain} <em>{t.stepsTitleEm}</em></h1>
        <p className="landing-phero-sub">{t.stepsPageSub}</p>
      </header>

      <section className="landing-vstep-page">
        <div className="landing-vstep-list">
          <div className="landing-vstep">
            <div className="landing-vstep-rail">
              <div className="landing-vstep-num">1</div>
              <div className="landing-vstep-line" aria-hidden="true" />
            </div>
            <div className="landing-vstep-body">
              <p className="landing-vstep-kicker">{t.step1Kicker}</p>
              <h2 className="landing-vstep-title">{t.step1Title}</h2>
              <p className="landing-vstep-desc">{t.step1Desc}</p>
              <div className="landing-vstep-chips">
                {chips.step1.map((chip) => (
                  <span key={chip} className="landing-chip">{chip}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-vstep">
            <div className="landing-vstep-rail">
              <div className="landing-vstep-num">2</div>
              <div className="landing-vstep-line" aria-hidden="true" />
            </div>
            <div className="landing-vstep-body">
              <p className="landing-vstep-kicker">{t.step2Kicker}</p>
              <h2 className="landing-vstep-title">{t.step2Title}</h2>
              <p className="landing-vstep-desc">{t.step2Desc}</p>
              <div className="landing-vstep-chips">
                {chips.step2.map((chip) => (
                  <span key={chip} className="landing-chip">{chip}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-vstep">
            <div className="landing-vstep-rail">
              <div className="landing-vstep-num">3</div>
            </div>
            <div className="landing-vstep-body">
              <p className="landing-vstep-kicker">{t.step3Kicker}</p>
              <h2 className="landing-vstep-title">{t.step3Title}</h2>
              <p className="landing-vstep-desc">{t.step3Desc}</p>
              <div className="landing-vstep-chips">
                {chips.step3.map((chip) => (
                  <span key={chip} className="landing-chip">{chip}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-page-cta">
          <div className="landing-page-cta-card">
            <h2 className="landing-cta-title">{t.howCtaTitle}</h2>
            <p className="landing-cta-sub">{t.ctaSub}</p>
            <Link to={session != null ? '/home' : '/register'} className="btn landing-cta-btn">
              {session != null ? t.footerNavHome : t.howCtaBtn}
            </Link>
          </div>
        </div>

        <div className="landing-page-next">
          <Link to="/features">
            ← {t.howBackLabel} · <strong>{t.footerNavFeatures}</strong>
          </Link>
        </div>
      </section>

      <AppFooter
        lang={lang}
        onLangToggle={toggleLang}
        navLinks={
          <>
            <Link to="/features">{t.footerNavFeatures}</Link>
            <Link to="/how-it-works">{t.footerNavHow}</Link>
            {session != null ? (
              <Link to="/home">{t.footerNavHome}</Link>
            ) : (
              <>
                <Link to="/login">{t.navLogin}</Link>
                <Link to="/register">{t.navRegister}</Link>
              </>
            )}
          </>
        }
      />
    </div>
  );
};
