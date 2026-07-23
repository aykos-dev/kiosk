import { useI18n } from '../hooks/useI18n.js';
import { usePaymentQrDataUrl } from '../hooks/usePaymentQrDataUrl.js';

import bellissimoIcon from '../../assets/images/bellissimo-icon.png';
import paymeImg from '../../assets/images/payment-types/payme.png';
import clickImg from '../../assets/images/payment-types/click.png';
import uzumImg from '../../assets/images/payment-types/uzum-bank.png';
import humoImg from '../../assets/images/payment-types/Humo.png';

/** Provider logo shown in the QR center, keyed by payment visual kind. */
const KIND_LOGO = {
  payme: paymeImg,
  click: clickImg,
  uzum: uzumImg,
  humo: humoImg,
};

/**
 * Post-order QR: encodes the gateway pay URL returned by the backend, with the
 * selected provider's logo overlaid in the center (QR uses error-correction
 * level H so the covered center stays scannable).
 *
 * @param {object} props
 * @param {string} props.url - payment URL from POST /table-orders/add
 * @param {'payme'|'click'|'uzum'|'humo'|'cash'} [props.kind] - provider for the center logo
 * @param {string|number|null} [props.orderNumber]
 * @param {() => void} props.onHome
 */
export function OrderPaymentQrScreen({ url, kind, orderNumber, onHome }) {
  const { t } = useI18n();
  const { dataUrl, size } = usePaymentQrDataUrl(url);
  const centerLogo = KIND_LOGO[kind] || bellissimoIcon;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-brand-green-deep">
      <div
        className="pointer-events-none absolute -right-32 -top-48 h-[520px] w-[520px] rounded-full bg-white/[0.12] blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        {orderNumber != null && (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-inter text-[22px] font-medium leading-7 text-white/80">
              {t('order.yourNumber')}
            </p>
            <p className="font-product text-[64px] font-bold leading-none text-white">
              {String(orderNumber)}
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-white p-8 shadow-[0px_3px_10px_rgba(0,0,0,0.15)]">
          <div className="relative inline-flex" style={{ width: size, height: size }}>
            {dataUrl ? (
              <img
                src={dataUrl}
                alt=""
                width={size}
                height={size}
                className="block max-w-none"
                style={{ width: size, height: size }}
              />
            ) : (
              <div
                className="flex items-center justify-center bg-neutral-100 text-[14px] text-neutral-500"
                style={{ width: size, height: size }}
              >
                …
              </div>
            )}
            <div className="absolute left-1/2 top-1/2 flex h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-md ring-2 ring-white">
              <img src={centerLogo} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
            </div>
          </div>
        </div>

        <p className="max-w-[420px] text-center font-inter text-[24px] leading-8 text-white">
          <span className="font-bold">{t('paymentQr.scanTitle')}</span>
          <span className="font-medium">{t('paymentQr.scanRest')}</span>
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[560px] px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onHome}
          className="flex h-[72px] w-full items-center justify-center rounded-full bg-white px-6 font-inter text-[20px] font-semibold text-[#161616] shadow-md transition hover:bg-neutral-100 active:scale-[0.99]"
        >
          {t('order.newOrder')}
        </button>
      </div>
    </div>
  );
}
