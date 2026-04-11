import { formatUzs } from '../lib/formatUzs.js';
import { useI18n } from '../hooks/useI18n.js';

/**
 * Full-screen processing state after Humo / terminal handoff.
 */
export function PaymentProcessingScreen({ total }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 pb-24 pt-16 text-center">
      <div className="mb-8 h-20 w-20 animate-spin rounded-full border-4 border-surface border-t-brand-green" />
      <p className="text-2xl font-semibold text-ink">{t('paymentProcessing.message')}</p>
      <p className="mt-3 max-w-md text-lg text-ink-muted">{t('paymentProcessing.followTerminal')}</p>
      <p className="mt-10 text-[18px] text-ink-muted">{t('paymentProcessing.amountLabel')}</p>
      <p className="mt-1 text-[36px] font-bold text-ink">{formatUzs(total)}</p>
    </div>
  );
}
