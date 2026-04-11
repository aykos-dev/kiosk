import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { formatUzs } from '../lib/formatUzs.js';
import { useI18n } from '../hooks/useI18n.js';
import { IconArrowLeft } from '../components/icons.jsx';
import { getOrganizationsQueryOptions } from '../api/organizations.js';
import { useKioskSettingsStore } from '../store/kioskSettingsStore.js';
import { getPaymentTypesForOrganization } from '../lib/organizationPaymentTypes.js';
import {
  isQrGroupCode,
  paymentVisualKind,
  pickPaymentTypeLabel,
  QR_GROUP_CODES,
} from '../lib/paymentTypeVisual.js';

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
export function PaymentMethodScreen({
  total,
  onBack,
  onSelectQr,
  onSelectHumo,
  onSelectCash = onSelectHumo,
}) {
  const { t, locale } = useI18n();
  const cityId = useKioskSettingsStore((s) => s.cityId);
  const organizationId = useKioskSettingsStore((s) => s.organizationId);
  const { data: organizations = [] } = useQuery(getOrganizationsQueryOptions(cityId));

  const paymentTypes = useMemo(
    () => getPaymentTypesForOrganization(organizations, organizationId),
    [organizations, organizationId],
  );

  const qrTypes = useMemo(() => {
    const list = [];
    for (const code of QR_GROUP_CODES) {
      const found = paymentTypes.find((p) => (p?.object?.code || '').toUpperCase() === code);
      if (found) list.push(found);
    }
    return list;
  }, [paymentTypes]);

  const nonQrTypes = useMemo(
    () => paymentTypes.filter((p) => !isQrGroupCode(p?.object?.code)),
    [paymentTypes],
  );

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

      <div className="mx-auto mt-8 flex w-full max-w-[348px] flex-col gap-5 px-6">
        {qrTypes.length > 0 && (
          <button
            type="button"
            onClick={onSelectQr}
            className="flex flex-col items-center gap-5 rounded-[24px] bg-surface px-6 py-5 text-center transition hover:bg-neutral-200/80"
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-inter text-[20px] font-medium leading-7 text-brand-orange">{t('payment.qrLine1')}</span>
              <span className="font-inter text-[20px] font-medium leading-7 text-ink">{t('payment.qrLine2')}</span>
            </div>
            <div className="h-px w-full bg-black/10" />
            <div className="flex flex-wrap items-center justify-center gap-5">
              {qrTypes.map((pt) => {
                const code = pt?.object?.code;
                const kind = paymentVisualKind(code);
                return <PaymentLogo key={pt.id ?? code} kind={kind} />;
              })}
            </div>
          </button>
        )}

        {nonQrTypes.map((pt) => {
          const code = pt?.object?.code;
          const kind = paymentVisualKind(code);
          const label = pickPaymentTypeLabel(pt, locale);
          const isCash = (code || '').toUpperCase() === 'CASH';
          return (
            <button
              key={pt.id ?? code}
              type="button"
              onClick={isCash ? onSelectCash : onSelectHumo}
              className="flex flex-col items-center gap-5 rounded-[24px] bg-surface px-6 py-5 text-center transition hover:bg-neutral-200/80"
            >
              <p className="font-inter text-[20px] font-medium leading-7 tracking-[-0.15px] text-ink">{label}</p>
              <div className="h-px w-full bg-black/10" />
              <div className="flex min-h-14 items-center justify-center">
                <PaymentLogo kind={kind} />
              </div>
            </button>
          );
        })}
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
