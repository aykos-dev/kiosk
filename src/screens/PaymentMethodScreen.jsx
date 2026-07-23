import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, CreditCard } from 'lucide-react';
import { formatUzs } from '../lib/formatUzs.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconArrowLeft } from '../components/icons.jsx';
import { getOrganizationsQueryOptions } from '../api/organizations.js';
import { useKioskSettingsStore } from '../store/kioskSettingsStore.js';
import { getPaymentTypesForOrganization } from '../lib/organizationPaymentTypes.js';
import { paymentVisualKind, pickPaymentTypeLabel, isCardKind, CARD_KINDS } from '../lib/paymentTypeVisual.js';

/** Fallback display labels when the terminal payment type has no localized label. */
const KIND_LABEL = {
  payme: 'Payme',
  click: 'Click',
  uzum: 'Uzum',
  humo: 'Humo',
  uzcard: 'Uzcard',
  cash: 'Naqd',
};

import bellissimoIcon from '../../assets/images/bellissimo-icon.png';
import paymeImg from '../../assets/images/payment-types/payme.png';
import clickImg from '../../assets/images/payment-types/click.png';
import uzumImg from '../../assets/images/payment-types/uzum-bank.png';
import humoImg from '../../assets/images/payment-types/Humo.png';

function PaymentLogo({ kind, className = '' }) {
  if (kind === 'payme') {
    return <img src={paymeImg} alt="" className={`h-14 w-14 rounded-[10px] object-cover ${className}`} />;
  }
  if (kind === 'click') {
    return <img src={clickImg} alt="" className={`h-14 w-14 rounded-[10px] object-cover ${className}`} />;
  }
  if (kind === 'uzum') {
    return <img src={uzumImg} alt="" className={`h-14 w-14 rounded-[10px] object-cover ${className}`} />;
  }
  if (kind === 'cash') {
    return <Banknote className={`h-14 w-14 shrink-0 text-brand-green ${className}`} strokeWidth={1.5} aria-hidden />;
  }
  if (kind === 'uzcard') {
    return <CreditCard className={`h-14 w-14 shrink-0 text-[#0a3d91] ${className}`} strokeWidth={1.5} aria-hidden />;
  }
  return (
    <img
      src={humoImg}
      alt=""
      className={`h-14 w-auto max-w-[140px] object-contain ${className}`}
    />
  );
}

/**
 * Payment method selection (Figma 4287:26388). Payment types come from the default org via organizations API.
 */
export function PaymentMethodScreen({ total, onBack, onSelect, error }) {
  const { t, locale } = useI18n();
  const cityId = useKioskSettingsStore((s) => s.cityId);
  const organizationId = useKioskSettingsStore((s) => s.organizationId);
  const { data: organizations = [] } = useQuery(getOrganizationsQueryOptions(cityId));

  const paymentTypes = useMemo(
    () => getPaymentTypesForOrganization(organizations, organizationId),
    [organizations, organizationId],
  );

  // The API lumps all bank cards into one "card" type, but a kiosk has two
  // physical terminals (Humo=Sunmi P3, Uzcard=PAX A35). So we hide the single
  // API card type and render two static card buttons instead — each carries
  // the underlying API type (for backend order registration) plus a cardKind
  // that tells the checkout which terminal to charge.
  const { otherTypes, cardApiType } = useMemo(() => {
    const other = [];
    let card = null;
    for (const pt of paymentTypes) {
      if (isCardKind(paymentVisualKind(pt?.object?.code))) {
        card = card || pt;
      } else {
        other.push(pt);
      }
    }
    return { otherTypes: other, cardApiType: card };
  }, [paymentTypes]);

  return (
    <div className="relative flex min-h-screen flex-col bg-white font-sans pb-10">
      <header className="flex items-center gap-4 px-6 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 w-[72px] shrink-0 items-center justify-center rounded-full bg-surface"
          aria-label={t('cart.backAria')}
        >
          <IconArrowLeft className="h-8 w-8 text-ink" />
        </button>
        <h1 className="flex-1 text-center font-product text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink">
          {t('payment.title')}
        </h1>
        <div className="w-[72px]" aria-hidden />
      </header>

      <div className="flex flex-col items-center gap-6 px-6 pt-6">
        <img src={bellissimoIcon} alt="" className="h-[108px] w-[108px] object-contain" width={108} height={108} />
        <p className="text-center font-product text-[32px] font-semibold leading-[48px] text-ink">{t('payment.howPay')}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto mt-4 w-full max-w-[416px] rounded-2xl bg-red-50 px-5 py-4 text-center font-inter text-[18px] font-medium leading-6 text-red-600"
        >
          {error}
        </div>
      )}

      <div className="mx-auto mt-8 flex w-full max-w-[416px] flex-col gap-4 px-6">
        {otherTypes.map((pt) => {
          const code = pt?.object?.code;
          const kind = paymentVisualKind(code);
          const label = pickPaymentTypeLabel(pt, locale) || KIND_LABEL[kind] || code || '';
          return (
            <button
              key={pt.id ?? code}
              type="button"
              onClick={() => onSelect(pt)}
              className="flex items-center gap-5 rounded-[24px] bg-surface px-6 py-5 text-left transition hover:bg-neutral-200/80 active:scale-[0.99]"
            >
              <div className="flex h-14 shrink-0 items-center justify-center">
                <PaymentLogo kind={kind} />
              </div>
              <span className="flex-1 font-inter text-[20px] font-medium leading-7 tracking-[-0.15px] text-ink">
                {label}
              </span>
            </button>
          );
        })}

        {/* Two static card buttons, each routed to its own physical terminal. */}
        {CARD_KINDS.map((cardKind) => (
          <button
            key={cardKind}
            type="button"
            onClick={() =>
              onSelect({ static: true, cardKind, apiPaymentType: cardApiType, object: cardApiType?.object })
            }
            className="flex items-center gap-5 rounded-[24px] bg-surface px-6 py-5 text-left transition hover:bg-neutral-200/80 active:scale-[0.99]"
          >
            <div className="flex h-14 shrink-0 items-center justify-center">
              <PaymentLogo kind={cardKind} />
            </div>
            <span className="flex-1 font-inter text-[20px] font-medium leading-7 tracking-[-0.15px] text-ink">
              {t(`payment.${cardKind}`) || KIND_LABEL[cardKind]}
            </span>
          </button>
        ))}
      </div>

      <div className="mx-auto mt-auto w-full max-w-[416px] px-6 pt-10 text-center">
        <p className="font-inter text-[24px] font-normal leading-8 text-ink-muted">{t('payment.amountLabel')}</p>
        <p className="mt-1 font-product text-[48px] font-bold leading-[48px] tracking-[-0.15px] text-ink">
          {formatUzs(total)}
        </p>
      </div>
    </div>
  );
}
