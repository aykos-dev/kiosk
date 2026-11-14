import { useEffect, useMemo, useState } from 'react';
import { mergeApiTemplateForSize } from '../lib/apiPizzaTemplate.js';
import { formatUzs } from '../lib/formatUzs.js';
import { resolveProductImage } from '../lib/menuProduct.js';
import { tEntity } from '../lib/tEntity.js';
import { pickCrustName } from '../i18n/translate.js';
import { computePizzaUnitPrice, formatPizzaDetailLine, initPizzaSelections } from '../lib/pizzaPrice.js';
import { buildPizzaOrderModifiers } from '../lib/tableOrder.js';
import { pizzaReceiptDetails, pizzaToppingDetails } from '../lib/receiptItems.js';
import { useI18n } from '../hooks/useI18n.js';
import { useOverlayClose } from '../hooks/useOverlayClose.js';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock.js';
import { backdropClose } from '../lib/backdropClose.js';
import { PizzaCustomizeForm } from './PizzaCustomizeForm.jsx';

function IconClose({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M10 10l12 12M22 10L10 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Pizza configuration sheet (Figma 4287:24919 / content 4287:24657).
 * Supports static `pizzaTemplate.json` and API-built templates (`_source: 'api'`).
 */
export function PizzaDetailsModal({ product, template, onClose, onContinue, badgeHit }) {
  const { t, locale } = useI18n();
  const { closing, close } = useOverlayClose(onClose);
  const [sel, setSel] = useState(() => initPizzaSelections(template));

  const resolvedTemplate = useMemo(
    () => mergeApiTemplateForSize(template, sel.sizeId, locale),
    [template, sel.sizeId, locale],
  );

  const basePrice = useMemo(() => {
    if (template?._source !== 'api' || !template.sizes?.length) return product.price;
    const prices = template.sizes.map((s) => {
      const d = template.sizeDishes?.[s.id];
      return Number(d?.price) || 0;
    });
    const minP = Math.min(...prices);
    return Number.isFinite(minP) && minP >= 0 ? minP : product.price;
  }, [template, product.price]);

  useEffect(() => {
    if (!template?.sizeDishes) return;
    setSel(initPizzaSelections(mergeApiTemplateForSize(template, sel.sizeId, locale)));
  }, [sel.sizeId, template, locale]);

  useBodyScrollLock();

  const unitPrice = useMemo(
    () => computePizzaUnitPrice(resolvedTemplate, basePrice, sel),
    [resolvedTemplate, basePrice, sel],
  );

  /** Per-size dish from API template so title/image/description track the selected size tab. */
  const displayProduct = useMemo(
    () => template?.sizeDishes?.[sel.sizeId] ?? product,
    [template, sel.sizeId, product],
  );

  const heroSrc = resolveProductImage(displayProduct);
  const description = tEntity(displayProduct, locale, 'description');

  function handleContinue() {
    const size = resolvedTemplate.sizes?.find((s) => s.id === sel.sizeId);
    const crust = resolvedTemplate.crusts?.find((c) => c.id === sel.crustId);
    const bort = resolvedTemplate.borts?.find((b) => b.id === sel.bortId);
    const detailLine = formatPizzaDetailLine(resolvedTemplate, sel, locale, {
      crustName: pickCrustName(locale, sel.crustId, crust?.name),
      bortName: pickCrustName(locale, sel.bortId, bort?.name),
      sizeLabel: size?.label ?? '',
    });
    const lineProduct = template.sizeDishes?.[sel.sizeId] ?? product;
    onContinue({
      selections: sel,
      unitPrice,
      detailLine,
      receiptDetails: pizzaReceiptDetails(detailLine, pizzaToppingDetails(resolvedTemplate, sel, locale)),
      lineProduct,
      // iiko order data derived from the raw dish (carries modifier group ids).
      orderProductId: lineProduct.productId ?? lineProduct.id,
      orderBasePrice: Number(lineProduct.price) || 0,
      orderModifiers: buildPizzaOrderModifiers(lineProduct, sel),
    });
  }

  return (
    <div
      onClick={backdropClose(close)}
      className={`fixed inset-0 z-[60] flex items-end justify-center overflow-hidden overscroll-none bg-[rgba(30,30,30,0.7)] ${
        closing ? 'motion-safe:animate-kiosk-backdrop-out' : 'motion-safe:animate-kiosk-backdrop'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pizza-modal-title"
    >
      <div
        className={`flex max-h-[min(1200px,92vh)] w-full max-w-kiosk flex-col overflow-hidden rounded-t-[32px] bg-white shadow-dock ${
          closing ? 'motion-safe:animate-kiosk-sheet-out' : 'motion-safe:animate-kiosk-sheet'
        }`}
      >
        <div className="flex max-h-[inherit] min-h-0 flex-col gap-6 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-40 pt-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => close()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.16)] transition hover:bg-neutral-50"
              aria-label={t('common.close')}
            >
              <IconClose className="text-ink" />
            </button>
          </div>

          <PizzaCustomizeForm
            template={resolvedTemplate}
            sel={sel}
            onSelChange={setSel}
            header={{
              heroImage: heroSrc,
              title: tEntity(displayProduct, locale, 'name'),
              description: description || undefined,
              badgeHit: !!badgeHit,
            }}
          />
        </div>

        <div className="fixed bottom-0 left-1/2 z-[61] w-full max-w-kiosk -translate-x-1/2 border-t border-black/5 bg-white px-6 pb-8 pt-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <p className="mb-3 text-center text-[20px] font-semibold text-ink">
            {t('pizza.total', { amount: formatUzs(unitPrice) })}
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="w-full rounded-full bg-brand-green py-4 text-[18px] font-semibold text-white shadow-md transition hover:bg-brand-green-dark"
          >
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
