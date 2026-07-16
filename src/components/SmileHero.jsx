/**
 * Orange welcome banner with a "smile" curve into the page. Fully responsive:
 * height and type scale with the viewport, and the wordmark is real (crisp)
 * text rather than a stretched SVG path, so it never distorts on small /
 * medium / large kiosk panels.
 */
export function SmileHero({ label, className = '' }) {
  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden bg-white ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="relative flex h-[clamp(150px,24vw,300px)] w-full items-center justify-center bg-brand-orange">
        <span className="font-product-800 select-none px-6 text-center text-[clamp(44px,11vw,104px)] font-extrabold leading-none tracking-[0.04em] text-white">
          {label}
        </span>

        {/* Smile: orange dips downward at the centre into the white page. */}
        <svg
          className="absolute inset-x-0 bottom-[-1px] h-[clamp(28px,6vw,72px)] w-full"
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 0 Q 50 18 100 0 L 100 12 L 0 12 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}
