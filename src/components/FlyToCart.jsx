import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const FlyToCartContext = createContext(null);

/** Duration of the image's flight into the cart button. */
const FLIGHT_MS = 720;

/**
 * Provides a "fly to cart" gesture: a clone of the added product's image lifts
 * off from its card, arcs, and shrinks into the registered cart button.
 *
 * The cart button registers itself as the flight target via `registerTarget`
 * (a callback ref). Before the cart bar exists (first item added), the flight
 * falls back to the bottom-center of the screen where the bar is about to
 * appear.
 */
export function FlyToCartProvider({ children }) {
  const targetRef = useRef(null);

  const registerTarget = useCallback((el) => {
    targetRef.current = el;
  }, []);

  const runFlight = useCallback((start, imageSrc) => {
    const targetEl = targetRef.current;
    const target = targetEl?.getBoundingClientRect();
    // Fallback aims at the bottom-right (where the "go to cart" button lives),
    // not the center, for the rare case the target never resolves.
    const endCenter = target
      ? { x: target.left + target.width / 2, y: target.top + target.height / 2 }
      : { x: window.innerWidth - 120, y: window.innerHeight - 56 };
    const startCenter = { x: start.left + start.width / 2, y: start.top + start.height / 2 };

    const dx = endCenter.x - startCenter.x;
    const dy = endCenter.y - startCenter.y;
    const endScale = Math.max(0.12, Math.min(0.42, 48 / start.width));
    const midScale = (1 + endScale) / 2;

    const clone = document.createElement('img');
    clone.src = imageSrc;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.cssText = [
      'position:fixed',
      `left:${start.left}px`,
      `top:${start.top}px`,
      `width:${start.width}px`,
      `height:${start.height}px`,
      'object-fit:cover',
      'border-radius:16px',
      'z-index:9999',
      'pointer-events:none',
      'box-shadow:0 10px 28px rgba(0,0,0,0.25)',
      'will-change:transform,opacity',
    ].join(';');
    document.body.appendChild(clone);

    const anim = clone.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(${midScale})`,
          opacity: 0.95,
          offset: 0.5,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${endScale})`,
          opacity: 0.35,
          offset: 1,
        },
      ],
      { duration: FLIGHT_MS, easing: 'cubic-bezier(0.5, 0, 0.75, 0.35)', fill: 'forwards' },
    );

    const cleanup = () => {
      clone.remove();
      // Little pulse on the cart button to acknowledge the drop.
      const tgt = targetRef.current;
      if (tgt && typeof tgt.animate === 'function') {
        tgt.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'ease-out' },
        );
      }
    };
    anim.onfinish = cleanup;
    anim.oncancel = () => clone.remove();
  }, []);

  const flyToCart = useCallback(
    (originEl, imageSrc) => {
      if (!originEl || !imageSrc || typeof document === 'undefined') return;
      // The kiosk always plays this gesture; it is deliberately not gated on the
      // OS `prefers-reduced-motion` setting (a kiosk PC frequently has Windows
      // "Animation effects" disabled, which would otherwise kill the flight).

      // Freeze the origin rect AND the already-resolved image source now — the
      // source (e.g. a modal) may unmount before the flight begins. Using the
      // decoded `currentSrc` makes the clone paint instantly (from cache)
      // instead of flashing blank while a fresh request loads.
      const start = originEl.getBoundingClientRect();
      if (!start.width || !start.height) return;
      const resolvedSrc = originEl.currentSrc || imageSrc;

      // If the cart button already exists, launch immediately. Otherwise this
      // is the first item: wait for the bar to mount and its slide-up to settle
      // so the flight lands on the button rather than a guessed point.
      if (targetRef.current) {
        runFlight(start, resolvedSrc);
        return;
      }
      let frames = 0;
      let lastTop = null;
      const waitForTarget = () => {
        const el = targetRef.current;
        const top = el ? el.getBoundingClientRect().top : null;
        if (el && top === lastTop) {
          runFlight(start, resolvedSrc); // rect stable → entrance finished
          return;
        }
        lastTop = top;
        if (++frames > 48) {
          runFlight(start, resolvedSrc); // ~800ms cap → fall back
          return;
        }
        requestAnimationFrame(waitForTarget);
      };
      requestAnimationFrame(waitForTarget);
    },
    [runFlight],
  );

  const value = useMemo(() => ({ registerTarget, flyToCart }), [registerTarget, flyToCart]);

  return <FlyToCartContext.Provider value={value}>{children}</FlyToCartContext.Provider>;
}

/**
 * Access the fly-to-cart gesture. Returns no-ops when used outside a provider,
 * so components stay usable in isolation (e.g. the cart screen).
 */
export function useFlyToCart() {
  return useContext(FlyToCartContext) ?? { registerTarget: () => {}, flyToCart: () => {} };
}
