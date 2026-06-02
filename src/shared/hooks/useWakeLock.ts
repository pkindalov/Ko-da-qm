import { useEffect, useState } from 'react';

export type WakeLockStatus = 'on' | 'off' | 'unsupported';

// The Wake Lock API isn't in the default TS DOM lib across all targets, so we
// narrow what we touch rather than pulling in the full type surface.
interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}
interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
}

// Keeps the screen awake while `active` is true (e.g. during cooking). Re-acquires
// the lock when the tab becomes visible again, since browsers drop it on hide.
// Degrades silently to 'unsupported' when the API is missing (e.g. jsdom, Safari).
export const useWakeLock = (active: boolean): WakeLockStatus => {
  const [status, setStatus] = useState<WakeLockStatus>('off');

  useEffect(() => {
    if (!active) {
      setStatus('off');
      return;
    }

    const wakeLock = (navigator as Navigator & WakeLockNavigator).wakeLock;
    if (wakeLock == null) {
      setStatus('unsupported');
      return;
    }

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await wakeLock.request('screen');
        if (cancelled) {
          sentinel.release();
          return;
        }
        sentinel.addEventListener('release', () => setStatus('off'));
        setStatus('on');
      } catch {
        // User-agent refused (e.g. low battery, no user gesture) — not an error.
        setStatus('off');
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);

  return status;
};
