import { useId } from "react";
import { Phone } from "lucide-react";
import { useI18n } from "../hooks/useI18n.js";
import bellissimoLogoImg from "../../assets/images/bellissimo-logo.png";
import ellipseDividerUrl from "../../assets/icons/ellipse.svg?url";
/**
 * “ishtaha” on the same smile-arc geometry as {@link SmileHero}:
 * quadratic with control **below** the endpoints so the curve bulges downward (middle of the word sits lower).
 */
function ArchedAppetite({ label, className = "" }) {
  const reactId = useId();
  const pathId = `order-appetite-arc-${reactId.replace(/:/g, "")}`;
  /** Same numbers as SmileHero.jsx (text arc only). */
  const vbW = 400;
  const textY = 198;
  const textCurveDepth = 78;
  const d = `M 40 ${textY} Q ${vbW / 2} ${textY + textCurveDepth} ${vbW - 40} ${textY}`;
  /** Bottom padding in viewBox so descenders aren’t clipped (path trough ~276). */
  const cropTop = 118;
  const cropH = 200;

  return (
    <svg
      viewBox={`0 ${cropTop} ${vbW} ${cropH}`}
      className={`mx-auto mt-1 block h-auto w-full max-w-[420px] overflow-visible ${className}`.trim()}
      style={{ aspectRatio: `${vbW} / ${cropH}` }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>
      <text
        fill="#ffffff"
        fontFamily="Product, system-ui, sans-serif"
        fontSize="76"
        fontWeight="800"
        letterSpacing="0.07em"
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </svg>
  );
}

/**
 * Order success / ticket number (Figma 4287:26492).
 */
export function OrderConfirm({
  orderNumber,
  supportPhone = "1174",
  onStartOrder,
}) {
  const { t } = useI18n();
  const displayNumber = orderNumber != null ? String(orderNumber) : "—";

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#fffffd]">
      {/* Green hero: no overflow-hidden here — it clipped the arched SVG; no white overlay (it sat on top of glyphs). */}
      <section className="relative shrink-0 bg-[#00501f] pb-8 pt-5 sm:pb-10 sm:pt-6">
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-2 sm:gap-4 sm:px-6 sm:pt-3">
          <div className="flex min-w-0 flex-col pt-0.5">
            <img
              src={bellissimoLogoImg}
              alt=""
              className="h-12 w-auto max-w-[min(280px,72vw)] object-contain object-left sm:h-14"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm sm:h-11 sm:w-11">
              <Phone
                className="h-5 w-5 text-[#00501f]"
                strokeWidth={2.2}
                aria-hidden
              />
            </div>
            <span className="font-product text-[36px] font-bold tabular-nums tracking-[0.02em] text-white sm:text-[44px]">
              {supportPhone}
            </span>
          </div>
        </div>

        {/* <div className="relative z-10 mx-auto mt-6 flex max-w-[640px] flex-col items-center px-4 text-center sm:mt-8">
          <p className="font-product text-[32px] font-bold leading-tight tracking-[0.02em] text-[#fbfbfd] sm:text-[36px]">
            {t("order.enjoy")}
          </p>
          <ArchedAppetite
            label={t("order.appetite")}
            className="max-w-[min(360px,90vw)]"
          />
        </div> */}
      </section>
<div className="h-[100px] bg-[#00501f]"/>
      {/* Rounded transition from Figma asset — scales with container width (intrinsic viewBox aspect ratio). */}
      <div className="relative z-[1] w-full shrink-0 leading-[0]">
        <img
          src={ellipseDividerUrl}
          alt=""
          width={740}
          height={175}
          className="block h-auto w-full min-w-0 max-w-none align-bottom"
          decoding="async"
        />
        <div className="flex flex-col items-center justify-center absolute top-0 left-0 right-0 w-full h-full">
          <p className="font-product text-[32px] font-bold leading-tight tracking-[0.02em] text-[#fbfbfd] sm:text-[36px]">
            {t("order.enjoy")}
          </p>
          <ArchedAppetite
            label={t("order.appetite")}
            className="max-w-[min(360px,90vw)]"
          />
        </div>
      </div>

      <main className="relative z-[1] flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-y-contain bg-[#fffffd] px-5 pb-4 pt-5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] sm:px-6 sm:pt-6">
        <div className="flex w-full max-w-[640px] flex-1 flex-col items-center justify-center gap-6 sm:gap-8">
          <div
            className="motion-safe:animate-kiosk-card flex w-full flex-col items-center gap-1.5 text-center sm:gap-2"
            aria-live="polite"
          >
            <p
              className="font-product font-bold leading-none tracking-[0.02em] text-ink"
              style={{ fontSize: "clamp(2.75rem, 14vw, 7.5rem)" }}
            >
              {displayNumber}
            </p>
            <p className="font-inter text-[20px] font-semibold leading-7 text-ink sm:text-[24px] sm:leading-8">
              {t("order.yourNumber")}
            </p>
          </div>

          <div className="motion-safe:animate-kiosk-card flex w-full max-w-[517px] flex-col gap-2 text-center [animation-delay:120ms]">
            <p className="font-product text-[28px] font-bold leading-tight text-ink sm:text-[36px] sm:leading-[44px]">
              {t("order.receiptTitle")}
            </p>
            <p className="font-inter text-[15px] leading-[1.4] text-[#74798a] sm:text-[16px]">
              {t("order.receiptHint")}
            </p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 bg-[#00501f] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-8 sm:pt-8">
        <p className="text-center font-product text-[36px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[44px] sm:leading-[48px]">
          {t("common.orderWord")}
        </p>
        <button
          type="button"
          onClick={onStartOrder}
          className="mx-auto mt-5 flex h-[72px] w-full max-w-[644px] items-center justify-center rounded-full bg-white px-6 font-inter text-[18px] font-semibold text-[#161616] shadow-md transition hover:bg-neutral-100 active:scale-[0.99] sm:mt-8 sm:text-[20px] sm:leading-7"
        >
          {t("order.newOrder")}
        </button>
      </footer>
    </div>
  );
}
