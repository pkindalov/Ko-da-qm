import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './LandingPage.css';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app', { replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-logo">Ко-да-ям</div>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost btn-sm">Вход</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Регистрация</Link>
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
          <div className="landing-hero-badge">За капризни хора 🎯</div>
          <h1 className="landing-hero-title">Ко-да-ям</h1>
          <p className="landing-hero-sub">
            Умно планиране на хранене.<br />
            Само рецепти, които можеш да ядеш.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn btn-primary landing-btn-lg">🚀 Започни безплатно</Link>
            <Link to="/login" className="btn btn-ghost landing-btn-lg">Вече имам акаунт</Link>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-label">Какво прави?</div>
        <h2 className="landing-section-title">Всичко на едно място</h2>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🧊</div>
            <h3 className="landing-feature-name">Умен хладилник</h3>
            <p className="landing-feature-desc">
              Следи какво имаш вкъщи и никога не се чудиш от какво да готвиш.
            </p>
          </div>
          <div className="landing-feature-card landing-feature-card--accent">
            <div className="landing-feature-icon">📖</div>
            <h3 className="landing-feature-name">Безопасни рецепти</h3>
            <p className="landing-feature-desc">
              Само рецепти без твоите алергени и нелюбими съставки.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🛡️</div>
            <h3 className="landing-feature-name">Алергии под контрол</h3>
            <p className="landing-feature-desc">
              Задай своите алергии веднъж и забрави за притеснения.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-steps">
        <div className="landing-section-label">Как работи?</div>
        <h2 className="landing-section-title">Три стъпки до вечеря</h2>
        <div className="landing-steps-list">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">Добави в хладилника</h3>
              <p className="landing-step-desc">Добави продуктите, които имаш вкъщи.</p>
            </div>
          </div>
          <div className="landing-step-connector" aria-hidden="true" />
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">Задай ограниченията</h3>
              <p className="landing-step-desc">Алергии, нелюбими — ти решаваш.</p>
            </div>
          </div>
          <div className="landing-step-connector" aria-hidden="true" />
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <div className="landing-step-body">
              <h3 className="landing-step-title">Готви без стрес</h3>
              <p className="landing-step-desc">Получи рецепти, специално за теб.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2 className="landing-cta-title">Готов да ядеш по-умно?</h2>
        <p className="landing-cta-sub">Безплатно. Без усилие.</p>
        <Link to="/register" className="btn landing-cta-btn">Регистрирай се сега</Link>
      </section>

      <footer className="landing-footer">
        <span>Ко-да-ям © 2025</span>
        <span>За капризни хора 💛</span>
      </footer>
    </div>
  );
};
