import { Modal } from './Modal';
import type { Language } from '../types';

interface ConfirmDeleteModalProps {
  open: boolean;
  itemName: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal = ({ open, itemName, lang, onConfirm, onCancel }: ConfirmDeleteModalProps) => {
  const isEnglish = lang === 'en';
  return (
    <Modal open={open} onClose={onCancel} title={isEnglish ? 'Confirm Delete' : 'Потвърди изтриване'}>
      <p className="modal-confirm-text">
        {isEnglish ? `Delete "${itemName}"?` : `Изтрий "${itemName}"?`}
      </p>
      <div className="row">
        <button className="btn btn-ghost flex-1" onClick={onCancel}>
          {isEnglish ? 'Cancel' : 'Отказ'}
        </button>
        <button className="btn btn-danger flex-1" onClick={onConfirm}>
          {isEnglish ? 'Confirm' : 'Потвърди'}
        </button>
      </div>
    </Modal>
  );
}
