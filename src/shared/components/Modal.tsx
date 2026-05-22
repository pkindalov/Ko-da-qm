interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export const Modal = ({ open, onClose, title, children, contentClassName }: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal fade-in${contentClassName ? ` ${contentClassName}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
