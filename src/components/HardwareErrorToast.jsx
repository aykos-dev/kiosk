import { useEffect, useState } from 'react';

/**
 * Dev-phase hardware diagnostics overlay.
 *
 * Terminal/printer failures are recorded in the Electron main process and never
 * throw into the app; this surfaces them so we can see, during development, when
 * a device is unplugged, on the wrong COM port, or the ECR/ESC-POS exchange
 * fails. Fixed bottom-right, dismissible, capped to the most recent few.
 */
const MAX_VISIBLE = 5;
const AUTO_DISMISS_MS = 20000;

let _seq = 0;
const nextId = () => `hw_${Date.now()}_${(_seq += 1)}`;

export function HardwareErrorToast() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const kiosk = typeof window !== 'undefined' ? window.kiosk : undefined;
    if (!kiosk?.onHardwareError) return undefined;

    let mounted = true;
    const add = (entry) => {
      if (!mounted || !entry) return;
      setErrors((prev) => [...prev, { ...entry, id: nextId() }].slice(-MAX_VISIBLE));
    };

    // Seed with anything that happened before this component mounted (e.g. an
    // init failure at boot), then subscribe to live errors.
    kiosk.getHardwareErrors?.().then((list) => {
      if (Array.isArray(list)) list.forEach(add);
    }).catch(() => {});

    const unsubscribe = kiosk.onHardwareError(add);
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!errors.length) return undefined;
    const timers = errors.map((e) =>
      setTimeout(() => setErrors((prev) => prev.filter((x) => x.id !== e.id)), AUTO_DISMISS_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [errors]);

  if (!errors.length) return null;

  const dismiss = (id) => setErrors((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-full max-w-[440px] flex-col gap-2">
      {errors.map((e) => (
        <div
          key={e.id}
          role="alert"
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-300 bg-red-600 px-4 py-3 text-white shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/20 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide">
                {e.source || 'hardware'}
              </span>
              {e.at && (
                <span className="font-mono text-[11px] opacity-80">
                  {String(e.at).slice(11, 19)}
                </span>
              )}
            </div>
            <p className="mt-1 break-words font-mono text-[13px] leading-snug">{e.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(e.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-2 py-0.5 text-lg leading-none text-white/90 hover:bg-white/20"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
