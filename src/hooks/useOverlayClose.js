import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages an overlay's exit animation. React unmounts a conditionally-rendered
 * modal instantly, which skips any close transition; this hook keeps the modal
 * on screen for `duration` ms (playing an exit animation) before invoking the
 * real close/callback.
 *
 * Usage:
 *   const { closing, close } = useOverlayClose(onClose);
 *   // backdrop:  onClick={() => close()}
 *   // confirm:   onClick={() => close(onConfirm)}
 *   // classes:   closing ? 'animate-…-out' : 'animate-…'
 *
 * @param {() => void} onClose - default action once the exit animation ends
 * @param {number} [duration] - exit animation length in ms (match the CSS)
 */
export function useOverlayClose(onClose, duration = 300) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, []);

  const close = useCallback(
    (cb) => {
      if (closing) return;
      setClosing(true);
      const done = typeof cb === 'function' ? cb : onClose;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        done?.();
        // Reset so a modal that stays mounted (gated by an `open` prop) can be
        // reopened cleanly — otherwise `closing` leaks across cycles and both
        // wedges the exit animation and turns `close()` into a permanent no-op.
        if (mountedRef.current) setClosing(false);
      }, duration);
    },
    [closing, onClose, duration],
  );

  return { closing, close };
}
