import { formatUzs } from '../lib/formatUzs.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconBasket } from './icons.jsx';
import { QuantityStepper } from './QuantityStepper.jsx';
import { useFlyToCart } from './FlyToCart.jsx';

/**
 * Bottom cart bar. Rendered only when the cart has items (the parent gates on
 * `cart.length`), so it slides up on the first add and unmounts when emptied.
 */
export function KioskCartBar({ cart, total, onOpenCart, onDec, onInc }) {
  const { t } = useI18n();
  const { registerTarget } = useFlyToCart();

  return (
    <div className="relative z-30 w-full shrink-0 rounded-t-[32px] bg-white shadow-dock motion-safe:animate-kiosk-sheet">
      <div className="flex max-h-[200px] w-full gap-0 overflow-x-auto overflow-y-hidden pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cart.map((line) => (
          <div
            key={line.lineId}
            className="flex min-w-[180px] shrink-0 flex-col items-center gap-2 px-2 text-center pb-2"
          >
            <div className="h-[88px] w-[110px] overflow-hidden rounded-xl bg-neutral-50">
              <img
                src={line.image || '/menu-items/placeholder.svg'}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <p className="line-clamp-2 min-h-[36px] max-w-[180px] text-[14px] font-semibold leading-5 text-ink">
              {line.name}
            </p>
            <QuantityStepper
              className="h-10 w-[132px] bg-surface"
              valueClassName="min-w-[2ch] text-[14px]"
              value={line.qty}
              onDecrement={() => onDec(line.lineId)}
              onIncrement={() => onInc(line.lineId)}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-black/10 px-6 pb-6">
        <div className="flex items-center justify-between gap-4 py-5">
          <p className="text-[22px] font-semibold leading-7 tracking-tight text-ink">{formatUzs(total)}</p>
          <button
            ref={registerTarget}
            type="button"
            onClick={onOpenCart}
            className="flex min-h-[52px] shrink-0 items-center gap-2 rounded-full bg-brand-green px-8 py-3 text-[17px] font-semibold leading-6 text-white shadow-sm transition hover:bg-brand-green-dark"
          >
            <span>{t('cartBar.goToCart')}</span>
            <IconBasket className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
