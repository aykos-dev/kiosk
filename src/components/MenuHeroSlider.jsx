import { useEffect, useMemo, useState } from 'react';

const AUTO_ADVANCE_MS = 5000;

/**
 * @param {{ slides: { src: string; alt: string }[] }} props
 */
export function MenuHeroSlider({ slides }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const slidesKey = useMemo(() => slides.map((s) => s.src).join('|'), [slides]);

  useEffect(() => {
    setIndex(0);
  }, [slidesKey]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const single = slides[0];

  if (count === 1) {
    return (
      <img
        src={single.src}
        alt={single.alt}
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  return (
    <>
      {slides.map((slide, i) => (
        <img
          key={`${slide.src}-${i}`}
          src={slide.src}
          alt={slide.alt}
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${
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
            onClick={() => setIndex(i)}
            aria-label={`${i + 1} / ${count}`}
          />
        ))}
      </div>
    </>
  );
}
