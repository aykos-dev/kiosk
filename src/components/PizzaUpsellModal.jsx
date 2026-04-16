import { useEffect, useState } from "react";
import { formatUzs } from "../lib/formatUzs.js";
import { pickUpsellItem } from "../i18n/translate.js";
import { useI18n } from "../hooks/useI18n.js";
import { IconMinus, IconPlus } from "./icons.jsx";

function IconClose({ className = "h-8 w-8" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 10l12 12M22 10L10 22"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function initCounts(items) {
  const o = {};
  for (const it of items ?? []) {
    o[it.id] = 0;
  }
  return o;
}

/**
 * Sauces + drinks upsell (Figma 4287:25635).
 */
export function PizzaUpsellModal({ upsell, onClose, onFinish }) {
  const { t, locale } = useI18n();
  const [counts, setCounts] = useState(() => ({
    ...initCounts(upsell.sauces),
    ...initCounts(upsell.drinks),
  }));

  useEffect(() => {
    setCounts({
      ...initCounts(upsell.sauces),
      ...initCounts(upsell.drinks),
    });
  }, [upsell]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  function bump(id, delta) {
    setCounts((c) => {
      const n = Math.max(0, (c[id] ?? 0) + delta);
      return { ...c, [id]: n };
    });
  }

  function handleSkip() {
    onFinish(counts);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden overscroll-none bg-[rgba(30,30,30,0.7)] motion-safe:animate-kiosk-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pizza-upsell-title"
    >
      <div className="relative flex max-h-[min(900px,88vh)] w-full max-w-kiosk flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] motion-safe:animate-kiosk-sheet">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50 active:scale-[0.98] motion-safe:animate-kiosk-content"
          style={{ animationDelay: "120ms" }}
          aria-label={t("common.close")}
        >
          <IconClose />
        </button>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-0 pb-44 pt-14 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="mb-8 flex flex-col motion-safe:animate-kiosk-content"
            style={{ animationDelay: "40ms" }}
          >
            <h2
              id="pizza-upsell-title"
              className="font-product-700 px-6 pr-14 text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink"
            >
              {t("upsell.saucesTitle")}
            </h2>
            <div
              className="-mx-1 flex gap-4 overflow-x-auto px-6 pb-5 pt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {upsell.sauces?.map((item, i) => (
                <UpsellCard
                  key={item.id}
                  item={pickUpsellItem(locale, item)}
                  qty={counts[item.id] ?? 0}
                  onBump={(d) => bump(item.id, d)}
                  t={t}
                  imageFit="cover"
                  staggerMs={i * 42}
                />
              ))}
            </div>
          </div>

          <div
            className="flex flex-col motion-safe:animate-kiosk-content"
            style={{ animationDelay: "80ms" }}
          >
            <h2 className="font-product-700 px-6 text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink">
              {t("upsell.drinksTitle")}
            </h2>
            <div
              className="-mx-1 flex gap-4 overflow-x-auto px-6 pb-3 pt-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {upsell.drinks?.map((item, i) => (
                <UpsellCard
                  key={item.id}
                  item={pickUpsellItem(locale, item)}
                  qty={counts[item.id] ?? 0}
                  onBump={(d) => bump(item.id, d)}
                  t={t}
                  imageFit="contain"
                  staggerMs={i * 42}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-gradient-to-t from-white via-white/95 to-transparent"
          aria-hidden
        />

        <div
          className="absolute bottom-0 left-0 right-0 z-[5] rounded-t-[32px] border-t border-black/[0.04] bg-white/95 px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-sm motion-safe:animate-kiosk-content"
          style={{ animationDelay: "100ms" }}
        >
          <button
            type="button"
            onClick={handleSkip}
            className="flex h-16 w-full min-h-[56px] items-center justify-center rounded-full bg-black/5 px-6 text-[18px] font-semibold leading-6 tracking-[-0.15px] text-ink transition hover:bg-black/10 active:scale-[0.99]"
          >
            {t("upsell.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsellCard({
  item,
  qty,
  onBump,
  t,
  imageFit = "cover",
  staggerMs = 0,
}) {
  const fitClass = imageFit === "contain" ? "object-contain" : "object-cover";
  return (
    <div
      className="flex w-[188px] shrink-0 flex-col gap-3 rounded-[28px] bg-white p-2 shadow-[0px_2px_20px_rgba(0,0,0,0.16)] motion-safe:animate-kiosk-card transition-transform duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${staggerMs}ms` }}
    >
      <div className="h-[168px] w-full overflow-hidden rounded-2xl bg-neutral-50">
        <img
          src={item.image}
          alt=""
          className={`h-full w-full ${fitClass} mix-blend-multiply`}
        />
      </div>
      <p className="line-clamp-2 min-h-[48px] text-center text-[18px] font-semibold leading-6 text-brand-green">
        {item.name}
      </p>
      <p className="text-center text-[18px] text-ink">
        {formatUzs(item.price)}
      </p>
      <div className={`flex h-10 items-center gap-2 rounded-full bg-[#f7f7f7] px-1 ${qty > 0 ? "justify-between" : "justify-center"}`}>
        {qty > 0 && (
          <>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95"
              onClick={() => onBump(-1)}
              aria-label={t("common.decrease")}
            >
              <IconMinus className="h-5 w-5" />
            </button>
            <span
              key={qty}
              className="motion-safe:animate-kiosk-qty min-w-[2ch] text-center text-[15px] font-semibold tabular-nums"
            >
              {qty}
            </span>
          </>
        )}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95"
          onClick={() => onBump(1)}
          aria-label={t("common.add")}
        >
          <IconPlus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
