import { Modal } from './Modal';
import type { Language } from '../types';

interface KofiModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
}

export const KofiModal = ({ open, onClose, lang }: KofiModalProps) => (
  <Modal open={open} onClose={onClose} contentClassName="modal-kofi">
    <iframe
      src="https://ko-fi.com/pkindalov/?hidefeed=true&widget=true&embed=true"
      title={lang === 'en' ? 'Support this project on Ko-fi' : 'Подкрепи проекта в Ko-fi'}
      className="kofi-iframe"
      allow="payment"
    />
  </Modal>
);
