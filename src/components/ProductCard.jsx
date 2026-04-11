import { formatUzs } from '../lib/formatUzs.js';
import {
  normalizeProductForMenuCard,
  resolveGroupToPizzaDish,
  resolveProductImage,
} from '../lib/menuProduct.js';
import { tEntity } from '../lib/tEntity.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconMinus, IconPlus } from './icons.jsx';

function resolveDiscount(product) {
  if (product.discountPercent != null) return product.discountPercent;
  if (product.oldPrice && product.price) {
    return Math.round((1 - product.price / product.oldPrice) * 100);
  }
  return null;
}

export function ProductCard({ product, qty = 0, onAdd, onComboOpen, onPizzaOpen, onInc, onDec }) {
  const { t, locale } = useI18n();
  const hasDiscount = product.oldPrice && product.price < product.oldPrice;
  const discount = resolveDiscount(product);
  const inCart = qty > 0;

  const localized = { ...product, name: tEntity(product, locale, 'name') };
  const imageSrc = resolveProductImage(product);

  return (
    <article className="flex w-[232px] shrink-0 flex-col gap-4">
      <div className="relative h-[184px] w-[232px] overflow-hidden rounded-2xl bg-white">
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {product.hit && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            {t('common.hit')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="line-clamp-2 text-[20px] font-semibold leading-7 text-ink">{localized.name}</h3>

        <div className="flex flex-col gap-1">
          {hasDiscount && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative text-[14px] leading-4 text-ink-muted line-through">
                {formatUzs(product.oldPrice)}
              </span>
              {discount != null && (
                <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-[12px] font-bold leading-4 text-white">
                  –{discount}%
                </span>
              )}
            </div>
          )}
          <p className="whitespace-nowrap text-[18px] font-semibold leading-6 text-ink">{formatUzs(product.price)}</p>
        </div>
      </div>

      {!inCart ? (
        <button
          type="button"
          onClick={() => {
            if (product.kind === 'group' && onPizzaOpen) {
              const dish = resolveGroupToPizzaDish(product);
              if (dish) {
                onPizzaOpen(
                  normalizeProductForMenuCard({ ...dish, _pizzaLineGroup: product }, locale),
                );
              }
              return;
            }
            if (product.kind === 'mobileCombo' && onComboOpen) {
              void onComboOpen(localized);
              return;
            }
            if (product.kind === 'combo' && onComboOpen) onComboOpen(localized);
            else if (product.kind === 'pizza' && onPizzaOpen) onPizzaOpen(localized);
            else onAdd(localized);
          }}
          className="flex h-10 w-[232px] items-center justify-center rounded-full bg-surface px-2.5 py-1.5 text-[15px] font-semibold leading-5 text-ink transition hover:bg-neutral-200 active:scale-[0.99]"
        >
          {t('common.add')}
        </button>
      ) : (
        <div className="flex h-10 w-[232px] items-center justify-between rounded-full bg-surface px-3 py-1.5">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5"
            onClick={() => onDec(product.id)}
            aria-label={t('common.decrease')}
          >
            <IconMinus />
          </button>
          <span className="min-w-[2ch] text-center text-[15px] font-semibold leading-5 text-ink">{qty}</span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5"
            onClick={() => onInc(product.id)}
            aria-label={t('common.increase')}
          >
            <IconPlus />
          </button>
        </div>
      )}
    </article>
  );
}
