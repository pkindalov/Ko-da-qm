import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import './auth.css';

// WHATWG HTML Living Standard § "valid e-mail address"
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export const RegisterScreen = () => {
  const navigate = useNavigate();
  const [lang, toggleLang] = useLang();
  const t = translations.auth[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/home", { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = t.validNameRequired;
    } else if (name.trim().length < 2) {
      errors.name = t.validNameMin;
    } else if (name.trim().length > 50) {
      errors.name = t.validNameMax;
    }
    if (!email.trim()) {
      errors.email = t.validEmailRequired;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = t.validEmailInvalid;
    }
    if (!password) {
      errors.password = t.validPasswordRequired;
    } else if (password.length < 6) {
      errors.password = t.validPasswordMin;
    }
    if (!confirm) {
      errors.confirm = t.validConfirmRequired;
    } else if (password !== confirm) {
      errors.confirm = t.validConfirmMismatch;
    }
    return errors;
  };

  const handleOAuthLogin = async (provider: 'facebook' | 'google') => {
    setErrorMsg('');
    setFieldErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setErrorMsg("");
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else if (data.session) {
      navigate("/home");
    } else {
      // Email confirmation required — account was created but not yet active
      setAwaitingConfirmation(true);
    }
  };

  if (!sessionChecked) return null;

  if (awaitingConfirmation) {
    const [confirmBefore, confirmAfter] = t.registerConfirmText(email).split(email);
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-lang-toggle">
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLang}>
              {lang === 'bg' ? 'EN' : 'BG'}
            </button>
          </div>
          <div className="auth-logo">{t.appName}</div>
          <p className="auth-sub">{t.registerCheckEmail}</p>
          <p className="auth-confirm-text">{confirmBefore}<strong>{email}</strong>{confirmAfter}</p>
          <p className="auth-switch auth-confirm-link">
            <Link to="/login">{t.registerConfirmBack}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-lang-toggle">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleLang}>
            {lang === 'bg' ? 'EN' : 'BG'}
          </button>
        </div>
        <div className="auth-logo">{t.appName}</div>
        <p className="auth-sub">{t.registerTitle}</p>
        <form onSubmit={handleSubmit} className="stack auth-form" noValidate>
          <div>
            <label className="input-label">{t.registerName}</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
              placeholder={t.registerNamePlaceholder}
            />
            {fieldErrors.name && <p className="auth-field-error">{fieldErrors.name}</p>}
          </div>
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
            <label className="input-label">{t.registerPassword}</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
              placeholder="••••••••"
            />
            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="input-label">{t.registerConfirm}</label>
            <input
              className="input-field"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setFieldErrors((prev) => ({ ...prev, confirm: undefined })); }}
              placeholder="••••••••"
            />
            {fieldErrors.confirm && <p className="auth-field-error">{fieldErrors.confirm}</p>}
          </div>
          {errorMsg && <p className="auth-error">{errorMsg}</p>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? t.registerSubmitting : t.registerBtn}
          </button>
        </form>
        <div className="auth-divider">{t.registerDivider}</div>
        <div className="stack">
          <button className="btn btn-google btn-full" onClick={() => handleOAuthLogin('google')} disabled={loading}>
            {t.registerGoogle}
          </button>
          <button className="btn btn-facebook btn-full" onClick={() => handleOAuthLogin('facebook')} disabled={loading}>
            {t.registerFacebook}
          </button>
        </div>
        <p className="auth-switch">
          {t.registerHasAccount} <Link to="/login">{t.registerHasAccountLink}</Link>
        </p>
      </div>
    </div>
  );
};
