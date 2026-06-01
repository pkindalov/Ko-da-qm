import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import { AuthLayout } from './AuthLayout';
import './auth.css';

// WHATWG HTML Living Standard § "valid e-mail address"
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type FieldErrors = { email?: string; password?: string };
type View = 'login' | 'forgot';

export const LoginScreen = () => {
  const navigate = useNavigate();
  const [lang, toggleLang] = useLang();
  const t = translations.auth[lang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [view, setView] = useState<View>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const { sendResetEmail, isSending } = useForgotPassword();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home', { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = t.validEmailRequired;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = t.validEmailInvalid;
    }
    if (!password) {
      errors.password = t.validPasswordRequired;
    }
    return errors;
  };

  const handleOAuthLogin = async (provider: 'facebook' | 'google') => {
    setError('');
    setFieldErrors({});
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setError(oauthError.message);
      toast.error(oauthError.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      navigate('/home');
    }
  };

  const openForgot = () => {
    setForgotEmail(email);
    setForgotEmailError('');
    setForgotSent(false);
    setView('forgot');
  };

  const handleForgotSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotEmailError(t.validEmailRequired);
      return;
    }
    if (!EMAIL_REGEX.test(forgotEmail.trim())) {
      setForgotEmailError(t.validEmailInvalid);
      return;
    }
    setForgotEmailError('');
    const ok = await sendResetEmail(forgotEmail.trim());
    if (ok) setForgotSent(true);
  };

  if (!sessionChecked) return null;

  return (
    <AuthLayout lang={lang} onLangToggle={toggleLang}>
      <div className="auth-card">
        <div className="auth-logo">{t.appName}</div>
        <p className="auth-sub">{t.appSub}</p>

        {view === 'forgot' ? (
          <>
            {forgotSent ? (
              <>
                <p className="auth-confirm-text">{t.forgotSentText(forgotEmail)}</p>
                <p className="auth-switch">
                  <button type="button" className="btn btn-ghost" onClick={() => setView('login')}>
                    {t.forgotBack}
                  </button>
                </p>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit} className="stack auth-form" noValidate>
                <div>
                  <label className="input-label">{t.forgotEmailLabel}</label>
                  <input
                    className="input-field"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailError(''); }}
                    placeholder="you@example.com"
                  />
                  {forgotEmailError && <p className="auth-field-error">{forgotEmailError}</p>}
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={isSending}>
                  {isSending ? t.forgotSending : t.forgotSendBtn}
                </button>
                <p className="auth-switch">
                  <button type="button" className="btn btn-ghost" onClick={() => setView('login')}>
                    {t.forgotBack}
                  </button>
                </p>
              </form>
            )}
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="stack auth-form" noValidate>
              <div>
                <label className="input-label">Email</label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                  placeholder="you@example.com"
                />
                {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="input-label">{t.loginPassword}</label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                  placeholder="••••••••"
                />
                {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? t.loginSubmitting : t.loginBtn}
              </button>
            </form>
            <div className="auth-divider">{t.loginDivider}</div>
            <div className="stack">
              <button className="btn btn-google btn-full" onClick={() => handleOAuthLogin('google')} disabled={loading}>
                {t.loginGoogle}
              </button>
              <button className="btn btn-facebook btn-full" onClick={() => handleOAuthLogin('facebook')} disabled={loading}>
                {t.loginFacebook}
              </button>
            </div>
            <p className="auth-switch">
              {t.loginNoAccount} <Link to="/register">{t.loginNoAccountLink}</Link>
            </p>
            <p className="auth-switch">
              <button type="button" className="btn btn-ghost" onClick={openForgot}>
                {t.loginForgotPassword}
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};
