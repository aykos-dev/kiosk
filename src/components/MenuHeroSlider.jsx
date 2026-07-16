import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const AUTO_ADVANCE_MS = 5000;
/** Minimum horizontal travel (px) to register a swipe. */
const SWIPE_THRESHOLD_PX = 40;
/** Pause auto-advance briefly after a manual swipe/tap. */
const INTERACTION_PAUSE_MS = 8000;

/**
 * @param {{ slides: { src: string; alt: string }[] }} props
 */
export function MenuHeroSlider({ slides }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const slidesKey = useMemo(() => slides.map((s) => s.src).join('|'), [slides]);

  const swipeStartX = useRef(null);
  const pausedUntil = useRef(0);

  useEffect(() => {
    setIndex(0);
  }, [slidesKey]);

  const go = useCallback(
    (dir) => {
      if (count <= 1) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  const goTo = useCallback((i) => {
    pausedUntil.current = Date.now() + INTERACTION_PAUSE_MS;
    setIndex(i);
  }, []);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count]);

  const onPointerDown = useCallback((e) => {
    swipeStartX.current = e.clientX;
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      const start = swipeStartX.current;
      swipeStartX.current = null;
      if (start == null) return;
      const dx = e.clientX - start;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      pausedUntil.current = Date.now() + INTERACTION_PAUSE_MS;
      go(dx < 0 ? 1 : -1);
    },
    [go],
  );

  if (count === 0) return null;

  if (count === 1) {
    return (
      <img
        src={slides[0].src}
        alt={slides[0].alt}
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 h-full w-full touch-pan-y select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStartX.current = null;
      }}
    >
      {slides.map((slide, i) => (
        <img
          key={`${slide.src}-${i}`}
          src={slide.src}
          alt={slide.alt}
          draggable={false}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
            i === index ? 'z-[1] opacity-100' : 'z-0 opacity-0'
          }`}
          aria-hidden={i !== index}
        />
      ))}
      <div
        className="pointer-events-auto absolute bottom-3 left-0 right-0 z-[2] flex justify-center gap-2"
        role="tablist"
        aria-label="Promo slides"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === index ? 'bg-white shadow-sm' : 'bg-white/45 hover:bg-white/70'
            }`}
            onClick={() => goTo(i)}
            aria-label={`${i + 1} / ${count}`}
          />
        ))}
      </div>
    </div>
  );
}
