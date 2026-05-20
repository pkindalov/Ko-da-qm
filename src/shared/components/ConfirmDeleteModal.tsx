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
  const L = lang === 'en';
  return (
    <Modal open={open} onClose={onCancel} title={L ? 'Confirm Delete' : 'Потвърди изтриване'}>
      <p className="modal-confirm-text">
        {L ? `Delete "${itemName}"?` : `Изтрий "${itemName}"?`}
      </p>
      <div className="row">
        <button className="btn btn-ghost flex-1" onClick={onCancel}>
          {L ? 'Cancel' : 'Отказ'}
        </button>
        <button className="btn btn-danger flex-1" onClick={onConfirm}>
          {L ? 'Confirm' : 'Потвърди'}
        </button>
      </div>
    </Modal>
  );
}
