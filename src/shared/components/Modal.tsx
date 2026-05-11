interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentStyle?: React.CSSProperties;
}

export function Modal({ open, onClose, title, children, contentStyle }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal fade-in" style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
