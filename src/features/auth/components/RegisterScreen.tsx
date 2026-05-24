import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../../lib/supabase";

export const RegisterScreen = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/app", { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const handleOAuthLogin = async (provider: 'facebook' | 'google') => {
    setErrorMsg('');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password !== confirm) {
      setErrorMsg("Паролите не съвпадат");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
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
  }

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
        <form
          onSubmit={handleSubmit}
          className="stack auth-form"
        >
          <div>
            <label className="input-label">Име</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              required
            />
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="input-label">Парола</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="input-label">Потвърди парола</label>
            <input
              className="input-field"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
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
}
