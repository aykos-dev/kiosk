import { formatUzs } from '../lib/formatUzs.js';
import { resolveProductImage } from '../lib/menuProduct.js';
import { tEntity } from '../lib/tEntity.js';
import { comboOptionLabel, translateFallback } from '../i18n/translate.js';
import { computeComboDelta, computeComboPizzaExtrasSum, getOptionForSlot } from '../lib/comboPrice.js';
import { useI18n } from '../hooks/useI18n.js';

function IconClose({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M10 10l12 12M22 10L10 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Figma 4287:24379 — hero 522×360, rounded 24px */
function ComboDetailsSkeleton() {
  return (
    <div className="flex w-full max-w-[740px] flex-col gap-6 sm:mx-auto">
      <div className="relative mx-auto aspect-[522/360] w-full max-w-[522px] shrink-0 overflow-hidden rounded-[24px] bg-neutral-200 animate-pulse" />

      <div className="flex flex-col gap-4 px-1">
        <div className="mx-auto h-10 w-[min(80%,320px)] rounded-lg bg-neutral-200 animate-pulse" />
        <div className="mx-auto h-4 w-full max-w-[480px] rounded bg-neutral-200/90 animate-pulse" />
        <div className="mx-auto h-4 w-full max-w-[420px] rounded bg-neutral-200/90 animate-pulse" />
      </div>

      <div className="mx-auto grid w-full max-w-[692px] grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[560px]:justify-items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-h-[144px] w-full max-w-[340px] gap-2 overflow-hidden rounded-[24px] bg-white px-3 py-3 shadow-card min-[560px]:w-full"
          >
            <div className="size-[120px] shrink-0 rounded-2xl bg-neutral-200 animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-0.5">
              <div className="h-5 w-[85%] rounded bg-neutral-200 animate-pulse" />
              <div className="h-5 w-[60%] rounded bg-neutral-200 animate-pulse" />
              <div className="h-9 w-24 rounded-full bg-neutral-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-black/5 bg-white pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto h-6 w-48 rounded bg-neutral-200 animate-pulse" />
        <div className="h-14 w-full rounded-full bg-neutral-200 animate-pulse" />
      </div>
    </div>
  );
}

const sheetClassName =
  'flex max-h-[min(1200px,92svh)] w-full max-w-kiosk flex-col gap-6 overflow-y-auto overflow-x-hidden rounded-t-[32px] bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 shadow-dock min-[400px]:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/**
 * Combo configuration sheet (Figma 4287:24379).
 */
export function ComboDetailsModal({
  product,
  selections,
  comboPizzaBySlot = {},
  loading = false,
  onChangeSlot,
  onClose,
  onConfirm,
}) {
  const { t, locale } = useI18n();
  const combo = product?.combo;

  if (!product) return null;
  if (!loading && !combo) return null;

  if (loading || !combo) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(30,30,30,0.7)] p-0 sm:p-3"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="combo-modal-title"
      >
        <div className={sheetClassName}>
          <div className="flex w-full max-w-[740px] justify-end sm:mx-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50"
              aria-label={t('common.close')}
            >
              <IconClose className="text-ink" />
            </button>
          </div>
          <span id="combo-modal-title" className="sr-only">
            {t('comboModal.loadingTitle')}
          </span>
          <ComboDetailsSkeleton />
        </div>
      </div>
    );
  }

  const totalDelta =
    computeComboDelta(combo, selections) +
    computeComboPizzaExtrasSum(combo, selections, comboPizzaBySlot, locale);
  const totalPrice = product.price + totalDelta;

  const description =
    tEntity(product, locale, 'description') ||
    translateFallback(locale, `comboDescription.${product.id}`, combo.description) ||
    combo.description;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(30,30,30,0.7)] p-0 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="combo-modal-title"
    >
      <div className={sheetClassName}>
        <div className="flex w-full max-w-[740px] justify-end sm:mx-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50"
            aria-label={t('common.close')}
          >
            <IconClose className="text-ink" />
          </button>
        </div>

        <div className="relative mx-auto aspect-[522/360] w-full max-w-[522px] shrink-0 overflow-hidden rounded-[24px] bg-neutral-100">
          <img
            src={combo.heroImage || resolveProductImage(product)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
          />
        </div>

        <div className="flex w-full max-w-[740px] flex-col gap-6 sm:mx-auto">
          <div className="flex flex-col items-center gap-2 px-1 text-center sm:px-2">
            <h2
              id="combo-modal-title"
              className="font-product-700 w-full text-[clamp(1.75rem,4.2vw,2.25rem)] leading-[1.1] tracking-[-0.02em] text-[#ff2e00]"
            >
              {tEntity(product, locale, 'name')}
            </h2>
            {description ? (
              <p className="font-inter-400 mx-auto max-w-[60ch] text-center text-base leading-5 tracking-[-0.05em] text-ink">
                {description}
              </p>
            ) : null}
          </div>

          <div className="mx-auto grid w-full max-w-[692px] grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[560px]:justify-items-center pb-[132px]">
            {combo.slots.map((slot) => {
              const optId = selections[slot.id];
              const opt = getOptionForSlot(combo, slot.id, optId);
              return (
                <div
                  key={slot.id}
                  className="flex min-h-[144px] w-full max-w-[340px] gap-2 overflow-hidden rounded-[24px] bg-white px-3 py-3 shadow-card min-[560px]:w-full"
                >
                  <div className="relative size-[120px] shrink-0 overflow-hidden rounded-2xl mix-blend-darken">
                    <img
                      src={opt?.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="flex min-h-[120px] min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
                    <p className="line-clamp-3 font-inter-600 text-left text-[18px] leading-6 text-ink">
                      {comboOptionLabel(locale, opt?.id, opt?.name ?? '')}
                    </p>
                    <button
                      type="button"
                      onClick={() => onChangeSlot(slot.id)}
                      className="self-start rounded-full bg-surface px-4 py-1.5 font-inter-600 text-sm leading-5 text-ink transition hover:bg-neutral-200 active:scale-[0.99]"
                    >
                      {t('comboModal.change')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-3 border-t border-black/5 bg-white/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90">
            <p className="font-inter-600 text-center text-[clamp(1.05rem,2.8vw,1.25rem)] leading-7 text-ink">
              {t('comboModal.total', { amount: formatUzs(totalPrice) })}
            </p>
            <button
              type="button"
              onClick={onConfirm}
              className="font-inter-600 w-full rounded-full bg-brand-green py-4 text-[clamp(1rem,2.8vw,1.125rem)] leading-6 text-white shadow-md transition hover:bg-[#033a20] active:scale-[0.99]"
            >
              {t('comboModal.addToCart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
