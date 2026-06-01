import { useCallback, useState } from 'react';

const KOFI_URL = 'https://ko-fi.com/pkindalov';
// Ko-fi's embedded widget renders blank inside an iframe on touch devices
// (phones and tablets) because their browsers block third-party storage.
// A coarse pointer that can't hover means a finger-driven device — phones and
// tablets match, while desktops/laptops (mouse or trackpad, even touchscreen
// ones) do not. On those devices we open Ko-fi in a new tab instead.
const TOUCH_DEVICE_QUERY = '(hover: none) and (pointer: coarse)';

export const useKofiSupport = () => {
  const [open, setOpen] = useState(false);

  const openSupport = useCallback(() => {
    if (window.matchMedia(TOUCH_DEVICE_QUERY).matches) {
      window.open(KOFI_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, openSupport, close };
};
