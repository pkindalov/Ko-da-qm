import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

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
      if (session) navigate("/app", { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Името е задължително";
    } else if (name.trim().length < 2) {
      errors.name = "Името трябва да е поне 2 символа";
    } else if (name.trim().length > 50) {
      errors.name = "Името не може да е повече от 50 символа";
    }
    if (!email.trim()) {
      errors.email = "Имейлът е задължителен";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Невалиден имейл адрес";
    }
    if (!password) {
      errors.password = "Паролата е задължителна";
    } else if (password.length < 8) {
      errors.password = "Паролата трябва да е поне 8 символа";
    }
    if (!confirm) {
      errors.confirm = "Потвърдете паролата";
    } else if (password !== confirm) {
      errors.confirm = "Паролите не съвпадат";
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
      navigate("/app");
    } else {
      // Email confirmation required — account was created but not yet active
      setAwaitingConfirmation(true);
    }
  };

  if (!sessionChecked) return null;

  if (awaitingConfirmation) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">Ко-да-ям</div>
          <p className="auth-sub">Провери имейла си</p>
          <p className="auth-confirm-text">
            Изпратихме линк за потвърждение на <strong>{email}</strong>.
            Кликни върху него, за да активираш акаунта си.
          </p>
          <p className="auth-switch auth-confirm-link">
            <Link to="/login">Обратно към вход</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Ко-да-ям</div>
        <p className="auth-sub">Създай акаунт</p>
        <form onSubmit={handleSubmit} className="stack auth-form" noValidate>
          <div>
            <label className="input-label">Име</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
              placeholder="Иван Иванов"
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
          <div>
            <label className="input-label">Потвърди парола</label>
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
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? "Регистрация..." : "Регистрирай се"}
          </button>
        </form>
        <div className="auth-divider">или</div>
        <div className="stack">
          <button className="btn btn-google btn-full" onClick={() => handleOAuthLogin('google')} disabled={loading}>
            Регистрирай се с Google
          </button>
          <button className="btn btn-facebook btn-full" onClick={() => handleOAuthLogin('facebook')} disabled={loading}>
            Регистрирай се с Facebook
          </button>
        </div>
        <p className="auth-switch">
          Вече имаш акаунт? <Link to="/login">Влез</Link>
        </p>
      </div>
    </div>
  );
};
