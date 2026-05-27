import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

// WHATWG HTML Living Standard § "valid e-mail address"
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type FieldErrors = { email?: string; password?: string };

export const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app/home', { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Имейлът е задължителен';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Невалиден имейл адрес';
    }
    if (!password) {
      errors.password = 'Паролата е задължителна';
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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/app/home');
    }
  };

  if (!sessionChecked) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Ко-да-ям</div>
        <p className="auth-sub">за капризни хора</p>
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
            <label className="input-label">Парола</label>
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
            {loading ? 'Влизане...' : 'Вход'}
          </button>
        </form>
        <div className="auth-divider">или</div>
        <div className="stack">
          <button className="btn btn-google btn-full" onClick={() => handleOAuthLogin('google')} disabled={loading}>
            Влез с Google
          </button>
          <button className="btn btn-facebook btn-full" onClick={() => handleOAuthLogin('facebook')} disabled={loading}>
            Влез с Facebook
          </button>
        </div>
        <p className="auth-switch">
          Нямаш акаунт? <Link to="/register">Регистрирай се</Link>
        </p>
      </div>
    </div>
  );
}
