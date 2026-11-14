import { useEffect } from 'react';

/**
 * Number of mounted overlays that want the page locked. Overlays stack (pizza
 * details + upsell are open together) and can unmount in any order, so each
 * one saving/restoring the previous style would leave the page stuck at
 * `overflow: hidden`. A shared counter only unlocks when the last one leaves.
 */
let lockCount = 0;

/** Lock page (html/body) scrolling while the calling component is mounted. */
export function useBodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    lockCount += 1;
    if (lockCount === 1) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        html.style.overflow = '';
        body.style.overflow = '';
      }
    };
  }, []);
}
