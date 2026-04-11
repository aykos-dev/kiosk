export function SmileHero({ label, className = '' }) {
  const vbW = 400;
  /** Compact hero: less white gap before welcome title */
  const vbH = 400;

  const bottomY = 228;
  const curveDepth = 78;
  const orangePath = `M 0 0 L ${vbW} 0 L ${vbW} ${bottomY} Q ${vbW / 2} ${bottomY + curveDepth} 0 ${bottomY} Z`;

  const textArcId = 'mazali-text-arc';
  const textY = 198;
  const textCurveDepth = 78;
  const textArcPath = `M 40 ${textY} Q ${vbW / 2} ${textY + textCurveDepth} ${vbW - 40} ${textY}`;

  return (
    <div
      className={`relative h-[400px] w-full shrink-0 overflow-hidden bg-white ${className}`}
      role="img"
      aria-label={label}
    >
      <svg
        className="block h-full w-full"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <path id={textArcId} d={textArcPath} fill="none" />
        </defs>

        <path fill="#ff3300" d={orangePath} />

        <text
          fill="#ffffff"
          fontFamily="Product, system-ui, sans-serif"
          fontSize="76"
          fontWeight="800"
          letterSpacing="0.07em"
        >
          <textPath href={`#${textArcId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
