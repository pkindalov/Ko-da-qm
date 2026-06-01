import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useLang } from '../../../shared/hooks/useLang';
import { translations } from '../../../shared/i18n/translations';
import { AuthLayout } from './AuthLayout';
import './auth.css';

const MIN_PASSWORD_LENGTH = 6;

type Stage = 'waiting' | 'ready' | 'invalid';

export const ResetPasswordScreen = () => {
  const navigate = useNavigate();
  const [lang, toggleLang] = useLang();
  const t = translations.auth[lang];
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
      errs.password = t.validPasswordRequired;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errs.password = t.validPasswordMin;
    }
    if (!confirm) {
      errs.confirm = t.validConfirmRequired;
    } else if (newPassword !== confirm) {
      errs.confirm = t.validConfirmMismatch;
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
      toast.error(t.resetErrorToast);
    } else {
      toast.success(t.resetSuccessToast);
      navigate('/login', { replace: true });
    }
  };

  if (stage === 'waiting') {
    return (
      <AuthLayout lang={lang} onLangToggle={toggleLang}>
        <div className="auth-card">
          <div className="auth-logo">{t.appName}</div>
          <p className="auth-sub">{t.resetWaiting}</p>
        </div>
      </AuthLayout>
    );
  }

  if (stage === 'invalid') {
    return (
      <AuthLayout lang={lang} onLangToggle={toggleLang}>
        <div className="auth-card">
          <div className="auth-logo">{t.appName}</div>
          <p className="auth-error auth-confirm-text">{t.resetInvalid}</p>
          <p className="auth-switch"><Link to="/login">{t.resetBack}</Link></p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout lang={lang} onLangToggle={toggleLang}>
      <div className="auth-card">
        <div className="auth-logo">{t.appName}</div>
        <p className="auth-sub">{t.resetTitle}</p>
        <form onSubmit={handleSubmit} className="stack auth-form" noValidate>
          <div>
            <label className="input-label">{t.resetNewPassword}</label>
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
            <label className="input-label">{t.resetConfirmLabel}</label>
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
            {saving ? t.resetSaving : t.resetBtn}
          </button>
        </form>
        <p className="auth-switch"><Link to="/login">{t.resetBack}</Link></p>
      </div>
    </AuthLayout>
  );
};
