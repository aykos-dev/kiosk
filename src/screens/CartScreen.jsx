import { formatUzs } from '../lib/formatUzs.js';
import { pickRecommendation } from '../i18n/translate.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconArrowLeft, IconMinus, IconPlus } from '../components/icons.jsx';

/**
 * Full cart view (Figma 4287:26292).
 */
export function CartScreen({
  cart,
  total,
  qtyById = {},
  recommendations,
  onBack,
  onConfirm,
  onDec,
  onInc,
  onAddRecommendation,
}) {
  const { t, locale } = useI18n();

  return (
    <div className="relative flex min-h-screen flex-col bg-white pb-[120px] font-sans">
      <header className="sticky top-0 z-20 flex items-center gap-4 bg-white px-6 pb-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 w-[72px] shrink-0 items-center justify-center rounded-full bg-surface"
          aria-label={t('cart.backAria')}
        >
          <IconArrowLeft className="h-8 w-8 text-ink" />
        </button>
        <h1 className="flex-1 text-center font-product text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink">
          {t('cart.title')}
        </h1>
        <div className="w-[72px]" aria-hidden />
      </header>

      <div className="flex flex-col gap-0 px-6">
        {cart.map((line) => (
          <article
            key={line.lineId}
            className="relative border-b border-black/10 py-3 last:border-b-0"
          >
            <div className="flex gap-4">
              <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                <img
                  src={line.image || '/menu-items/placeholder.svg'}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-product text-[18px] font-semibold leading-6 text-ink">{line.name}</h2>
                {line.detailLine && (
                  <p className="mt-1 line-clamp-3 text-[16px] leading-5 text-ink-muted">{line.detailLine}</p>
                )}
                <div className="mt-2">
                  {line.kind === 'combo' && line.oldPrice ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[18px] font-semibold text-brand-orange">{formatUzs(line.lineTotal)}</span>
                      <span className="relative w-fit text-[15px] text-ink-muted line-through">
                        {formatUzs(line.oldPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[18px] font-semibold text-ink">{formatUzs(line.lineTotal)}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col justify-center pl-2">
                <div className="flex h-10 w-[120px] items-center justify-between rounded-full bg-surface px-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
                    onClick={() => onDec(line.lineId)}
                    aria-label={t('common.decrease')}
                  >
                    <IconMinus className="h-5 w-5" />
                  </button>
                  <span className="text-[15px] font-semibold">{line.qty}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
                    onClick={() => onInc(line.lineId)}
                    aria-label={t('common.increase')}
                  >
                    <IconPlus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {recommendations?.length > 0 && (
        <section className="mt-6 px-6">
          <h2 className="mb-4 font-product text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink">
            {t('cart.recommendations')}
          </h2>
          <div className="flex flex-wrap gap-4">
            {recommendations.map((rec) => {
              const loc = pickRecommendation(locale, rec);
              const inCart = (qtyById[rec.id] ?? 0) > 0;
              return (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onAddRecommendation({ ...rec, name: loc.name })}
                  className={`relative flex w-[220px] flex-col gap-3 rounded-[28px] bg-white p-2 pb-4 pt-2 text-left shadow-card transition hover:brightness-[0.98] ${
                    inCart ? 'ring-2 ring-brand-green' : ''
                  }`}
                >
                  <div className="h-[168px] w-full overflow-hidden rounded-2xl bg-neutral-50">
                    <img src={rec.image} alt="" className="h-full w-full object-cover mix-blend-multiply" />
                  </div>
                  {rec.badge && (
                    <span className="absolute left-4 top-4 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold text-white">
                      {rec.badge}
                    </span>
                  )}
                  {inCart && (
                    <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-white shadow-md">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  )}
                  <p className="line-clamp-2 min-h-[48px] px-1 text-center font-inter text-[18px] font-semibold leading-6 text-brand-green">
                    {loc.name}
                  </p>
                  <p className="text-center font-inter text-[18px] font-normal text-ink">
                    {loc.deltaLabel || formatUzs(rec.price)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="pointer-events-auto fixed bottom-0 left-1/2 z-30 w-full max-w-kiosk -translate-x-1/2 rounded-t-[32px] bg-white p-6 shadow-dock">
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={onConfirm}
          className="flex min-h-[56px] w-full items-center justify-center rounded-full bg-brand-green px-6 py-4 text-[18px] font-semibold text-white transition hover:bg-[#033a20] disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {t('cart.confirm', { total: formatUzs(total) })}
        </button>
      </div>
    </div>
  );
}
