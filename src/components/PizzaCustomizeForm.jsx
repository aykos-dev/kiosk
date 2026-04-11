import { useEffect, useState } from 'react';
import { formatUzs } from '../lib/formatUzs.js';
import { pickCrustName, pickToppingName } from '../i18n/translate.js';
import { countToppingUnits } from '../lib/pizzaPrice.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconCheck, IconMinus, IconPlus } from './icons.jsx';

function IconChevronDown({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Optional hero block (Figma 4287:24657): image, title, description, HIT badge.
 * @param {{ heroImage: string, title: string, description?: string, badgeHit?: boolean }} [header]
 */
export function PizzaCustomizeForm({
  template,
  sel,
  onSelChange,
  hideSizePicker = false,
  header,
}) {
  const { t, locale } = useI18n();
  const [showAllToppings, setShowAllToppings] = useState(false);

  useEffect(() => {
    setShowAllToppings(false);
  }, [sel.sizeId]);

  const toppingCount = countToppingUnits(sel.toppings);
  const maxT = template.maxToppings ?? 16;

  const visibleToppings = showAllToppings ? template.toppings : template.toppings?.slice(0, 4);

  const sizes = template.sizes ?? [];
  const showSizeSegment =
    sizes.length > 1 &&
    ((!hideSizePicker && sizes.length > 1) || (!!header && sizes.length >= 1));

  const crustTitle = template._source === 'api' ? t('pizza.chooseDough') : t('pizza.chooseCrust');

  function setSize(sizeId) {
    onSelChange((s) => ({ ...s, sizeId }));
  }

  function setCrust(crustId) {
    onSelChange((s) => ({ ...s, crustId }));
  }

  function setBort(bortId) {
    onSelChange((s) => ({ ...s, bortId }));
  }

  function bumpTopping(id, delta) {
    onSelChange((s) => {
      const cur = s.toppings[id] ?? 0;
      const next = Math.max(0, cur + delta);
      const nextToppings = { ...s.toppings, [id]: next };
      const total = countToppingUnits(nextToppings);
      if (total > maxT && delta > 0) return s;
      return { ...s, toppings: nextToppings };
    });
  }

  const sizeTabs = (
    <div className="w-full rounded-2xl bg-surface p-1">
      <div className="flex gap-1">
        {sizes.map((s) => {
          const active = sel.sizeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s.id)}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-3 py-3 text-[18px] font-semibold leading-5 transition ${
                active
                  ? 'bg-white text-brand-green shadow-[0px_2px_4px_rgba(0,0,0,0.05)]'
                  : 'text-ink'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {header ? (
        <>
          <div className="relative mx-auto aspect-[522/360] w-full max-w-[522px] overflow-hidden rounded-[24px] bg-neutral-100">
            <img src={header.heroImage} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            {header.badgeHit ? (
              <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                {t('common.hit')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-6 rounded-b-2xl bg-white/95 px-4 pb-6 pt-6 backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)]">
            <div className="flex flex-col gap-2 text-center">
              <h2
                id="pizza-modal-title"
                className="font-product-700 text-[36px] leading-10 tracking-[-0.2px] text-[#ff2e00]"
              >
                {header.title}
              </h2>
              {header.description ? (
                <p className="text-left text-[16px] leading-5 tracking-[-0.078px] text-ink">{header.description}</p>
              ) : null}
            </div>
            {showSizeSegment ? sizeTabs : null}
          </div>
        </>
      ) : (
        showSizeSegment && <div className="px-1">{sizeTabs}</div>
      )}

      <div key={sel.sizeId} className="flex flex-col gap-6 motion-safe:animate-kiosk-content">
      <div className="flex flex-col gap-5 px-1">
        <h3 className="font-product-700 text-[24px] leading-7 tracking-[-0.4px] text-ink">{crustTitle}</h3>
        <div className="flex flex-wrap gap-1">
          {template.crusts?.map((c) => {
            const active = sel.crustId === c.id;
            const crustLabel = pickCrustName(locale, c.id, c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCrust(c.id)}
                className={`relative flex min-h-0 min-w-[140px] max-w-[170px] flex-1 flex-col items-center gap-2 overflow-hidden rounded-[24px] px-1 pb-3 pt-1 text-center ${
                  active ? 'border-[1.5px] border-[#03381e]' : 'border border-transparent'
                }`}
              >
                <div className="pointer-events-none size-[162px] shrink-0 overflow-hidden rounded-2xl">
                  <img src={c.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex w-full flex-col gap-1 text-[18px] leading-6">
                  <p className="font-inter-600 truncate font-semibold text-brand-green">{crustLabel}</p>
                  <p className="font-inter-400 text-ink">
                    {c.priceDelta === 0 ? t('common.currencyZero') : `+${formatUzs(c.priceDelta)}`}
                  </p>
                </div>
                {active && (
                  <span className="absolute right-[8.5px] top-[8.5px] flex size-8 items-center justify-center rounded-full bg-brand-green shadow-md">
                    <IconCheck className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(template.borts?.length ?? 0) > 0 ? (
        <div className="flex flex-col gap-5 px-1">
          <h3 className="font-product-700 text-[24px] leading-7 tracking-[-0.4px] text-ink">{t('pizza.chooseEdge')}</h3>
          <div className="flex flex-wrap gap-1">
            {template.borts.map((b) => {
              const active = sel.bortId === b.id;
              const bortLabel = pickCrustName(locale, b.id, b.name);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBort(b.id)}
                  className={`relative flex min-h-0 min-w-[140px] max-w-[170px] flex-1 flex-col items-center gap-2 overflow-hidden rounded-[24px] px-1 pb-3 pt-1 text-center ${
                    active ? 'border-[1.5px] border-[#03381e]' : 'border border-transparent'
                  }`}
                >
                  <div className="pointer-events-none size-[162px] shrink-0 overflow-hidden rounded-2xl">
                    <img src={b.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex w-full flex-col gap-1 text-[18px] leading-6">
                    <p className="font-inter-600 truncate font-semibold text-brand-green">{bortLabel}</p>
                    <p className="font-inter-400 text-ink">
                      {b.priceDelta === 0 ? t('common.currencyZero') : `+${formatUzs(b.priceDelta)}`}
                    </p>
                  </div>
                  {active && (
                    <span className="absolute right-[8.5px] top-[8.5px] flex size-8 items-center justify-center rounded-full bg-brand-green shadow-md">
                      <IconCheck className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-5 px-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-product-700 flex-1 text-[24px] leading-7 tracking-[-0.4px] text-ink">
            {t('pizza.toppingsTitle')}
          </h3>
          <span className="shrink-0 text-[14px] font-semibold leading-5 text-brand-green">
            {toppingCount} / {maxT}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-1 gap-y-4 sm:grid-cols-4">
          {visibleToppings?.map((top) => {
            const n = sel.toppings?.[top.id] ?? 0;
            const toppingLabel = pickToppingName(locale, top.id, top.name);
            const selected = n > 0;
            return (
              <div
                key={top.id}
                className={`relative flex min-w-0 flex-col gap-2 rounded-2xl p-1 pb-3 ${
                  selected ? 'border-[1.5px] border-[#03381e]' : 'border border-transparent bg-white'
                }`}
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-white">
                  <img src={top.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-1 text-center text-[18px] leading-6">
                  <p className="font-inter-600 truncate font-semibold text-brand-green">{toppingLabel}</p>
                  <p className="font-inter-400 text-ink">+{formatUzs(top.priceDelta)}</p>
                </div>
                <div
                  className={`flex h-10 w-full items-center rounded-full bg-surface px-3 ${
                    n > 0 ? 'justify-between gap-2' : 'justify-center'
                  }`}
                >
                  {n > 0 && (
                    <button
                      type="button"
                      className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
                      onClick={() => bumpTopping(top.id, -1)}
                      aria-label={t('common.decrease')}
                    >
                      <IconMinus className="h-5 w-5" />
                    </button>
                  )}
                  {n > 0 ? (
                    <span className="min-w-[1.5ch] flex-1 text-center text-[15px] font-semibold leading-5">{n}</span>
                  ) : null}
                  <button
                    type="button"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5 disabled:opacity-40"
                    onClick={() => bumpTopping(top.id, 1)}
                    disabled={toppingCount >= maxT}
                    aria-label={t('common.add')}
                  >
                    <IconPlus className="h-5 w-5" />
                  </button>
                </div>
                {selected && (
                  <span className="absolute right-[8.5px] top-[8.5px] flex size-8 items-center justify-center rounded-full bg-brand-green shadow-md">
                    <IconCheck className="h-4 w-4 text-white" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {(template.toppings?.length ?? 0) > 4 && (
          <button
            type="button"
            onClick={() => setShowAllToppings((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-[18px] font-semibold text-brand-green"
          >
            {showAllToppings ? t('pizza.showLess') : t('pizza.showAll')}
            <IconChevronDown className={`h-4 w-4 transition ${showAllToppings ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
