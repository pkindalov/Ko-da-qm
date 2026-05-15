import { Modal } from './Modal';
import type { Language } from '../types';

interface ConfirmDeleteModalProps {
  open: boolean;
  itemName: string;
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ open, itemName, lang, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  const L = lang === 'en';
  return (
    <Modal open={open} onClose={onCancel} title={L ? 'Confirm Delete' : 'Потвърди изтриване'}>
      <p style={{ marginBottom: 16, fontWeight: 600, fontSize: 14 }}>
        {L ? `Delete "${itemName}"?` : `Изтрий "${itemName}"?`}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
          {L ? 'Cancel' : 'Отказ'}
        </button>
        <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>
          {L ? 'Confirm' : 'Потвърди'}
        </button>
      </div>
    </Modal>
  );
}
