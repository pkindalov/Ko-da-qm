import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

type Stage = 'waiting' | 'ready' | 'invalid';

export const ResetPasswordScreen = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('waiting');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Supabase processes the recovery token from the URL hash during page load,
    // which can fire PASSWORD_RECOVERY before this component mounts and subscribes.
    // Checking getSession() catches that case, but we also require the hash to
    // contain "type=recovery" so a regular logged-in user visiting this URL
    // directly doesn't accidentally land on the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session && window.location.hash.includes('type=recovery')) setStage('ready');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('ready');
    });

    const timeout = setTimeout(() => {
      setStage(prev => {
        if (prev !== 'waiting') return prev;
        // Sign out any dangling recovery session so the user isn't silently
        // logged in after seeing the "invalid link" screen.
        supabase.auth.signOut();
        return 'invalid';
      });
    }, 5000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const validate = () => {
    const errs: { password?: string; confirm?: string } = {};
    if (!newPassword) {
      errs.password = 'Паролата е задължителна';
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errs.password = 'Паролата трябва да е поне 6 символа';
    }
    if (!confirm) {
      errs.confirm = 'Потвърдете паролата';
    } else if (newPassword !== confirm) {
      errs.confirm = 'Паролите не съвпадат';
    }
    return errs;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error('Грешка при смяна на паролата');
    } else {
      toast.success('Паролата е сменена успешно');
      navigate('/login', { replace: true });
    }
  };

  if (stage === 'waiting') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">Ко-да-ям</div>
          <p className="auth-sub">Проверка на линка…</p>
        </div>
      </div>
    );
  }

  if (stage === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">Ко-да-ям</div>
          <p className="auth-error auth-confirm-text">Линкът е невалиден или е изтекъл.</p>
          <p className="auth-switch"><Link to="/login">Обратно към вход</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Ко-да-ям</div>
        <p className="auth-sub">Нова парола</p>
        <form onSubmit={handleSubmit} className="stack auth-form" noValidate>
          <div>
            <label className="input-label">Нова парола</label>
            <input
              className="input-field"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })); }}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && <p className="auth-field-error">{errors.password}</p>}
          </div>
          <div>
            <label className="input-label">Потвърди паролата</label>
            <input
              className="input-field"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrors(prev => ({ ...prev, confirm: undefined })); }}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirm && <p className="auth-field-error">{errors.confirm}</p>}
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving ? 'Запазване...' : 'Запази паролата'}
          </button>
        </form>
        <p className="auth-switch"><Link to="/login">Обратно към вход</Link></p>
      </div>
    </div>
  );
};
