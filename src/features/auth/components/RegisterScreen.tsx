import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export function RegisterScreen() {
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
      if (session) navigate("/", { replace: true });
      else setSessionChecked(true);
    });
  }, [navigate]);

  const handleFacebookLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
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
      navigate("/");
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
          <p style={{ textAlign: "center", marginTop: 16 }}>
            Изпратихме линк за потвърждение на <strong>{email}</strong>.
            Кликни върху него, за да активираш акаунта си.
          </p>
          <p className="auth-switch" style={{ marginTop: 24 }}>
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
          className="stack"
          style={{ marginTop: 24 }}
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
        <button className="btn btn-facebook btn-full" onClick={handleFacebookLogin} disabled={loading}>
          Регистрирай се с Facebook
        </button>
        <p className="auth-switch">
          Вече имаш акаунт? <Link to="/login">Влез</Link>
        </p>
      </div>
    </div>
  );
}
