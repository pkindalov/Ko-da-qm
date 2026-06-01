import { useCallback, useState } from 'react';

const KOFI_URL = 'https://ko-fi.com/pkindalov';
// Matches the 768px desktop breakpoint used throughout globals.css.
// Ko-fi's embedded widget renders blank inside an iframe on mobile browsers
// (third-party storage is blocked), so on mobile we open Ko-fi in a new tab
// instead of the modal.
const DESKTOP_QUERY = '(min-width: 768px)';

export const useKofiSupport = () => {
  const [open, setOpen] = useState(false);

  const openSupport = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setOpen(true);
      return;
    }
    window.open(KOFI_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, openSupport, close };
};
