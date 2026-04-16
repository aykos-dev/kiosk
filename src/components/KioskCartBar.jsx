import { formatUzs } from '../lib/formatUzs.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconBasket, IconMinus, IconPlus } from './icons.jsx';

export function KioskCartBar({ cart, total, onOpenCart, onDec, onInc }) {
  const { t } = useI18n();
  const empty = cart.length === 0;

  return (
    <div className="pointer-events-auto fixed bottom-0 left-1/2 z-30 w-full max-w-kiosk -translate-x-1/2 rounded-t-[32px] bg-white shadow-dock">
      <div className="flex max-h-[200px] w-full gap-0 overflow-x-auto overflow-y-hidden pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {empty ? (
          <div className="flex w-full items-center justify-center px-6 py-8 text-center text-[16px] text-ink-muted">
            {t('cartBar.empty')}
          </div>
        ) : (
          cart.map((line) => (
            <div
              key={line.lineId}
              className="flex min-w-[180px] shrink-0 flex-col items-center gap-2 px-2 text-center"
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
              <div className="flex h-9 w-[128px] items-center justify-between rounded-full bg-surface px-2">
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5"
                  onClick={() => onDec(line.lineId)}
                  aria-label={t('common.decrease')}
                >
                  <IconMinus className="h-5 w-5" />
                </button>
                <span className="text-[14px] font-semibold text-ink">{line.qty}</span>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-black/5"
                  onClick={() => onInc(line.lineId)}
                  aria-label={t('common.increase')}
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-black/10 px-6 pb-6">
        <div className="flex items-center justify-between gap-4 py-5">
          <p className="text-[22px] font-semibold leading-7 tracking-tight text-ink">{formatUzs(total)}</p>
          <button
            type="button"
            disabled={empty}
            onClick={onOpenCart}
            className="flex min-h-[52px] shrink-0 items-center gap-2 rounded-full bg-brand-green px-8 py-3 text-[17px] font-semibold leading-6 text-white shadow-sm transition hover:bg-[#033a20] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <span>{t('cartBar.goToCart')}</span>
            <IconBasket className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
