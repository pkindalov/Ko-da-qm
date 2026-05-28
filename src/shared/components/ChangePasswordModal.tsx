import { useState } from 'react';
import { Modal } from './Modal';
import type { Language } from '../types';

const MIN_PASSWORD_LENGTH = 6;

interface ChangePasswordModalProps {
  open: boolean;
  lang: Language;
  onSave: (password: string) => Promise<boolean>;
  isSaving: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ open, lang, onSave, isSaving, onClose }: ChangePasswordModalProps) => {
  const isEnglish = lang === 'en';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const validate = () => {
    const errs: { password?: string; confirm?: string } = {};
    if (!newPassword) {
      errs.password = isEnglish ? 'Password is required' : 'Паролата е задължителна';
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errs.password = isEnglish ? 'Password must be at least 6 characters' : 'Паролата трябва да е поне 6 символа';
    }
    if (!confirm) {
      errs.confirm = isEnglish ? 'Please confirm the password' : 'Потвърдете паролата';
    } else if (newPassword !== confirm) {
      errs.confirm = isEnglish ? 'Passwords do not match' : 'Паролите не съвпадат';
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
    const success = await onSave(newPassword);
    if (success) {
      setNewPassword('');
      setConfirm('');
      onClose();
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirm('');
    setErrors({});
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={isEnglish ? 'Change Password' : 'Смяна на парола'}>
      <form onSubmit={handleSubmit} className="stack" noValidate>
        <div>
          <label className="input-label">{isEnglish ? 'New password' : 'Нова парола'}</label>
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
          <label className="input-label">{isEnglish ? 'Confirm password' : 'Потвърди паролата'}</label>
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
        <div className="row">
          <button type="button" className="btn btn-ghost flex-1" onClick={handleClose}>
            {isEnglish ? 'Cancel' : 'Отказ'}
          </button>
          <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>
            {isSaving
              ? (isEnglish ? 'Saving...' : 'Запазване...')
              : (isEnglish ? 'Save' : 'Запази')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
