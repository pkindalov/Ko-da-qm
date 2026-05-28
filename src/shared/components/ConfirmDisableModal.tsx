import { Modal } from './Modal';
import type { Language } from '../types';

interface ConfirmDisableModalProps {
  open: boolean;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDisableModal = ({ open, lang, onConfirm, onCancel }: ConfirmDisableModalProps) => {
  const isEnglish = lang === 'en';
  return (
    <Modal open={open} onClose={onCancel} title={isEnglish ? 'Disable Account' : 'Деактивиране на акаунта'}>
      <p className="modal-confirm-text">
        {isEnglish
          ? 'Your account will be temporarily disabled. Log in again at any time to reactivate it.'
          : 'Акаунтът ти ще бъде временно деактивиран. Влез отново по всяко време, за да го активираш.'}
      </p>
      <div className="row">
        <button className="btn btn-ghost flex-1" onClick={onCancel}>
          {isEnglish ? 'Cancel' : 'Отказ'}
        </button>
        <button className="btn btn-danger flex-1" onClick={onConfirm}>
          {isEnglish ? 'Disable' : 'Деактивирай'}
        </button>
      </div>
    </Modal>
  );
};
